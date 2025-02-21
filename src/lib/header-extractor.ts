// Helper function to validate text input
function validateText(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return text.trim();
}

interface HeaderEntry {
  level: 'h1' | 'h2' | 'h3' | 'h4';
  text: string;
}

// Helper function to validate header object
function validateHeaders(headers: any): Record<string, string[]> {
  if (!headers || typeof headers !== 'object') {
    return { h1: [], h2: [], h3: [], h4: [] };
  }

  const validHeaders: Record<string, string[]> = {};
  ['h1', 'h2', 'h3', 'h4'].forEach(level => {
    validHeaders[level] = Array.isArray(headers[level]) 
      ? headers[level].map(validateText).filter(Boolean)
      : [];
  });

  return validHeaders;
}

// Helper function to extract header text from content analysis
export function extractHeaderText(headers: any): string {
  const validatedHeaders = validateHeaders(headers);
  const headerTexts: string[] = [];

  Object.entries(validatedHeaders).forEach(([level, texts]) => {
    texts.forEach(text => {
      if (text) {
        headerTexts.push(`${level.toUpperCase()}: ${text}`);
      }
    });
  });

  return headerTexts.join('\n');
}

/**
 * Extracts headers from text in sequential order, preserving their original order
 * and hierarchy as they appear in the content.
 */
export function extractHeaders(text: string): HeaderEntry[] {
  const validText = validateText(text);
  if (!validText) {
    return [];
  }

  const headers: HeaderEntry[] = [];
  const lines = validText.split('\n');

  for (const line of lines) {
    const match = line.match(/^(H[1-4]):\s*(.+)$/i);
    if (match) {
      const [, level, text] = match;
      const validHeaderText = validateText(text);
      if (validHeaderText) {
        headers.push({
          level: level.toLowerCase() as 'h1' | 'h2' | 'h3' | 'h4',
          text: validHeaderText
        });
      }
    }
  }

  return headers;
}