import http from "node:http";
import { URL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { WebSocketServer, WebSocket } from "ws";

const PORT = Number(process.env.PORT || 3000);
const SUPABASE_URL = process.env.supabase_url;
const SUPABASE_SERVICE_ROLE_KEY = process.env.supabase_secret_role_key;
const RETELL_API_KEY = process.env.retell_api_key;
const BRIDGE_SECRET = process.env.retell_api_webstock;

const json = (res, body, status = 200) => {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(body));
};

function safeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
const textOf = (v) => typeof v === "string" ? v.trim() : "";

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://localhost");

  if (req.method === "GET" && (url.pathname === "/" || url.searchParams.get("health") === "1")) {
    return json(res, {
      success: true,
      service: "phone_call",
      websocket: "available",
      configured: Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && BRIDGE_SECRET)
    });
  }

  if (req.method === "GET" || req.method === "HEAD") {
    return json(res, { success: true, service: "phone_call", websocket: "ready" });
  }

  if (req.method !== "POST") return json(res, { success: false, error: "Method not allowed." }, 405);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !BRIDGE_SECRET) {
    return json(res, { success: false, error: "Server configuration missing." }, 500);
  }
  if (!RETELL_API_KEY) return json(res, { success: false, error: "RETELL_API_KEY is not configured." }, 500);

  let body;
  try {
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 1_000_000) return json(res, { success: false, error: "Request too large." }, 413);
    }
    body = JSON.parse(raw);
  } catch {
    return json(res, { success: false, error: "Invalid JSON body." }, 400);
  }

  if (body?.action === "list_agents") {
    try {
      const response = await fetch("https://api.retellai.com/v2/list-agents", {
        method: "POST",
        headers: { Authorization: `Bearer ${RETELL_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({})
      });
      res.writeHead(response.status, {
        "content-type": "application/json",
        "cache-control": "no-store"
      });
      return res.end(await response.text());
    } catch {
      return json(res, { success: false, error: "Retell API request failed." }, 502);
    }
  }

  if (body?.action === "create_web_call") {
    return json(res, {
      success: false,
      error: "Create web calls after the Custom LLM agent is published and its agent ID is configured."
    }, 409);
  }

  return json(res, { success: false, error: "Unsupported action." }, 400);
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024 });
const admin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    })
  : null;

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "/", "http://localhost");
  const supplied = url.searchParams.get("bridge_token") || "";
  if (!BRIDGE_SECRET || !safeEqual(BRIDGE_SECRET, supplied)) {
    socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
    socket.destroy();
    return;
  }
  if (!admin) {
    socket.write("HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n");
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req, url));
});

wss.on("connection", (ws) => {
  let initialized = false;
  let callId = "";
  let workspaceId = "";
  let agentId = "";
  let conversationId = "";
  let voiceCallId = "";
  let greeting = "Hello! How can I help you today?";
  let lastProcessedUserIndex = -1;
  let busy = false;

  const send = (payload) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  };
  const sendResponse = (responseId, content, endCall = false) => {
    send({
      response_type: "response",
      response_id: responseId,
      content,
      content_complete: true,
      ...(endCall ? { end_call: true } : {})
    });
  };

  async function initialize(call) {
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

  async function saveMessage(sender, content, metadata = {}) {
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

  async function callZivofyAI(message) {
    const aiResponse = await fetch(`${SUPABASE_URL}/functions/v1/zivofy_ai`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-zivofly-internal-key": BRIDGE_SECRET
      },
      body: JSON.stringify({
        action: "chat",
        workspace_id: workspaceId,
        agent_id: agentId,
        conversation_id: conversationId,
        message,
        channel: "call",
        media_type: "text",
        persist_messages: false
      }),
      signal: AbortSignal.timeout(45_000)
    });
    const result = await aiResponse.json();
    if (!aiResponse.ok || !result?.success || !textOf(result?.answer)) {
      console.error("zivofy_ai call failed", { status: aiResponse.status, stage: result?.stage });
      throw new Error("Zivofly AI could not generate a reply.");
    }
    return { answer: textOf(result.answer), model: result.model, usage: result.usage };
  }

  async function handleEvent(event) {
    const type = textOf(event?.interaction_type);

    if (type === "ping_pong") {
      send({ response_type: "ping_pong", timestamp: event.timestamp });
      return;
    }
    if (type === "call_details") {
      await initialize(event.call);
      sendResponse(0, greeting);
      return;
    }
    if (type === "update_only") return;
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
      console.error("Call response failed", error?.message || "unknown error");
      sendResponse(responseId, "I'm sorry, I'm having trouble accessing that information right now. Could you please try again?");
    } finally {
      busy = false;
    }
  }

  ws.on("message", async (raw, isBinary) => {
    if (isBinary) {
      ws.close(1003, "Expected a text frame.");
      return;
    }
    try {
      const event = JSON.parse(raw.toString("utf8"));
      await handleEvent(event);
    } catch (error) {
      console.error("Retell event processing failed", error?.message || "unknown error");
      try {
        const event = JSON.parse(raw.toString("utf8"));
        if (Number.isInteger(event?.response_id)) {
          sendResponse(event.response_id, "Sorry, I couldn't process that. Please try again.");
        }
      } catch {}
    }
  });

  ws.on("error", (error) => console.error("Retell WebSocket error", error.message));
  ws.on("close", () => {
    // Do not mark calls completed here: Retell may reconnect mid-call.
  });

  send({
    response_type: "config",
    config: {
      auto_reconnect: true,
      call_details: true,
      transcript_with_tool_calls: true
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Zivofly phone-call service listening on port ${PORT}`);
});

function shutdown() {
  server.close(() => process.exit(0));
  for (const client of wss.clients) client.close(1001, "Server shutting down");
  setTimeout(() => process.exit(1), 25_000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
