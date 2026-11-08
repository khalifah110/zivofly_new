import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, any>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

export interface KnowledgeChunkPayload {
  chunkIndex: number;
  content: string;
  tokenCount: number;
  metadata: Record<string, any>;
}

/**
 * Detects whether text contains corrupted raw DOCX ZIP container metadata
 * such as [Content_Types].xml, word/document.xml, or word/styles.xml.
 */
function isCorruptedDocxContent(text: string): boolean {
  if (!text) return false;
  const sample = text.slice(0, 4000);
  if (sample.includes('PK\x03\x04')) return true;

  const markers = [
    '[Content_Types].xml',
    'Content_Types',
    'word/document.xml',
    'word/styles.xml',
    'word/fontTable.xml',
    'word/settings.xml',
    '_rels/.rels',
    'docProps/core.xml',
    'docProps/app.xml',
  ];

  let count = 0;
  for (const m of markers) {
    if (sample.includes(m)) count++;
  }
  return count >= 2;
}

/**
 * Estimates the token count for OpenAI's cl100k_base tokenizer (used by text-embedding-3-small).
 */
export function estimateTokenCount(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;

  const charEstimate = Math.ceil(cleaned.length / 4);
  const words = cleaned.split(/\s+/).filter(Boolean).length;
  const punctuationMatches = cleaned.match(/[.,!?;:()[\]{}"'`~@#$%^&*+=<>|\\/-]/g);
  const punctCount = punctuationMatches ? punctuationMatches.length : 0;
  const wordEstimate = Math.ceil(words * 1.15 + punctCount * 0.5);

  return Math.max(1, Math.round((charEstimate + wordEstimate) / 2));
}

function findSemanticBreakIndex(text: string, maxLen: number): number {
  if (text.length <= maxLen) return text.length;

  const slice = text.slice(0, maxLen);
  const minAcceptableIndex = Math.floor(maxLen * 0.5);

  const paraIdx = slice.lastIndexOf('\n\n');
  if (paraIdx >= minAcceptableIndex) return paraIdx + 2;

  const lineIdx = slice.lastIndexOf('\n');
  if (lineIdx >= minAcceptableIndex) return lineIdx + 1;

  for (let i = slice.length - 1; i >= minAcceptableIndex; i--) {
    const ch = slice[i];
    const prev = i > 0 ? slice[i - 1] : '';
    if (/\s/.test(ch) && (prev === '.' || prev === '!' || prev === '?')) {
      return i + 1;
    }
  }

  for (let i = slice.length - 1; i >= minAcceptableIndex; i--) {
    const ch = slice[i];
    const prev = i > 0 ? slice[i - 1] : '';
    if (/\s/.test(ch) && (prev === ';' || prev === ':' || prev === ',')) {
      return i + 1;
    }
  }

  const spaceIdx = slice.lastIndexOf(' ');
  if (spaceIdx >= minAcceptableIndex) return spaceIdx + 1;

  return maxLen;
}

function extractTrailingOverlap(chunkText: string, targetOverlapChars: number): string {
  if (!chunkText || targetOverlapChars <= 0 || chunkText.length <= targetOverlapChars) {
    return '';
  }

  const rawTail = chunkText.slice(chunkText.length - targetOverlapChars);
  const sentenceMatch = rawTail.match(/(?:^|\n|(?<=[.!?])\s+)([A-Z0-9][\s\S]*)$/);
  if (sentenceMatch && sentenceMatch[1] && sentenceMatch[1].trim().length >= 30) {
    return sentenceMatch[1].trim();
  }

  const firstSpace = rawTail.indexOf(' ');
  if (firstSpace !== -1 && firstSpace < rawTail.length - 1) {
    return rawTail.slice(firstSpace + 1).trim();
  }

  return rawTail.trim();
}

export function splitTextIntoMeaningfulChunks(
  contentText: string,
  options: {
    maxChunkChars?: number;
    overlapChars?: number;
    documentTitle?: string;
    sourceType?: string;
  } = {}
): KnowledgeChunkPayload[] {
  const maxChunkChars = options.maxChunkChars ?? 800;
  const overlapChars = Math.min(
    options.overlapChars ?? 160,
    Math.floor(maxChunkChars * 0.35)
  );

  const normalized = (contentText || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!normalized) return [];

  const rawChunks: string[] = [];
  let remaining = normalized;
  let previousChunk = '';

  while (remaining.length > 0) {
    const overlapPrefix = previousChunk
      ? extractTrailingOverlap(previousChunk, overlapChars)
      : '';

    const availableBodyLen = Math.max(
      200,
      maxChunkChars - (overlapPrefix ? overlapPrefix.length + 1 : 0)
    );

    if (remaining.length <= availableBodyLen) {
      const combined = overlapPrefix
        ? `${overlapPrefix}\n${remaining}`.trim()
        : remaining.trim();
      if (combined) rawChunks.push(combined);
      break;
    }

    const breakIdx = findSemanticBreakIndex(remaining, availableBodyLen);
    const bodySlice = remaining.slice(0, breakIdx).trim();

    if (!bodySlice) {
      const forcedSlice = remaining.slice(0, availableBodyLen).trim();
      if (forcedSlice) {
        rawChunks.push(
          overlapPrefix ? `${overlapPrefix}\n${forcedSlice}`.trim() : forcedSlice
        );
      }
      remaining = remaining.slice(availableBodyLen).trim();
      previousChunk = forcedSlice;
      continue;
    }

    const combinedChunk = overlapPrefix
      ? `${overlapPrefix}\n${bodySlice}`.trim()
      : bodySlice;

    rawChunks.push(combinedChunk);
    previousChunk = bodySlice;
    remaining = remaining.slice(breakIdx).trim();
  }

  return rawChunks.map((chunkContent, index) => ({
    chunkIndex: index,
    content: chunkContent,
    tokenCount: estimateTokenCount(chunkContent),
    metadata: {
      ...(options.documentTitle ? { document_title: options.documentTitle } : {}),
      ...(options.sourceType ? { source_type: options.sourceType } : {}),
      char_count: chunkContent.length,
      total_chunks: rawChunks.length,
    },
  }));
}

/**
 * Generates 1536-dimensional embeddings using OpenAI's text-embedding-3-small model
 * and the server-side `gpt_api` secret.
 */
async function generateOpenAIEmbeddings(
  texts: string[],
  openAiKey: string
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
      encoding_format: 'float',
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const apiErrMsg =
      payload?.error?.message ||
      `OpenAI Embeddings API failed with HTTP ${response.status}`;
    throw new Error(`[openai_embeddings] ${apiErrMsg}`);
  }

  const dataList: Array<{ index: number; embedding: number[] }> =
    payload?.data || [];

  if (!Array.isArray(dataList) || dataList.length !== texts.length) {
    throw new Error(
      `[openai_embeddings] OpenAI Embeddings API returned ${
        Array.isArray(dataList) ? dataList.length : 0
      } embeddings for ${texts.length} input chunks.`
    );
  }

  const sorted = [...dataList].sort((a, b) => a.index - b.index);
  const vectors: number[][] = [];

  for (let i = 0; i < sorted.length; i++) {
    const vec = sorted[i]?.embedding;
    if (
      !Array.isArray(vec) ||
      vec.length !== EMBEDDING_DIMENSIONS ||
      !vec.every((n) => typeof n === 'number' && Number.isFinite(n))
    ) {
      throw new Error(
        `[openai_embeddings] Invalid embedding dimensions for chunk ${i}: expected ${EMBEDDING_DIMENSIONS}, received ${
          Array.isArray(vec) ? vec.length : 'non-array'
        }.`
      );
    }
    vectors.push(vec);
  }

  return vectors;
}

/**
 * Verifies that the authenticated user owns or is a member of the target workspace.
 */
async function verifyWorkspaceAccess(
  dbClient: SupabaseClient,
  userClient: SupabaseClient,
  workspaceId: string,
  userId: string
): Promise<{ allowed: boolean; reason?: string }> {
  // 1. Check workspaces table (owner_user_id or RLS select)
  const { data: wsRow, error: wsErr } = await dbClient
    .from('workspaces')
    .select('id, owner_user_id')
    .eq('id', workspaceId)
    .maybeSingle();

  if (wsRow && wsRow.owner_user_id === userId) {
    return { allowed: true };
  }

  // 2. Check workspace_members table
  const { data: memberRow } = await dbClient
    .from('workspace_members')
    .select('workspace_id, user_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (memberRow) {
    return { allowed: true };
  }

  // 3. Fallback: check if userClient RLS allows reading the workspace
  const { data: rlsWs } = await userClient
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .maybeSingle();

  if (rlsWs?.id) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason:
      wsErr?.message ||
      `Authenticated user (${userId}) does not have access to workspace (${workspaceId}).`,
  };
}

/**
 * Processes a single knowledge_documents record:
 * 1. Verifies workspace_id, agent_id, and document_id ownership.
 * 2. Validates content_text is readable and not corrupted DOCX XML.
 * 3. Splits content_text into meaningful overlapping chunks.
 * 4. Generates 1536-dimensional embeddings using OpenAI text-embedding-3-small (`gpt_api`).
 * 5. Deletes any existing chunks for document_id to prevent duplicates.
 * 6. Inserts chunks into knowledge_chunks.
 * 7. Updates knowledge_documents chunk_count and status ('ready' or 'failed').
 */
export async function processDocumentInEdgeFunction(params: {
  supabaseClient: SupabaseClient;
  openAiKey: string;
  workspaceId: string;
  agentId: string;
  documentId: string;
}): Promise<{
  documentId: string;
  chunkCount: number;
  status: 'ready';
}> {
  const { supabaseClient, openAiKey, workspaceId, agentId, documentId } =
    params;

  // 1. Fetch and verify the document belongs to the workspace and agent
  const { data: docRow, error: docErr } = await supabaseClient
    .from('knowledge_documents')
    .select('*')
    .eq('id', documentId)
    .eq('workspace_id', workspaceId)
    .eq('agent_id', agentId)
    .maybeSingle();

  if (docErr) {
    throw new Error(
      `[document_lookup] Failed to load knowledge document (${documentId}): ${docErr.message}`
    );
  }

  if (!docRow) {
    throw new Error(
      `[document_lookup] Knowledge document (${documentId}) not found for workspace ${workspaceId} and agent ${agentId}.`
    );
  }

  // Mark document as 'processing'
  await supabaseClient
    .from('knowledge_documents')
    .update({
      status: 'processing',
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .eq('workspace_id', workspaceId);

  try {
    const contentText = (
      docRow.content_text ||
      docRow.metadata?.content ||
      ''
    ).trim();

    if (!contentText) {
      throw new Error(
        '[chunking] Document content_text is empty and cannot be split into chunks.'
      );
    }

    if (isCorruptedDocxContent(contentText)) {
      throw new Error(
        '[chunking] Document content_text contains corrupted raw DOCX XML/ZIP metadata (Content_Types, document.xml, styles.xml). Please re-upload the Word document so its readable text is extracted properly.'
      );
    }

    // 2. Split content_text into meaningful overlapping chunks
    const chunks = splitTextIntoMeaningfulChunks(contentText, {
      maxChunkChars: 800,
      overlapChars: 160,
      documentTitle: docRow.title || 'Document',
      sourceType: docRow.source_type || 'text',
    });

    if (chunks.length === 0) {
      throw new Error(
        '[chunking] No meaningful text chunks could be extracted from content_text.'
      );
    }

    // 3. Generate 1536-dimensional embeddings in batches using text-embedding-3-small
    const batchSize = 50;
    const allEmbeddings: number[][] = [];

    for (let start = 0; start < chunks.length; start += batchSize) {
      const batchTexts = chunks
        .slice(start, start + batchSize)
        .map((c) => c.content);
      const batchVectors = await generateOpenAIEmbeddings(
        batchTexts,
        openAiKey
      );
      allEmbeddings.push(...batchVectors);
    }

    if (allEmbeddings.length !== chunks.length) {
      throw new Error(
        `[openai_embeddings] Embedding count mismatch: generated ${allEmbeddings.length} embeddings for ${chunks.length} chunks.`
      );
    }

    // 4. Prevent duplicate chunks when processing the same document again
    const { error: deleteErr } = await supabaseClient
      .from('knowledge_chunks')
      .delete()
      .eq('document_id', documentId)
      .eq('workspace_id', workspaceId);

    if (deleteErr) {
      throw new Error(
        `[knowledge_chunks_delete] Failed to clear existing chunks before indexing: ${deleteErr.message}`
      );
    }

    // 5. Build and insert rows into knowledge_chunks
    const chunkRows = chunks.map((chunk, idx) => ({
      workspace_id: workspaceId,
      agent_id: agentId,
      document_id: documentId,
      chunk_index: chunk.chunkIndex,
      content: chunk.content,
      embedding: allEmbeddings[idx],
      embedding_model: EMBEDDING_MODEL,
      token_count: chunk.tokenCount,
      metadata: chunk.metadata,
    }));

    const { error: insertChunksErr } = await supabaseClient
      .from('knowledge_chunks')
      .insert(chunkRows);

    if (insertChunksErr) {
      throw new Error(
        `[knowledge_chunks_insert] Failed to insert chunks into knowledge_chunks: ${insertChunksErr.message}`
      );
    }

    // 6. Update knowledge_documents status to 'ready' and record chunk_count
    const { error: updateDocErr } = await supabaseClient
      .from('knowledge_documents')
      .update({
        chunk_count: chunkRows.length,
        status: 'ready',
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .eq('workspace_id', workspaceId);

    if (updateDocErr) {
      throw new Error(
        `[knowledge_documents_update] Chunks were saved, but updating document status failed: ${updateDocErr.message}`
      );
    }

    return {
      documentId,
      chunkCount: chunkRows.length,
      status: 'ready',
    };
  } catch (procErr: any) {
    const errorMessage =
      procErr?.message || 'Document chunking and embedding generation failed.';

    await supabaseClient
      .from('knowledge_documents')
      .update({
        status: 'failed',
        chunk_count: 0,
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .eq('workspace_id', workspaceId);

    throw procErr;
  }
}

if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
      const openAiKey = Deno.env.get('gpt_api') || '';

      const authHeader =
        req.headers.get('Authorization') ||
        req.headers.get('authorization') ||
        '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();

      if (!authHeader || !token) {
        return jsonResponse(
          {
            error: 'Missing Authorization Bearer token in request headers.',
            stage: 'auth_header',
          },
          401
        );
      }

      // Create stateless Supabase client with the caller's Authorization header
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      // CRITICAL: Pass `token` explicitly to getUser(token) so stateless Deno Edge Function
      // validates the JWT directly against Supabase Auth instead of checking in-memory session storage.
      const {
        data: { user },
        error: authErr,
      } = await userClient.auth.getUser(token);

      if (authErr || !user) {
        return jsonResponse(
          {
            error: authErr?.message || 'Invalid or expired login session.',
            stage: 'auth_get_user',
          },
          401
        );
      }

      if (!openAiKey) {
        return jsonResponse(
          {
            error:
              'OpenAI API secret (gpt_api) is not configured in Edge Function secrets.',
            stage: 'missing_secret',
          },
          500
        );
      }

      const dbClient = supabaseServiceKey
        ? createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false,
            },
          })
        : userClient;

      // Parse request body and identify `action` BEFORE validating action-specific fields
      const body = await req.json().catch(() => ({}));
      const action = typeof body.action === 'string' ? body.action.trim() : '';
      const workspaceId =
        typeof body.workspace_id === 'string' ? body.workspace_id.trim() : '';
      const agentId =
        typeof body.agent_id === 'string' ? body.agent_id.trim() : '';
      const documentId =
        typeof body.document_id === 'string' ? body.document_id.trim() : '';
      const message =
        typeof body.message === 'string' ? body.message.trim() : '';

      // =========================================================================
      // ROUTE 1: Document Processing (`action === "process_document"`)
      // Executed BEFORE normal conversation validation so `message` is NOT required
      // =========================================================================
      if (action === 'process_document') {
        if (!workspaceId || !agentId || !documentId) {
          return jsonResponse(
            {
              error:
                'workspace_id, agent_id, and document_id are required for action "process_document".',
              stage: 'routing_validation',
            },
            400
          );
        }

        // Verify workspace access for authenticated user
        const wsAccess = await verifyWorkspaceAccess(
          dbClient,
          userClient,
          workspaceId,
          user.id
        );
        if (!wsAccess.allowed) {
          return jsonResponse(
            {
              error: wsAccess.reason || 'Access denied to workspace.',
              stage: 'workspace_auth',
            },
            403
          );
        }

        // Verify agent belongs to workspace
        const { data: agentRow, error: agentErr } = await dbClient
          .from('agents')
          .select('id, workspace_id, name')
          .eq('id', agentId)
          .eq('workspace_id', workspaceId)
          .maybeSingle();

        if (agentErr || !agentRow) {
          return jsonResponse(
            {
              error:
                agentErr?.message ||
                `Agent (${agentId}) not found in workspace (${workspaceId}).`,
              stage: 'agent_lookup',
            },
            404
          );
        }

        // Verify document belongs to the workspace and agent
        const { data: docOwnershipRow, error: docOwnershipErr } = await dbClient
          .from('knowledge_documents')
          .select('id, workspace_id, agent_id, title')
          .eq('id', documentId)
          .eq('workspace_id', workspaceId)
          .eq('agent_id', agentId)
          .maybeSingle();

        if (docOwnershipErr || !docOwnershipRow) {
          return jsonResponse(
            {
              error:
                docOwnershipErr?.message ||
                `Knowledge document (${documentId}) not found for workspace (${workspaceId}) and agent (${agentId}).`,
              stage: 'document_lookup',
            },
            404
          );
        }

        const result = await processDocumentInEdgeFunction({
          supabaseClient: dbClient,
          openAiKey,
          workspaceId,
          agentId,
          documentId,
        });

        return jsonResponse({
          success: true,
          action: 'process_document',
          document_id: result.documentId,
          chunk_count: result.chunkCount,
          status: result.status,
          embedding_model: EMBEDDING_MODEL,
          dimensions: EMBEDDING_DIMENSIONS,
        });
      }

      // =========================================================================
      // ROUTE 2: Normal AI Conversation (`{ workspace_id, agent_id, message }`)
      // =========================================================================
      if (!workspaceId || !agentId || !message) {
        return jsonResponse(
          {
            error: 'workspace_id, agent_id, and message are required.',
            stage: 'chat_validation',
          },
          400
        );
      }

      const wsAccess = await verifyWorkspaceAccess(
        dbClient,
        userClient,
        workspaceId,
        user.id
      );
      if (!wsAccess.allowed) {
        return jsonResponse(
          {
            error: wsAccess.reason || 'Access denied to workspace.',
            stage: 'workspace_auth',
          },
          403
        );
      }

      const { data: agentRow, error: agentErr } = await dbClient
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (agentErr || !agentRow) {
        return jsonResponse(
          {
            error:
              agentErr?.message ||
              'Access denied or agent not found in the specified workspace.',
            stage: 'agent_lookup',
          },
          404
        );
      }

      // Generate 1536-d query embedding for match_knowledge_chunks
      const [queryEmbedding] = await generateOpenAIEmbeddings(
        [message],
        openAiKey
      );

      const { data: matchedChunks } = await dbClient.rpc(
        'match_knowledge_chunks',
        {
          p_workspace_id: workspaceId,
          p_agent_id: agentId,
          p_query_embedding: queryEmbedding,
          p_match_count: 5,
        }
      );

      const contextBlocks = Array.isArray(matchedChunks)
        ? matchedChunks
            .map((c: any, idx: number) => `[Source ${idx + 1}]: ${c.content}`)
            .join('\n\n')
        : '';

      const systemPrompt = [
        `You are ${agentRow.name || 'an AI Support Agent'}.`,
        agentRow.description ? `Role & Duties:\n${agentRow.description}` : '',
        agentRow.tone ? `Tone: ${agentRow.tone}` : '',
        contextBlocks
          ? `Use the following retrieved knowledge chunks to answer accurately:\n\n${contextBlocks}`
          : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openAiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
          temperature: 0.3,
        }),
      });

      const chatPayload = await chatRes.json().catch(() => null);
      if (!chatRes.ok) {
        return jsonResponse(
          {
            error:
              chatPayload?.error?.message ||
              `OpenAI Chat API failed with HTTP ${chatRes.status}`,
            stage: 'openai_chat',
          },
          chatRes.status
        );
      }

      const answer =
        chatPayload?.choices?.[0]?.message?.content?.trim() ||
        'No response generated.';

      return jsonResponse({
        answer,
        matched_chunks: Array.isArray(matchedChunks) ? matchedChunks.length : 0,
      });
    } catch (err: any) {
      return jsonResponse(
        {
          error: err?.message || 'Internal server error in zivofy_ai.',
          stage: 'edge_function_exception',
        },
        500
      );
    }
  });
}
