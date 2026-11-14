import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store" }
});

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
const textOf = (v: unknown) => typeof v === "string" ? v.trim() : "";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // Public, non-sensitive health check. Does not reveal whether secrets are configured.
  if (req.method === "GET" && url.searchParams.get("health") === "1") {
    return json({ success: true, service: "phone_call", websocket: "available" });
  }

  // Retell documents that its Custom LLM WebSocket sends no auth headers.
  // Use a high-entropy URL query secret; never put this value in logs or responses.
  const secret = Deno.env.get("retell_api_webstock") ?? "";
  const supplied = url.searchParams.get("bridge_token") ?? "";
  if (!safeEqual(secret, supplied)) return json({ success: false, error: "Unauthorized." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const retellKey = Deno.env.get("RETELL_API_KEY");
  if (!supabaseUrl || !serviceKey) return json({ success: false, error: "Server configuration missing." }, 500);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  if (req.headers.get("upgrade")?.toLowerCase() === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(req);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const pathCallId = pathParts.length > 3 ? pathParts[pathParts.length - 1] : "";

    let initialized = false;
    let callId = pathCallId;
    let workspaceId = "";
    let agentId = "";
    let conversationId = "";
    let voiceCallId = "";
    let greeting = "Hello! How can I help you today?";
    let lastProcessedUserIndex = -1;
    let busy = false;
    let closed = false;
    const pending = new Set<Promise<unknown>>();

    const send = (payload: unknown) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
    };
    const sendResponse = (responseId: number, content: string, endCall = false) => {
      send({
        response_type: "response",
        response_id: responseId,
        content,
        content_complete: true,
        ...(endCall ? { end_call: true } : {})
      });
    };

    async function initialize(call: any) {
      const callObject = call ?? {};
      callId = textOf(callObject.call_id ?? callObject.id ?? callId);
      const vars = callObject.retell_llm_dynamic_variables ??
        callObject.metadata?.retell_llm_dynamic_variables ??
        callObject.metadata ?? {};
      workspaceId = textOf(vars.workspace_id);
      agentId = textOf(vars.agent_id);
      if (!callId || !workspaceId || !agentId) {
        throw new Error("Call details must include workspace_id and agent_id dynamic variables.");
      }

      const { data: agent, error: agentError } = await admin.from("agents")
        .select("id,workspace_id,name,status,greeting")
        .eq("id", agentId).eq("workspace_id", workspaceId).maybeSingle();
      if (agentError || !agent || agent.status !== "active") {
        throw new Error("Mapped Zivofly agent is unavailable or inactive.");
      }
      const { data: workspace, error: workspaceError } = await admin.from("workspaces")
        .select("id,status").eq("id", workspaceId).maybeSingle();
      if (workspaceError || !workspace || workspace.status !== "active") {
        throw new Error("Mapped Zivofly workspace is unavailable or inactive.");
      }

      greeting = textOf(vars.greeting) || textOf(agent.greeting) || greeting;

      // Reuse an existing call on Retell reconnects; do not create duplicate conversations.
      const { data: existing, error: existingError } = await admin.from("voice_calls")
        .select("id,conversation_id")
        .eq("provider", "retell").eq("provider_call_id", callId).maybeSingle();
      if (existingError) throw new Error("Could not check for an existing call record.");
      if (existing) {
        voiceCallId = existing.id;
        conversationId = existing.conversation_id ?? "";
        initialized = true;
        return;
      }

      const { data: conv, error: convError } = await admin.from("conversations").insert({
        workspace_id: workspaceId,
        agent_id: agentId,
        customer_name: "Phone caller",
        customer_handle: textOf(callObject.from_number) || null,
        external_conversation_id: callId,
        surface: "call",
        status: "open",
        handling_mode: "ai",
        metadata: { provider: "retell", provider_call_id: callId }
      }).select("id").single();
      if (convError || !conv) throw new Error("Could not create the call conversation.");
      conversationId = conv.id;

      const now = new Date().toISOString();
      const { data: voiceCall, error: voiceError } = await admin.from("voice_calls").insert({
        workspace_id: workspaceId,
        conversation_id: conversationId,
        provider: "retell",
        provider_call_id: callId,
        caller_number_e164: textOf(callObject.from_number) || null,
        business_number_e164: textOf(callObject.to_number) || null,
        status: "in_progress",
        started_at: now,
        answered_at: now,
        metadata: { provider: "retell", call_type: textOf(callObject.call_type) || "unknown" }
      }).select("id").single();
      if (voiceError || !voiceCall) throw new Error("Could not create the voice call record.");
      voiceCallId = voiceCall.id;
      initialized = true;
    }

    async function saveMessage(sender: "customer" | "agent", content: string, metadata: Record<string, unknown> = {}) {
      const { error } = await admin.from("messages").insert({
        workspace_id: workspaceId,
        conversation_id: conversationId,
        sender_type: sender,
        direction: sender === "customer" ? "inbound" : "outbound",
        content,
        media_type: "text",
        delivery_status: sender === "customer" ? "received" : "sent",
        metadata: { channel: "call", provider: "retell", ...metadata }
      });
      if (error) throw new Error("Could not persist call transcript message.");
    }

    async function callZivofyAI(message: string): Promise<{ answer: string; model?: string; usage?: unknown }> {
      const aiResponse = await fetch(`${supabaseUrl}/functions/v1/zivofy_ai`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-zivofly-internal-key": secret },
        body: JSON.stringify({
          action: "chat",
          workspace_id: workspaceId,
          agent_id: agentId,
          conversation_id: conversationId,
          message,
          channel: "call",
          media_type: "text",
          persist_messages: false
        })
      });
      const result = await aiResponse.json();
      if (!aiResponse.ok || !result?.success || !textOf(result?.answer)) {
        console.error("zivofy_ai call failed", { status: aiResponse.status, stage: result?.stage });
        throw new Error("Zivofly AI could not generate a reply.");
      }
      return { answer: textOf(result.answer), model: result.model, usage: result.usage };
    }

    async function handleEvent(event: any) {
      const type = textOf(event?.interaction_type);

      if (type === "ping_pong") {
        send({ response_type: "ping_pong", timestamp: event.timestamp });
        return;
      }

      if (type === "call_details") {
        await initialize(event.call);
        // Retell requires the first spoken message to use response_id 0.
        sendResponse(0, greeting);
        return;
      }

      if (type === "update_only") {
        // Transcript updates are informational. Retell will request a response separately.
        return;
      }

      if (type !== "response_required" && type !== "reminder_required") return;
      const responseId = event?.response_id;
      if (!Number.isInteger(responseId)) throw new Error("Retell event is missing a valid response_id.");
      if (!initialized) throw new Error("Received a response request before call_details initialized the session.");

      if (type === "reminder_required") {
        sendResponse(responseId, "Are you still there? I'm listening.");
        return;
      }

      if (busy) {
        sendResponse(responseId, "One moment, please.");
        return;
      }

      const transcript = Array.isArray(event?.transcript) ? event.transcript : [];
      let userIndex = -1;
      for (let i = transcript.length - 1; i >= 0; i--) {
        const item = transcript[i];
        if ((item?.role === "user" || item?.role === "caller") && textOf(item?.content)) {
          userIndex = i;
          break;
        }
      }
      if (userIndex < 0) {
        sendResponse(responseId, "I'm listening. How can I help?");
        return;
      }
      if (userIndex <= lastProcessedUserIndex) {
        sendResponse(responseId, "One moment, please.");
        return;
      }

      const userText = textOf(transcript[userIndex].content);
      busy = true;
      lastProcessedUserIndex = userIndex;
      try {
        await saveMessage("customer", userText, { retell_response_id: responseId });
        const ai = await callZivofyAI(userText);
        await saveMessage("agent", ai.answer, {
          retell_response_id: responseId,
          model: ai.model ?? null,
          usage: ai.usage ?? null
        });
        if (voiceCallId) {
          await admin.from("voice_calls").update({
            metadata: { provider: "retell", last_ai_model: ai.model ?? null, last_usage: ai.usage ?? null }
          }).eq("id", voiceCallId);
        }
        sendResponse(responseId, ai.answer);
      } catch (error) {
        console.error("Call response failed", error);
        sendResponse(responseId, "I'm sorry, I'm having trouble accessing that information right now. Could you please try again?");
      } finally {
        busy = false;
      }
    }

    socket.onopen = () => {
      send({
        response_type: "config",
        config: {
          auto_reconnect: true,
          call_details: true,
          transcript_with_tool_calls: true
        }
      });
      // The greeting waits for call_details because it may depend on call variables.
    };

    socket.onmessage = (message) => {
      const task = (async () => {
        if (typeof message.data !== "string") {
          socket.close(1007, "Expected a text frame.");
          return;
        }
        try {
          await handleEvent(JSON.parse(message.data));
        } catch (error) {
          console.error("Retell event processing failed", error);
          try {
            const event = JSON.parse(message.data);
            if (Number.isInteger(event?.response_id)) {
              sendResponse(event.response_id, "Sorry, I couldn't process that. Please try again.");
            }
          } catch { /* invalid JSON: no response id to echo */ }
        }
      })();
      pending.add(task);
      task.finally(() => pending.delete(task));
    };

    socket.onclose = () => {
      closed = true;
      // Do not mark calls completed here: Retell may reconnect the WebSocket mid-call.
      // A signed call_ended webhook will finalize duration/status in the next phase.
    };
    socket.onerror = (error) => console.error("Retell WebSocket error", error);

    const lifetime = new Promise<void>((resolve) => socket.addEventListener("close", () => resolve(), { once: true }));
    // @ts-ignore Supabase Edge Runtime exposes EdgeRuntime.
    EdgeRuntime.waitUntil(lifetime);
    return response;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    return json({ success: true, service: "phone_call", websocket: "ready" });
  }
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed." }, 405);
  if (!retellKey) return json({ success: false, error: "RETELL_API_KEY is not configured." }, 500);

  let body: any;
  try { body = await req.json(); } catch { return json({ success: false, error: "Invalid JSON body." }, 400); }
  if (body?.action === "list_agents") {
    const response = await fetch("https://api.retellai.com/v2/list-agents", {
      method: "POST",
      headers: { Authorization: `Bearer ${retellKey}`, "content-type": "application/json" },
      body: JSON.stringify({})
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { "content-type": "application/json", "cache-control": "no-store" }
    });
  }
  if (body?.action === "create_web_call") {
    return json({ success: false, error: "Create web calls after the Custom LLM agent is published and its agent ID is configured." }, 409);
  }
  return json({ success: false, error: "Unsupported action." }, 400);
});
