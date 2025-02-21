import { debounce } from './utils';

export interface EditorMetrics {
  wordCount: number;
  headers: {
    h2: number;
    h3: number;
    h4: number;
  };
}

export function calculateEditorMetrics(content: string): EditorMetrics {
  // Create temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;

  // Count words
  const text = tempDiv.textContent || '';
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;

  // Count headers
  const h2Count = tempDiv.querySelectorAll('h2').length;
  const h3Count = tempDiv.querySelectorAll('h3').length;
  const h4Count = tempDiv.querySelectorAll('h4').length;

  return {
    wordCount,
    headers: {
      h2: h2Count,
      h3: h3Count,
      h4: h4Count
    }
  };
}

// Create debounced version of metrics calculation
export const debouncedCalculateMetrics = debounce((content: string, callback: (metrics: EditorMetrics) => void) => {
  const metrics = calculateEditorMetrics(content);
  callback(metrics);
}, 500); // 500ms delay