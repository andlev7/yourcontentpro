import { TextAnalysisScore } from '../interfaces/analysis';
import { analyzeBertSimilarity } from './bert-analysis';

// Helper function to validate and clean text
function validateAndCleanText(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return text.trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\p{L}\p{N}\s.,!?-]/gu, '') // Keep only letters, numbers, basic punctuation
    .trim();
}

// Helper function to validate document array
function validateDocuments(docs: string[]): string[] {
  if (!Array.isArray(docs)) {
    return [];
  }
  return docs.map(validateAndCleanText).filter(Boolean);
}

// Simple tokenization function
function tokenize(text: string): string[] {
  try {
    const validText = validateAndCleanText(text);
    if (!validText) return [];
    
    return validText
      .toLowerCase()
      .split(/[\s.,!?-]+/)
      .filter(word => word.length > 2);
  } catch (error) {
    console.error('Error in tokenization:', error);
    return [];
  }
}

// Create term frequency matrix
function createTermFrequencyMatrix(documents: string[]): Map<string, number[]> {
  try {
    const validDocs = validateDocuments(documents);
    if (validDocs.length === 0) return new Map();

    const termFrequencies = new Map<string, number[]>();
    
    validDocs.forEach((doc, docIndex) => {
      const tokens = tokenize(doc);
      tokens.forEach(term => {
        if (!termFrequencies.has(term)) {
          termFrequencies.set(term, new Array(validDocs.length).fill(0));
        }
        termFrequencies.get(term)![docIndex]++;
      });
    });

    return termFrequencies;
  } catch (error) {
    console.error('Error creating term frequency matrix:', error);
    return new Map();
  }
}

// Calculate TF-IDF scores
function calculateTfIdf(termFrequencies: Map<string, number[]>, docCount: number): Map<string, number[]> {
  const tfIdfScores = new Map<string, number[]>();

  termFrequencies.forEach((frequencies, term) => {
    const docsWithTerm = frequencies.filter(freq => freq > 0).length;
    if (docsWithTerm === 0) return;

    const idf = Math.log(docCount / docsWithTerm);
    const tfIdf = frequencies.map(freq => freq * idf);
    tfIdfScores.set(term, tfIdf);
  });

  return tfIdfScores;
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length || vec1.length === 0) return 0;

  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  const norm1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const norm2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));

  if (norm1 === 0 || norm2 === 0) return 0;
  return dotProduct / (norm1 * norm2);
}

// Perform semantic analysis
export async function performSemanticAnalysis(
  targetText: string,
  competitorTexts: string[]
): Promise<{ score: number; bertScore: number; details: string[] }> {
  try {
    const validTarget = validateAndCleanText(targetText);
    const validCompetitors = validateDocuments(competitorTexts);

    if (!validTarget || validCompetitors.length === 0) {
      return {
        score: 0,
        bertScore: 0,
        details: ['Insufficient content for analysis']
      };
    }

    // Calculate TF-IDF scores
    const allDocs = [validTarget, ...validCompetitors];
    const termFrequencies = createTermFrequencyMatrix(allDocs);
    const tfIdfScores = calculateTfIdf(termFrequencies, allDocs.length);

    // Create document vectors
    const docVectors: number[][] = Array(allDocs.length).fill(0).map(() => []);
    tfIdfScores.forEach((scores) => {
      scores.forEach((score, docIndex) => {
        docVectors[docIndex].push(score);
      });
    });

    // Calculate average similarity with competitors
    const targetVector = docVectors[0];
    const competitorVectors = docVectors.slice(1);
    const similarities = competitorVectors.map(vec => cosineSimilarity(targetVector, vec));
    const avgSimilarity = similarities.reduce((sum, val) => sum + val, 0) / similarities.length;

    // Calculate BERT score
    const bertResult = await analyzeBertSimilarity(validTarget, validCompetitors);
    
    // Combine scores
    const tfIdfScore = Math.round(avgSimilarity * 100);
    const bertScore = bertResult.score;
    const combinedScore = Math.round((tfIdfScore + bertScore) / 2);

    // Generate analysis details
    const details = [
      `TF-IDF Similarity Score: ${tfIdfScore}%`,
      `BERT Score: ${bertScore}%`,
      ...bertResult.details
    ];

    // Add recommendations based on scores
    if (combinedScore < 50) {
      details.push('Content shows significant differences from competitors');
      details.push('Consider incorporating more industry-specific terminology');
    } else if (combinedScore < 75) {
      details.push('Content shows moderate semantic alignment with competitors');
      details.push('Some room for improvement in topic coverage');
    } else {
      details.push('Strong semantic alignment with competitor content');
      if (combinedScore > 90) {
        details.push('Warning: Content might be too similar to competitors');
      }
    }

    return {
      score: combinedScore,
      bertScore: bertScore,
      details: details.filter(Boolean)
    };

  } catch (error) {
    console.error('Error in semantic analysis:', error);
    return {
      score: 0,
      bertScore: 0,
      details: ['Failed to perform semantic analysis']
    };
  }
}