import { KeywordAnalysis } from '../interfaces/analysis';

interface BertEmbedding {
  vector: number[];
  token: string;
}

interface BertAnalysisResult {
  score: number;
  details: string[];
}

// Simulated BERT embeddings for common words
// In a real implementation, this would come from a BERT model
const mockEmbeddings = new Map<string, number[]>();

// Initialize mock embeddings with random vectors
function initializeMockEmbeddings(words: string[]) {
  words.forEach(word => {
    // Create a 768-dimensional vector (typical BERT embedding size)
    const vector = Array.from({ length: 768 }, () => Math.random() * 2 - 1);
    mockEmbeddings.set(word.toLowerCase(), vector);
  });
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}

// Get BERT embedding for a word
function getWordEmbedding(word: string): number[] {
  const lowercaseWord = word.toLowerCase();
  if (!mockEmbeddings.has(lowercaseWord)) {
    // Generate random embedding for unknown words
    const vector = Array.from({ length: 768 }, () => Math.random() * 2 - 1);
    mockEmbeddings.set(lowercaseWord, vector);
  }
  return mockEmbeddings.get(lowercaseWord)!;
}

// Get sentence embedding by averaging word embeddings
function getSentenceEmbedding(text: string): number[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return Array(768).fill(0);

  const embeddings = words.map(getWordEmbedding);
  const sumVector = embeddings.reduce((sum, vec) => 
    sum.map((val, i) => val + vec[i]),
    Array(768).fill(0)
  );

  return sumVector.map(val => val / words.length);
}

// Analyze semantic similarity using BERT embeddings
export async function analyzeBertSimilarity(
  targetText: string,
  competitorTexts: string[]
): Promise<BertAnalysisResult> {
  try {
    // Initialize embeddings with some common words
    if (mockEmbeddings.size === 0) {
      initializeMockEmbeddings([
        'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
        'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at'
      ]);
    }

    // Get embeddings for target and competitor texts
    const targetEmbedding = getSentenceEmbedding(targetText);
    const competitorEmbeddings = competitorTexts.map(getSentenceEmbedding);

    // Calculate average similarity with competitors
    const similarities = competitorEmbeddings.map(embedding =>
      cosineSimilarity(targetEmbedding, embedding)
    );

    const avgSimilarity = similarities.reduce((sum, val) => sum + val, 0) / similarities.length;
    const score = Math.round(avgSimilarity * 100);

    // Generate analysis details
    const details: string[] = [];

    if (score < 50) {
      details.push('Content shows significant semantic differences from competitors');
      details.push('Consider incorporating more industry-specific terminology');
    } else if (score < 75) {
      details.push('Content shows moderate semantic alignment with competitors');
      details.push('Some room for improvement in topic coverage');
    } else {
      details.push('Strong semantic alignment with competitor content');
      details.push('Good coverage of industry-relevant concepts');
    }

    // Add specific similarity insights
    const maxSimilarity = Math.max(...similarities);
    const minSimilarity = Math.min(...similarities);
    
    if (maxSimilarity - minSimilarity > 0.3) {
      details.push('Significant variation in content similarity across competitors');
    }

    if (score > 90) {
      details.push('Warning: Content might be too similar to competitors');
    }

    return {
      score,
      details
    };
  } catch (error) {
    console.error('Error in BERT analysis:', error);
    throw new Error('Failed to perform BERT analysis');
  }
}

// Analyze keywords using BERT embeddings
export async function analyzeBertKeywords(
  text: string,
  keywords: KeywordAnalysis[]
): Promise<KeywordAnalysis[]> {
  try {
    const textEmbedding = getSentenceEmbedding(text);
    
    return keywords.map(keyword => {
      const keywordEmbedding = getSentenceEmbedding(keyword.keyword);
      const similarity = cosineSimilarity(textEmbedding, keywordEmbedding);
      
      return {
        ...keyword,
        importance: Math.max(keyword.importance, similarity)
      };
    });
  } catch (error) {
    console.error('Error in BERT keyword analysis:', error);
    return keywords;
  }
}