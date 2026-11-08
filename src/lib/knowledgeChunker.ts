export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;

export interface KnowledgeChunkPayload {
  chunkIndex: number;
  content: string;
  tokenCount: number;
  metadata: Record<string, any>;
}

export interface ChunkingOptions {
  maxChunkChars?: number;
  overlapChars?: number;
  documentTitle?: string;
  sourceType?: string;
}

/**
 * Estimates the token count for OpenAI's cl100k_base tokenizer (used by text-embedding-3-small).
 */
export function estimateTokenCount(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;

  // Approximate cl100k_base tokenization: ~4 characters per token or ~1.3 tokens per word
  const charEstimate = Math.ceil(cleaned.length / 4);
  const words = cleaned.split(/\s+/).filter(Boolean).length;
  const punctuationMatches = cleaned.match(/[.,!?;:()[\]{}"'`~@#$%^&*+=<>|\\/-]/g);
  const punctCount = punctuationMatches ? punctuationMatches.length : 0;
  const wordEstimate = Math.ceil(words * 1.15 + punctCount * 0.5);

  return Math.max(1, Math.round((charEstimate + wordEstimate) / 2));
}

/**
 * Finds a clean semantic break point (paragraph, newline, sentence, clause, or word boundary)
 * within text[0..maxLen].
 */
function findSemanticBreakIndex(text: string, maxLen: number): number {
  if (text.length <= maxLen) return text.length;

  const slice = text.slice(0, maxLen);
  const minAcceptableIndex = Math.floor(maxLen * 0.5);

  // 1. Prefer paragraph boundary (\n\n)
  const paraIdx = slice.lastIndexOf('\n\n');
  if (paraIdx >= minAcceptableIndex) {
    return paraIdx + 2;
  }

  // 2. Prefer single line break (\n)
  const lineIdx = slice.lastIndexOf('\n');
  if (lineIdx >= minAcceptableIndex) {
    return lineIdx + 1;
  }

  // 3. Prefer sentence boundary (. ! ?) followed by space
  for (let i = slice.length - 1; i >= minAcceptableIndex; i--) {
    const ch = slice[i];
    const prev = i > 0 ? slice[i - 1] : '';
    if (/\s/.test(ch) && (prev === '.' || prev === '!' || prev === '?')) {
      return i + 1;
    }
  }

  // 4. Prefer clause boundary (; , :) followed by space
  for (let i = slice.length - 1; i >= minAcceptableIndex; i--) {
    const ch = slice[i];
    const prev = i > 0 ? slice[i - 1] : '';
    if (/\s/.test(ch) && (prev === ';' || prev === ':' || prev === ',')) {
      return i + 1;
    }
  }

  // 5. Fallback to last word boundary
  const spaceIdx = slice.lastIndexOf(' ');
  if (spaceIdx >= minAcceptableIndex) {
    return spaceIdx + 1;
  }

  return maxLen;
}

/**
 * Extracts a clean trailing overlap from the end of a chunk, aligned to a sentence or word boundary.
 */
function extractTrailingOverlap(chunkText: string, targetOverlapChars: number): string {
  if (!chunkText || targetOverlapChars <= 0 || chunkText.length <= targetOverlapChars) {
    return '';
  }

  const rawTail = chunkText.slice(chunkText.length - targetOverlapChars);

  // Try to align to the start of a sentence or line within the tail
  const sentenceMatch = rawTail.match(/(?:^|\n|(?<=[.!?])\s+)([A-Z0-9][\s\S]*)$/);
  if (sentenceMatch && sentenceMatch[1] && sentenceMatch[1].trim().length >= 30) {
    return sentenceMatch[1].trim();
  }

  // Align to the first word boundary in rawTail so we never cut a word in half
  const firstSpace = rawTail.indexOf(' ');
  if (firstSpace !== -1 && firstSpace < rawTail.length - 1) {
    return rawTail.slice(firstSpace + 1).trim();
  }

  return rawTail.trim();
}

/**
 * Splits a document's content_text into meaningful, overlapping text chunks while preserving context.
 */
export function splitTextIntoMeaningfulChunks(
  contentText: string,
  options: ChunkingOptions = {}
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

  if (!normalized) {
    return [];
  }

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
      if (combined) {
        rawChunks.push(combined);
      }
      break;
    }

    const breakIdx = findSemanticBreakIndex(remaining, availableBodyLen);
    const bodySlice = remaining.slice(0, breakIdx).trim();

    if (!bodySlice) {
      // Safeguard against infinite loop
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
