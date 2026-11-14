import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-zivofly-internal-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CHAT_MODEL = "gpt-4.1-mini";
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function failure(
  stage: string,
  message: string,
  status: number,
) {
  return jsonResponse({
    success: false,
    stage,
    error: message,
  }, status);
}

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) {
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return difference === 0;
}

function splitTextIntoChunks(
  text: string,
  targetSize = 1200,
  overlap = 200,
): string[] {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + targetSize, normalized.length);

    if (end < normalized.length) {
      const searchStart = Math.max(start + 1, end - 250);
      const section = normalized.slice(searchStart, end);

      const paragraphBreak = section.lastIndexOf("\n\n");
      const sentenceBreak = section.lastIndexOf(". ");
      const lineBreak = section.lastIndexOf("\n");
      const spaceBreak = section.lastIndexOf(" ");

      const boundary = Math.max(
        paragraphBreak >= 0 ? searchStart + paragraphBreak : -1,
        sentenceBreak >= 0 ? searchStart + sentenceBreak + 1 : -1,
        lineBreak >= 0 ? searchStart + lineBreak : -1,
        spaceBreak >= 0 ? searchStart + spaceBreak : -1,
      );

      if (boundary > start) end = boundary;
    }

    const chunk = normalized.slice(start, end).trim();

    if (chunk) chunks.push(chunk);

    if (end >= normalized.length) break;

    const nextStart = Math.max(start + 1, end - overlap);
    start = nextStart;
  }

  return chunks;
}

function estimateTokenCount(text: string): number {
  // Approximate count. This is not an exact tokenizer.
  return Math.max(1, Math.ceil(text.length / 4));
}

async function generateEmbeddings(
  texts: string[],
  apiKey: string,
): Promise<number[][]> {
  const allEmbeddings: number[][] = [];
  const batchSize = 64;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const response = await fetch(
      "https://api.openai.com/v1/embeddings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          dimensions: EMBEDDING_DIMENSIONS,
          input: batch,
        }),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Embedding provider error:", result);
      throw new Error(
        `OpenAI embedding request failed with HTTP ${response.status}.`,
      );
    }

    const sorted = (result.data ?? [])
      .sort((a: any, b: any) => a.index - b.index);

    if (sorted.length !== batch.length) {
      throw new Error("Embedding response count did not match input count.");
    }

    for (const item of sorted) {
      if (
        !Array.isArray(item.embedding) ||
        item.embedding.length !== EMBEDDING_DIMENSIONS
      ) {
        throw new Error("An embedding did not contain exactly 1536 dimensions.");
      }

      allEmbeddings.push(item.embedding);
    }
  }

  return allEmbeddings;
}

async function callOpenAIResponses(
  apiKey: string,
  instructions: string,
  input: Array<{ role: "user" | "assistant"; content: string }>,
) {
  const response = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        instructions,
        input,
      }),
    },
  );

  const result = await response.json();

  if (!response.ok) {
    console.error("OpenAI Responses API error:", result);
    throw new Error(
      `OpenAI response request failed with HTTP ${response.status}.`,
    );
  }

  const answer = (result.output ?? [])
    .flatMap((item: any) => item.content ?? [])
    .filter((item: any) => item.type === "output_text")
    .map((item: any) => item.text)
    .join("\n")
    .trim();

  if (!answer) {
    throw new Error("OpenAI returned no text response.");
  }

  return {
    answer,
    model: result.model ?? CHAT_MODEL,
    usage: result.usage ?? null,
  };
}


async function callUniversalResponses(apiKey: string, instructions: string, history: Array<{role:"user"|"assistant";content:any}>) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method:"POST",
    headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},
    body:JSON.stringify({model:CHAT_MODEL,instructions,input:history})
  });
  const result=await response.json();
  if(!response.ok){console.error("OpenAI universal response error:",result);throw new Error(`AI provider request failed with HTTP ${response.status}.`);}
  const answer=(result.output??[]).flatMap((x:any)=>x.content??[]).filter((x:any)=>x.type==="output_text").map((x:any)=>x.text).join("\\n").trim();
  if(!answer) throw new Error("AI returned no text response.");
  return {answer,model:result.model??CHAT_MODEL,usage:result.usage??null};
}

async function transcribeAudio(apiKey:string, mediaUrl:string) {
  const mediaResponse=await fetch(mediaUrl);
  if(!mediaResponse.ok) throw new Error("Could not retrieve the supplied audio media.");
  const contentType=mediaResponse.headers.get("content-type")??"audio/mpeg";
  const bytes=new Uint8Array(await mediaResponse.arrayBuffer());
  if(bytes.length>24*1024*1024) throw new Error("Audio exceeds the 24 MB transcription limit.");
  const form=new FormData();
  form.append("file",new Blob([bytes],{type:contentType}),"incoming-audio");
  form.append("model","gpt-4o-mini-transcribe");
  const response=await fetch("https://api.openai.com/v1/audio/transcriptions",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`},body:form});
  const result=await response.json();
  if(!response.ok){console.error("Audio transcription error:",result);throw new Error("Audio transcription failed.");}
  return String(result.text??"").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return failure("method", "Method not allowed.", 405);
  }

  try {
    // Authenticate either a real Supabase user or the private phone_call bridge.
    const authorization = req.headers.get("Authorization");
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    const internalSecret = Deno.env.get("retell_api_webstock");
    const suppliedInternalSecret = req.headers.get("x-zivofly-internal-key");
    const isInternalCall = safeEqual(internalSecret ?? "", suppliedInternalSecret ?? "");
    if (!isInternalCall && !token) return failure("auth_header", "Authentication is required.", 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openaiKey = Deno.env.get("gpt_api");
    if (!supabaseUrl || !serviceRoleKey || !openaiKey || (!isInternalCall && !anonKey)) {
      console.error("A required Edge Function secret is missing.");
      return failure("configuration", "A required server configuration is missing.", 500);
    }

    let userId: string | null = null;
    let userClient: any = null;
    if (!isInternalCall) {
      userClient = createClient(supabaseUrl, anonKey!, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { data: authData, error: authError } = await userClient.auth.getUser(token);
      if (authError || !authData.user) return failure("auth_get_user", "Invalid or expired login session.", 401);
      userId = authData.user.id;
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const body = await req.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return failure("request_body", "Invalid request body.", 400);
    }

    const action =
      typeof body.action === "string" ? body.action : "chat";

    const workspaceId = body.workspace_id;
    const agentId = body.agent_id;

    if (
      typeof workspaceId !== "string" ||
      typeof agentId !== "string"
    ) {
      return failure(
        "routing_validation",
        "workspace_id and agent_id are required.",
        400,
      );
    }

    // User calls must prove workspace membership. The internal Retell bridge
    // uses its private secret; workspace and agent ownership are still checked below.
    if (!isInternalCall) {
      const { data: membership, error: membershipError } = await userClient
        .from("workspace_members")
        .select("workspace_id, user_id, member_role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .maybeSingle();
      if (membershipError || !membership) {
        return failure("workspace_auth", "You do not have access to this workspace.", 403);
      }
    }

    // 3. Check that the workspace exists and is active.
    const { data: workspace, error: workspaceError } = await admin
      .from("workspaces")
      .select("id, status")
      .eq("id", workspaceId)
      .maybeSingle();

    if (workspaceError || !workspace || workspace.status !== "active") {
      return failure(
        "workspace_lookup",
        "This workspace is not active or could not be found.",
        403,
      );
    }

    // 4. Confirm the agent belongs to this workspace.
    const { data: agent, error: agentError } = await admin
      .from("agents")
      .select(
        "id, workspace_id, name, role_prompt, greeting, tone, language, status, always_on, active_from, active_to, active_days, timezone",
      )
      .eq("id", agentId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (agentError || !agent) {
      return failure(
        "agent_lookup",
        "The requested agent was not found in this workspace.",
        404,
      );
    }

    // ============================================================
    // ACTION A: DOCUMENT PROCESSING
    // ============================================================

    if (action === "process_document") {
      const documentId = body.document_id;

      if (typeof documentId !== "string" || !documentId) {
        return failure(
          "document_validation",
          "document_id is required for document processing.",
          400,
        );
      }

      // Retrieve only the document belonging to this workspace and agent.
      const { data: document, error: documentError } = await admin
        .from("knowledge_documents")
        .select("id, workspace_id, agent_id, title, content_text, status")
        .eq("id", documentId)
        .eq("workspace_id", workspaceId)
        .eq("agent_id", agentId)
        .maybeSingle();

      if (documentError || !document) {
        return failure(
          "document_lookup",
          "Document not found or it does not belong to this agent.",
          404,
        );
      }

      if (document.status === "deleted") {
        return failure(
          "document_validation",
          "Deleted documents cannot be processed.",
          409,
        );
      }

      const content = document.content_text?.trim();

      if (!content) {
        return failure(
          "document_content",
          "The document has no readable text to process.",
          400,
        );
      }

      // Block previously corrupted DOCX extraction.
      if (
        /Content_Types\.xml|word\/document\.xml|word\/styles\.xml/i.test(
          content.slice(0, 3000),
        )
      ) {
        return failure(
          "document_content",
          "The document contains raw DOCX metadata instead of readable text. Re-upload the Word file.",
          422,
        );
      }

      const chunks = splitTextIntoChunks(content);

      if (chunks.length === 0) {
        return failure(
          "chunking",
          "No usable text chunks could be created.",
          422,
        );
      }

      // Mark processing.
      const { error: processingError } = await admin
        .from("knowledge_documents")
        .update({
          status: "processing",
          error_message: null,
        })
        .eq("id", documentId)
        .eq("workspace_id", workspaceId)
        .eq("agent_id", agentId);

      if (processingError) {
        console.error("Could not update document status:", processingError);
        return failure(
          "document_update",
          "Could not mark the document as processing.",
          500,
        );
      }

      try {
        // Generate all embeddings before deleting previously saved chunks.
        const embeddings = await generateEmbeddings(chunks, openaiKey);

        if (embeddings.length !== chunks.length) {
          throw new Error("Embedding count does not match chunk count.");
        }

        const rows = chunks.map((chunk, index) => ({
          workspace_id: workspaceId,
          agent_id: agentId,
          document_id: documentId,
          chunk_index: index,
          content: chunk,
          embedding: embeddings[index],
          embedding_model: EMBEDDING_MODEL,
          token_count: estimateTokenCount(chunk),
          metadata: {
            document_title: document.title,
            source_type: "document",
          },
        }));

        // Remove previous chunks for this exact document.
        const { error: deleteError } = await admin
          .from("knowledge_chunks")
          .delete()
          .eq("workspace_id", workspaceId)
          .eq("agent_id", agentId)
          .eq("document_id", documentId);

        if (deleteError) {
          throw new Error("Could not replace previous document chunks.");
        }

        // Insert in batches.
        const batchSize = 50;

        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);

          const { error: insertError } = await admin
            .from("knowledge_chunks")
            .insert(batch);

          if (insertError) {
            console.error("Chunk insertion error:", insertError);

            // Remove partial chunks so the document cannot appear ready.
            await admin
              .from("knowledge_chunks")
              .delete()
              .eq("workspace_id", workspaceId)
              .eq("agent_id", agentId)
              .eq("document_id", documentId);

            throw new Error("Could not save generated knowledge chunks.");
          }
        }

        // Verify the actual database records.
        const { count, error: verifyError } = await admin
          .from("knowledge_chunks")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspaceId)
          .eq("agent_id", agentId)
          .eq("document_id", documentId);

        if (verifyError || count !== rows.length) {
          await admin
            .from("knowledge_chunks")
            .delete()
            .eq("workspace_id", workspaceId)
            .eq("agent_id", agentId)
            .eq("document_id", documentId);

          throw new Error("Saved knowledge chunks could not be verified.");
        }

        const { error: readyError } = await admin
          .from("knowledge_documents")
          .update({
            status: "ready",
            chunk_count: count,
            error_message: null,
          })
          .eq("id", documentId)
          .eq("workspace_id", workspaceId)
          .eq("agent_id", agentId);

        if (readyError) {
          throw new Error("Could not update document to ready status.");
        }

        return jsonResponse({
          success: true,
          action: "process_document",
          document_id: documentId,
          chunks_created: count,
          embedding_model: EMBEDDING_MODEL,
          embedding_dimensions: EMBEDDING_DIMENSIONS,
          status: "ready",
        });
      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : "Document processing failed.";

        console.error("Document processing failed:", error);

        await admin
          .from("knowledge_documents")
          .update({
            status: "failed",
            chunk_count: 0,
            error_message: errorMessage,
          })
          .eq("id", documentId)
          .eq("workspace_id", workspaceId)
          .eq("agent_id", agentId);

        return failure("document_processing", errorMessage, 500);
      }
    }

    // Reject unsupported actions instead of silently treating them as chat.
    if (action !== "chat") {
      return failure("routing_validation", "Unsupported action.", 400);
    }


    // ============================================================
    // ACTION B: UNIVERSAL MULTIMODAL CONVERSATION ENGINE
    // ============================================================
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const mediaType = typeof body.media_type === "string" ? body.media_type : "text";
    const mediaUrl = typeof body.media_url === "string" ? body.media_url : "";
    const testMode = body.mode === "test" || body.test_only === true;
    const persistMessages = !testMode && body.persist_messages === true;
    const conversationId = typeof body.conversation_id === "string" ? body.conversation_id : null;
    const channel = typeof body.channel === "string" ? body.channel : "web";
    const allowedMedia = ["text","image","audio","voice_note","video","call_audio"];
    if (!allowedMedia.includes(mediaType)) return failure("media_validation","Unsupported media_type.",400);
    if (!message && !mediaUrl) return failure("chat_validation","message or media_url is required.",400);
    if (message.length > 12000) return failure("chat_validation","Message is too long.",400);
    if (mediaUrl && !/^https:\/\//i.test(mediaUrl)) return failure("media_validation","media_url must be HTTPS.",400);
    if (!testMode && agent.status !== "active") return failure("agent_status","This agent must be active before it can respond.",409);

    let normalizedMessage = message;
    if ((mediaType === "audio" || mediaType === "voice_note" || mediaType === "call_audio") && mediaUrl) {
      normalizedMessage = await transcribeAudio(openaiKey,mediaUrl);
    }
    if (mediaType === "video") return failure("media_validation","Video understanding is not enabled yet. Send an extracted frame or audio track through the media adapter.",422);

    const history:Array<{role:"user"|"assistant";content:any}>=[];
    if (conversationId) {
      const {data:conversation,error:conversationError}=await admin.from("conversations")
        .select("id,workspace_id,agent_id,status,handling_mode,handoff_status")
        .eq("id",conversationId).eq("workspace_id",workspaceId).eq("agent_id",agentId).maybeSingle();
      if(conversationError||!conversation) return failure("conversation_lookup","Conversation not found for this agent.",404);
      if(conversation.status!=="open" || conversation.handling_mode!=="ai" || conversation.handoff_status==="needs_human" || conversation.handoff_status==="human_handling")
        return failure("conversation_status","This conversation is currently assigned to a human or unavailable to AI.",409);
      const {data:past,error:historyError}=await admin.from("messages").select("sender_type,content,media_type,media_url,media_description")
        .eq("workspace_id",workspaceId).eq("conversation_id",conversationId).order("created_at",{ascending:false}).limit(12);
      if(historyError) return failure("conversation_history","Could not load conversation history.",500);
      for(const item of (past??[]).reverse()){
        if(!item.content) continue;
        const role=item.sender_type==="customer"?"user":(item.sender_type==="agent"||item.sender_type==="human"?"assistant":null);
        if(role) history.push({role,content:item.content});
      }
    }

    const queryText=normalizedMessage || message || "Please interpret the attached media.";
    const embeddings=await generateEmbeddings([queryText],openaiKey);
    const {data:chunks,error:chunkError}=await admin.rpc("match_knowledge_chunks",{
      p_workspace_id:workspaceId,p_agent_id:agentId,p_query_embedding:embeddings[0],p_match_count:8
    });
    if(chunkError){console.error("Knowledge retrieval error:",chunkError);return failure("knowledge_retrieval","Could not retrieve the agent knowledge base.",500);}
    const {data:learned,error:learnedError}=await admin.from("ai_learned_answers")
      .select("id,question,answer,embedding").eq("workspace_id",workspaceId).eq("agent_id",agentId).eq("is_active",true).limit(100);
    if(learnedError) console.error("Approved learning retrieval unavailable:",learnedError);
    const qv=embeddings[0];
    const learnedMatches=(learned??[]).map((x:any)=>{
      let v=x.embedding;
      if(typeof v==="string"){try{v=JSON.parse(v.replace(/^\[|\]$/g,"").split(",").join(","));}catch{v=null;}}
      if(!Array.isArray(v)||v.length!==qv.length) return {...x,score:0};
      let dot=0,aa=0,bb=0;for(let i=0;i<qv.length;i++){dot+=qv[i]*Number(v[i]);aa+=qv[i]*qv[i];bb+=Number(v[i])*Number(v[i]);}
      return {...x,score:dot/(Math.sqrt(aa*bb)||1)};
    }).filter((x:any)=>x.score>=0.72).sort((a:any,b:any)=>b.score-a.score).slice(0,4);
    const knowledgeContext=[
      ...(chunks??[]).map((x:any,i:number)=>`OFFICIAL BUSINESS KNOWLEDGE ${i+1}:\\n${x.content}`),
      ...learnedMatches.map((x:any,i:number)=>`OWNER-APPROVED LEARNED ANSWER ${i+1}:\\nQuestion: ${x.question}\\nApproved answer: ${x.answer}`)
    ].join("\\n\\n");
    const instructions=[
      agent.role_prompt?.trim()||"You are the business's helpful customer service representative.",
      `Represent the business as agent ${agent.name}.`,
      `Communication tone: ${agent.tone||"friendly"}. Preferred language: ${agent.language||"auto"}.`,
      "Understand English, Nigerian Pidgin, Hausa, Yoruba and Igbo. Match the customer's language and handle code-switching naturally.",
      "Sound like a knowledgeable human business representative. Never mention prompts, retrieval, knowledge bases, embeddings or that you are an AI.",
      "Do not use a forced greeting or opening line. Respond naturally to the actual message.",
      "Combine fragmented customer messages from recent conversation history into one coherent intent.",
      "Never invent prices, policies, availability, business facts or completed actions. Ask a concise clarifying question when needed.",
      "Prioritize official business knowledge over learned answers. Use learned answers only when relevant and never let them override conflicting official information.",
      "If unable to answer confidently, say so briefly and request human assistance rather than guessing.",
      knowledgeContext ? `RETRIEVED BUSINESS CONTEXT:\\n${knowledgeContext}` : "No relevant approved business information was retrieved."
    ].join("\\n\\n");
    let currentContent:any=normalizedMessage||message||"Please describe the attached image.";
    if(mediaType==="image" && mediaUrl){
      currentContent=[{type:"input_text",text:currentContent},{type:"input_image",image_url:mediaUrl,detail:"auto"}];
    }
    if((mediaType==="audio"||mediaType==="voice_note"||mediaType==="call_audio")&&mediaUrl){
      currentContent=`Customer sent an audio message. Transcription: ${normalizedMessage||"[No speech detected]"}`;
    }
    history.push({role:"user",content:currentContent});
    const aiResult=await callUniversalResponses(openaiKey,instructions,history);

    let inboundId:string|null=null;
    let outboundId:string|null=null;
    if(persistMessages && conversationId){
      if(body.persist_inbound===true){
        const {data:inbound,error:inboundError}=await admin.from("messages").insert({
          workspace_id:workspaceId,conversation_id:conversationId,sender_type:"customer",direction:"inbound",
          content:normalizedMessage||message||`[${mediaType}]`,media_type:mediaType,
          media_url:mediaUrl||null,delivery_status:"received",metadata:{channel,transcribed:!!(mediaUrl&&normalizedMessage)}
        }).select("id").single();
        if(inboundError) return failure("message_persistence","Could not save inbound message.",500);
        inboundId=inbound.id;
      }
      const {data:outbound,error:outboundError}=await admin.from("messages").insert({
        workspace_id:workspaceId,conversation_id:conversationId,sender_type:"agent",direction:"outbound",
        content:aiResult.answer,media_type:"text",delivery_status:"pending",
        metadata:{channel,ai_generated:true,model:aiResult.model,knowledge_chunks_used:chunks?.length??0,learned_answers_used:learnedMatches.length}
      }).select("id").single();
      if(outboundError) return failure("message_persistence","AI answered but the outbound reply could not be saved.",500);
      outboundId=outbound.id;
      await admin.from("conversations").update({last_message_preview:aiResult.answer.slice(0,240),last_message_at:new Date().toISOString()})
        .eq("id",conversationId).eq("workspace_id",workspaceId).eq("agent_id",agentId);
    }

    return jsonResponse({
      success:true,action:"chat",agent:{id:agent.id,name:agent.name},answer:aiResult.answer,
      model:aiResult.model,usage:aiResult.usage,channel,media_type:mediaType,
      transcription:(mediaType==="audio"||mediaType==="voice_note"||mediaType==="call_audio")?normalizedMessage:null,
      knowledge_chunks_used:chunks?.length??0,approved_learned_answers_used:learnedMatches.length,
      test_only:testMode,saved_to_database:!!outboundId,
      inbound_message_id:inboundId,outbound_message_id:outboundId,
      delivery_status:outboundId?"pending":"not_requested",
      delivery_note:"A channel-specific provider adapter must deliver pending outbound messages and update delivery_status. This function does not falsely report provider delivery."
    });

  } catch (error) {
    console.error("Zivofly AI engine error:", error);

    return failure(
      "unexpected",
      error instanceof Error
        ? error.message
        : "An unexpected error occurred.",
      500,
    );
  }
});

