// Text Analysis Types
export interface TextAnalysisScore {
  score: number;
  details: string[];
}

export interface TextAnalysisResult {
  tfIdf: TextAnalysisScore;
  lsa: TextAnalysisScore;
  bert: TextAnalysisScore;
  readability: TextAnalysisScore;
  totalScore: number;
  recommendations: string[];
}

export interface KeywordAnalysis {
  keyword: string;
  frequency: number;
  importance: number;
  context: string[];
  isTarget?: boolean;
  density?: number;
  distribution?: number;
}

export interface ReadabilityMetrics {
  fleschKincaid: number;
  averageSentenceLength: number;
  complexWords: string[];
  suggestions: string[];
}