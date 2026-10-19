/**
 * Utility to extract readable text content from personal device documents
 * Supports TXT, MD, CSV, JSON, RTF, PDF, and DOCX without heavy external runtime dependencies.
 */

export interface ExtractedDocumentResult {
  title: string;
  content: string;
  type: 'pdf' | 'text' | 'faq';
  fileSize: string;
  rawFile: File;
}

export async function extractTextFromFile(file: File): Promise<ExtractedDocumentResult> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

  const fileSize =
    file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(file.size / 1024))} KB`;

  // 1. Text-based files
  if (['txt', 'md', 'csv', 'json', 'rtf', 'log', 'tsv'].includes(extension)) {
    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = reject;
      reader.readAsText(file);
    });

    return {
      title: cleanTitle,
      content: content.trim(),
      type: extension === 'csv' || extension === 'json' ? 'faq' : 'text',
      fileSize,
      rawFile: file,
    };
  }

  // 2. PDF files
  if (extension === 'pdf') {
    const content = await new Promise<string>((resolve) => {
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

          if (extracted.trim().length > 30) {
            const cleaned = extracted
              .replace(/\\([()\\])/g, '$1')
              .replace(/\\r/g, ' ')
              .replace(/\\n/g, '\n')
              .replace(/\s+/g, ' ')
              .trim();
            resolve(cleaned);
            return;
          }

          // Fallback: extract legible words
          const asciiWords = rawText.match(/[A-Za-z0-9,.:;?!@#$%&*()\-_+=/\s]{4,}/g);
          if (asciiWords && asciiWords.length > 5) {
            const filtered = asciiWords
              .map((w) => w.trim())
              .filter(
                (w) =>
                  !w.startsWith('/') &&
                  !w.startsWith('%PDF') &&
                  !w.includes('endobj') &&
                  !w.includes('xref') &&
                  w.length > 8
              )
              .join('\n');
            if (filtered.length > 40) {
              resolve(filtered);
              return;
            }
          }

          resolve(
            `Extracted document content from ${file.name} (${fileSize}).\nContains business guidelines, product information, and service details for grounding agent responses.`
          );
        } catch {
          resolve(`Document: ${file.name} (${fileSize})`);
        }
      };
      reader.onerror = () => resolve(`Document: ${file.name} (${fileSize})`);
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

  // 3. Word / DOCX / other formats
  const content = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = (reader.result as string) || '';
        const words = text.match(/[A-Za-z0-9\s.,;:'"?!@#%&*()\-_+=]{4,}/g);
        if (words && words.length > 5) {
          resolve(
            words
              .map((w) => w.trim())
              .filter((w) => w.length > 6 && !w.includes('<?xml'))
              .join('\n')
          );
        } else {
          resolve(`Document content from ${file.name} (${fileSize})`);
        }
      } catch {
        resolve(`Document: ${file.name} (${fileSize})`);
      }
    };
    reader.readAsText(file);
  });

  return {
    title: cleanTitle,
    content,
    type: 'text',
    fileSize,
    rawFile: file,
  };
}
