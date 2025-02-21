// Import stop words and functions
import { STOP_WORDS } from './stop-words';

// Web Worker code as a string template
const workerCode = `
  // Define stop words set
  const STOP_WORDS = new Set(${JSON.stringify(Array.from(STOP_WORDS))});

  // Helper function to normalize text
  function normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[^а-яіїєґ'\\-\\s]/gi, ' ') // Keep only Ukrainian/Russian letters
      .split(/\\s+/)
      .filter(word => !isStopWord(word) && word.length > 2)
      .join(' ');
  }

  // Helper function to check stop words
  function isStopWord(word) {
    return STOP_WORDS.has(word.toLowerCase());
  }

  self.onmessage = function(e) {
    const { text, competitorTexts } = e.data;
    
    try {
      // Helper function to clean and filter text
      function processText(text) {
        // Normalize text and split into words
        const words = text
          .toLowerCase()
          .replace(/[^а-яіїєґ'\\-\\s]/gi, ' ') // Keep only Ukrainian/Russian letters
          .split(/\\s+/)
          .filter(word => word.length > 2 && !isStopWord(word));
        
        console.log('Words after filtering:', words.length);

        // Create frequency map and calculate total words in one pass
        const wordMap = new Map();
        let significantWords = 0;

        words.forEach(word => {
          significantWords++;
          if (!wordMap.has(word)) {
            wordMap.set(word, {
              forms: new Set([word]),
              frequency: 1
            });
          } else {
            const entry = wordMap.get(word);
            entry.frequency++;
            entry.forms.add(word);
          }
        });

        console.log('Significant words:', significantWords);
        console.log('Unique normalized words:', wordMap.size);

        return {
          words: significantWords,
          wordMap
        };
      }

      // Process main text
      console.log('Processing main text:', text.length, 'characters');
      const mainTextResult = processText(text);
      const totalWords = mainTextResult.words;
      const wordMap = mainTextResult.wordMap;

      // Process competitor texts
      console.log('Processing competitor texts...');
      const competitorResults = competitorTexts.map((text, index) => {
        console.log(\`Processing competitor \${index + 1}:, \${text.length} characters\`);
        const result = processText(text);
        console.log(\`Competitor \${index + 1} processed: \${result.words} words, \${result.wordMap.size} unique words\`);
        return {
          words: result.wordMap,
          total: result.words
        };
      });

      // Calculate metrics for significant words
      const results = [];
      
      for (const [word, data] of wordMap.entries()) {
        // Skip if word is a stop word
        if (isStopWord(word)) {
          console.log('Skipping stop word:', word);
          continue;
        }

        // Calculate our metrics
        const frequency = data.frequency;
        const density = (frequency / totalWords) * 100;
        
        // Calculate competitor metrics
        const competitorMetrics = competitorResults.map(comp => {
          const compData = comp.words.get(word);
          if (!compData) return { frequency: 0, density: 0 };
          
          return {
            frequency: compData.frequency,
            density: (compData.frequency / comp.total) * 100
          };
        });
        
        // Calculate averages
        const avgDensity = competitorMetrics.reduce((sum, m) => sum + m.density, 0) / 
          Math.max(1, competitorMetrics.length);
          
        const competitorsWithWord = competitorMetrics.filter(m => m.frequency > 0).length;
        
        results.push({
          keyword: word,
          forms: Array.from(data.forms),
          frequency,
          density,
          avgDensity,
          densityRatio: avgDensity > 0 ? density / avgDensity : 0,
          competitorsCount: competitorsWithWord,
          totalFrequency: competitorMetrics.reduce((sum, m) => sum + m.frequency, 0)
        });
      }

      // Sort by importance
      results.sort((a, b) => {
        const aScore = a.frequency * (a.competitorsCount + 1);
        const bScore = b.frequency * (b.competitorsCount + 1);
        return bScore - aScore;
      });

      // Log results for debugging
      console.log('Analysis completed:', {
        totalWords,
        uniqueWords: results.length,
        sampleResults: results.slice(0, 5).map(r => ({
          keyword: r.keyword,
          forms: r.forms,
          frequency: r.frequency,
          density: r.density.toFixed(2) + '%'
        }))
      });

      // Send results
      self.postMessage({
        type: 'complete',
        results
      });
    } catch (error) {
      console.error('Worker error:', error);
      self.postMessage({
        type: 'error',
        error: error.message
      });
    }
  };
`;

// Create blob URL for worker
const blob = new Blob([workerCode], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(blob);

// Create worker pool
const MAX_WORKERS = 4;
const workers = new Array(MAX_WORKERS).fill(null).map(() => new Worker(workerUrl));

// Queue for analysis tasks
const taskQueue = [];
let activeWorkers = 0;

// Process next task in queue
function processNextTask() {
  if (taskQueue.length === 0 || activeWorkers >= MAX_WORKERS) return;
  
  const task = taskQueue.shift();
  const worker = workers[activeWorkers++];
  
  worker.onmessage = (e) => {
    if (e.data.type === 'progress') {
      task.onProgress?.(e.data.progress);
    } else if (e.data.type === 'complete') {
      console.log('Worker completed analysis:', e.data.results);
      task.resolve(e.data.results);
      activeWorkers--;
      processNextTask();
    } else if (e.data.type === 'error') {
      console.error('Worker error:', e.data.error);
      task.reject(new Error(e.data.error));
      activeWorkers--;
      processNextTask();
    }
  };
  
  worker.postMessage(task.data);
}

// Queue analysis task
function queueAnalysis(text: string, competitorTexts: string[], onProgress?: (progress: number) => void) {
  return new Promise((resolve, reject) => {
    taskQueue.push({
      data: { text, competitorTexts },
      resolve,
      reject,
      onProgress
    });
    processNextTask();
  });
}

export async function analyzeKeywords(
  targetText: string,
  competitorTexts: string[] = [],
  onProgress?: (progress: number) => void
): Promise<any[]> {
  try {
    if (!targetText?.trim()) {
      console.warn('No valid target text provided');
      return [];
    }

    console.log('Starting keyword analysis:', {
      targetTextLength: targetText.length,
      competitorTexts: competitorTexts.map(t => t.length)
    });

    // Process text with worker
    const results = await queueAnalysis(targetText, competitorTexts, onProgress);
    console.log('Analysis completed:', results);

    return results;
  } catch (error) {
    console.error('Error in keyword analysis:', error);
    return [];
  }
}

// Cleanup workers when done
window.addEventListener('unload', () => {
  workers.forEach(worker => worker.terminate());
  URL.revokeObjectURL(workerUrl);
});