/**
 * Utility to extract readable text content from personal device documents.
 * Supports TXT, MD, CSV, JSON, RTF, PDF, and DOCX (ZIP + word/document.xml decompression).
 */

export interface ExtractedDocumentResult {
  title: string;
  content: string;
  type: 'pdf' | 'text' | 'faq';
  fileSize: string;
  rawFile: File;
}

/**
 * Detects whether a text string contains corrupted raw DOCX ZIP container entries
 * (such as [Content_Types].xml, word/document.xml, word/styles.xml) or binary ZIP headers.
 */
export function isCorruptedDocxText(text: string): boolean {
  if (!text) return false;
  const sample = text.slice(0, 4000);

  // Raw ZIP local file header signature "PK\x03\x04"
  if (sample.startsWith('PK\x03\x04') || sample.includes('PK\x03\x04')) {
    return true;
  }

  // Internal OpenXML package entry names leaked from raw binary decoding
  const xmlMarkers = [
    '[Content_Types].xml',
    'Content_Types',
    'word/document.xml',
    'word/styles.xml',
    'word/fontTable.xml',
    'word/settings.xml',
    'word/webSettings.xml',
    'word/theme/theme1.xml',
    '_rels/.rels',
    'docProps/core.xml',
    'docProps/app.xml',
  ];

  let matchedMarkers = 0;
  for (const marker of xmlMarkers) {
    if (sample.includes(marker)) {
      matchedMarkers++;
    }
  }

  return matchedMarkers >= 2;
}

/**
 * Decompresses a raw Deflate byte array (ZIP compression method 8) using the standard
 * Web Streams DecompressionStream('deflate-raw') API.
 */
async function inflateRawBytes(compressedBytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error(
      'Browser does not support DecompressionStream required to unpack .docx files.'
    );
  }

  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  const writePromise = writer
    .write(new Uint8Array(compressedBytes))
    .then(() => writer.close());

  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      totalLength += value.byteLength;
    }
  }

  await writePromise;

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return result;
}

/**
 * Locates and extracts a file entry (e.g. "word/document.xml") from a ZIP archive ArrayBuffer
 * by reading the ZIP Central Directory.
 */
async function extractEntryFromZipBuffer(
  buffer: ArrayBuffer,
  targetPath: string
): Promise<string | null> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // Verify ZIP magic bytes (PK\x03\x04)
  if (
    bytes.length < 22 ||
    bytes[0] !== 0x50 ||
    bytes[1] !== 0x4b ||
    bytes[2] !== 0x03 ||
    bytes[3] !== 0x04
  ) {
    throw new Error('Invalid .docx file: File is not a valid OpenXML ZIP archive.');
  }

  // Locate End of Central Directory (EOCD) signature 0x06054b50 scanning backwards from end
  let eocdOffset = -1;
  const minEocdSearchOffset = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= minEocdSearchOffset; i--) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x05 &&
      bytes[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error('Corrupted .docx archive: ZIP central directory not found.');
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const centralDirOffset = view.getUint32(eocdOffset + 16, true);

  let ptr = centralDirOffset;
  const utf8Decoder = new TextDecoder('utf-8');

  for (let entryIdx = 0; entryIdx < totalEntries; entryIdx++) {
    if (ptr + 46 > bytes.length) break;

    // Central Directory File Header signature 0x02014b50
    const sig = view.getUint32(ptr, true);
    if (sig !== 0x02014b50) break;

    const compressionMethod = view.getUint16(ptr + 10, true);
    const compressedSize = view.getUint32(ptr + 20, true);
    const fileNameLen = view.getUint16(ptr + 28, true);
    const extraFieldLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localHeaderOffset = view.getUint32(ptr + 42, true);

    const fileName = utf8Decoder.decode(
      bytes.subarray(ptr + 46, ptr + 46 + fileNameLen)
    );

    ptr += 46 + fileNameLen + extraFieldLen + commentLen;

    if (fileName === targetPath) {
      if (localHeaderOffset + 30 > bytes.length) {
        throw new Error(`Corrupted .docx local header for ${targetPath}.`);
      }

      const localSig = view.getUint32(localHeaderOffset, true);
      if (localSig !== 0x04034b50) {
        throw new Error(`Invalid local file header signature for ${targetPath}.`);
      }

      const localNameLen = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
      const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
      const dataEnd = dataStart + compressedSize;

      if (dataEnd > bytes.length) {
        throw new Error(`Truncated compressed stream for ${targetPath}.`);
      }

      const compressedSlice = bytes.subarray(dataStart, dataEnd);

      if (compressionMethod === 0) {
        return utf8Decoder.decode(compressedSlice);
      }

      if (compressionMethod === 8) {
        const decompressed = await inflateRawBytes(compressedSlice);
        return utf8Decoder.decode(decompressed);
      }

      throw new Error(
        `Unsupported ZIP compression method (${compressionMethod}) in ${targetPath}.`
      );
    }
  }

  return null;
}

/**
 * Extracts readable paragraphs, headings, tables, and lists from WordprocessingML (word/document.xml).
 */
function parseWordDocumentXmlToText(xmlContent: string): string {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'application/xml');

  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Failed to parse XML structure inside word/document.xml.');
  }

  const paragraphs: string[] = [];

  const extractNodeText = (node: Node): string => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const localName = el.localName || el.nodeName.replace(/^.*:/, '');

      // <w:t> contains actual document text
      if (localName === 't') {
        return el.textContent || '';
      }

      // <w:tab/> represents a tab character
      if (localName === 'tab') {
        return '\t';
      }

      // <w:br/> or <w:cr/> represents a line break within a paragraph
      if (localName === 'br' || localName === 'cr') {
        return '\n';
      }

      // Skip deleted revision text (<w:delText>) or hidden instructions (<w:instrText>)
      if (localName === 'delText' || localName === 'instrText') {
        return '';
      }

      let combined = '';
      for (let i = 0; i < el.childNodes.length; i++) {
        combined += extractNodeText(el.childNodes[i]);
      }
      return combined;
    }
    return '';
  };

  // Walk all <w:p> paragraph elements in document order
  const allElements = xmlDoc.getElementsByTagName('*');
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i];
    const localName = el.localName || el.nodeName.replace(/^.*:/, '');
    if (localName === 'p') {
      const paraText = extractNodeText(el)
        .replace(/\t+/g, ' ')
        .replace(/[ \u00A0]+/g, ' ')
        .trim();
      if (paraText) {
        paragraphs.push(paraText);
      }
    }
  }

  return paragraphs.join('\n\n').trim();
}

/**
 * Extracts readable text from a .docx Word document file.
 */
async function extractTextFromDocxFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const documentXml = await extractEntryFromZipBuffer(buffer, 'word/document.xml');

  if (!documentXml) {
    throw new Error(
      'Invalid .docx file: Could not find word/document.xml inside the document archive.'
    );
  }

  const extractedText = parseWordDocumentXmlToText(documentXml);

  if (!extractedText || extractedText.trim().length === 0) {
    throw new Error(
      'The uploaded Word document (.docx) does not contain any extractable text.'
    );
  }

  if (isCorruptedDocxText(extractedText)) {
    throw new Error(
      'Extracted content appears corrupted with internal XML metadata. Please verify the .docx file.'
    );
  }

  return extractedText;
}

export async function extractTextFromFile(file: File): Promise<ExtractedDocumentResult> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

  const fileSize =
    file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(file.size / 1024))} KB`;

  // 1. Plain text-based files (TXT, MD, CSV, JSON, RTF, LOG, TSV)
  if (['txt', 'md', 'csv', 'json', 'rtf', 'log', 'tsv'].includes(extension)) {
    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}.`));
      reader.readAsText(file);
    });

    const trimmed = content.trim();
    if (!trimmed) {
      throw new Error(`The file "${file.name}" is empty.`);
    }

    if (isCorruptedDocxText(trimmed)) {
      throw new Error(
        `The file "${file.name}" appears to be a binary archive rather than plain text.`
      );
    }

    return {
      title: cleanTitle,
      content: trimmed,
      type: extension === 'csv' || extension === 'json' ? 'faq' : 'text',
      fileSize,
      rawFile: file,
    };
  }

  // 2. DOCX files (ZIP-based OpenXML Word documents)
  if (
    extension === 'docx' ||
    file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const content = await extractTextFromDocxFile(file);
    return {
      title: cleanTitle,
      content,
      type: 'text',
      fileSize,
      rawFile: file,
    };
  }

  // 3. Legacy binary .doc files
  if (extension === 'doc' || file.type === 'application/msword') {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // If a .docx file was renamed to .doc, still extract it via ZIP parser
    if (
      bytes.length >= 4 &&
      bytes[0] === 0x50 &&
      bytes[1] === 0x4b &&
      bytes[2] === 0x03 &&
      bytes[3] === 0x04
    ) {
      const content = await extractTextFromDocxFile(file);
      return {
        title: cleanTitle,
        content,
        type: 'text',
        fileSize,
        rawFile: file,
      };
    }

    throw new Error(
      'Legacy binary Word (.doc) format is not supported directly. Please save the document as .docx, .pdf, or .txt and try again.'
    );
  }

  // 4. PDF files
  if (extension === 'pdf' || file.type === 'application/pdf') {
    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const buffer = reader.result as ArrayBuffer;
          const bytes = new Uint8Array(buffer);
          const textDecoder = new TextDecoder('latin1');
          const rawText = textDecoder.decode(bytes);

          let extracted = '';

          // Look for text blocks in PDF (BT ... ET)
          const btRegex = /BT[\s\S]*?ET/g;
          const btMatches = rawText.match(btRegex);
          if (btMatches && btMatches.length > 0) {
            for (const block of btMatches) {
              const strRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
              let match;
              while ((match = strRegex.exec(block)) !== null) {
                extracted += match[1] + ' ';
              }
              const tjRegex = /\[([^\]]+)\]\s*TJ/g;
              while ((match = tjRegex.exec(block)) !== null) {
                const arrayContent = match[1];
                const innerStrs = arrayContent.match(/\(([^)]+)\)/g);
                if (innerStrs) {
                  extracted += innerStrs.map((s) => s.slice(1, -1)).join('') + ' ';
                }
              }
            }
          }

          if (extracted.trim().length > 20) {
            const cleaned = extracted
              .replace(/\\([()\\])/g, '$1')
              .replace(/\\r/g, ' ')
              .replace(/\\n/g, '\n')
              .replace(/\s+/g, ' ')
              .trim();
            resolve(cleaned);
            return;
          }

          reject(
            new Error(
              'Could not extract readable text from this PDF (it may use compressed/scanned streams). Please copy and paste the text manually or upload a .docx/.txt file.'
            )
          );
        } catch (err: any) {
          reject(
            new Error(err?.message || `Failed to extract text from PDF "${file.name}".`)
          );
        }
      };
      reader.onerror = () => reject(new Error(`Failed to read PDF "${file.name}".`));
      reader.readAsArrayBuffer(file);
    });

    return {
      title: cleanTitle,
      content,
      type: 'pdf',
      fileSize,
      rawFile: file,
    };
  }

  throw new Error(
    `Unsupported file format (.${extension || 'unknown'}). Please upload a DOCX, PDF, TXT, CSV, Markdown, or JSON file.`
  );
}
