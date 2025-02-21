import { supabaseClient } from './supabase';
import { KeywordAnalysis } from '../interfaces/analysis';

interface CachedAnalysis {
  keywords: KeywordAnalysis[];
  metrics: {
    avgWordCount: number;
    maxWordCount: number;
    avgKeywordDensity: number;
  };
  lastUpdated: string | null;
}

// Cache analysis results in memory for faster access
const memoryCache = new Map<string, {
  data: CachedAnalysis;
  timestamp: number;
}>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCachedAnalysis(analysisId: string): Promise<CachedAnalysis | null> {
  try {
    // Check memory cache first
    const cached = memoryCache.get(analysisId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    const { data, error } = await supabaseClient
      .from('analyses')
      .select('keyword_analysis, last_analysis_at')
      .eq('id', analysisId)
      .single();

    if (error) throw error;
    
    if (data?.keyword_analysis) {
      // Update memory cache
      memoryCache.set(analysisId, {
        data: data.keyword_analysis,
        timestamp: Date.now()
      });
    }
    
    return data?.keyword_analysis || null;
  } catch (error) {
    console.error('Error getting cached analysis:', error);
    return null;
  }
}

export async function updateCachedAnalysis(
  analysisId: string, 
  analysis: CachedAnalysis
): Promise<void> {
  try {
    // Update memory cache immediately
    memoryCache.set(analysisId, {
      data: analysis,
      timestamp: Date.now()
    });

    const { error } = await supabaseClient
      .from('analyses')
      .update({ 
        keyword_analysis: analysis,
        last_analysis_at: new Date().toISOString()
      })
      .eq('id', analysisId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating cached analysis:', error);
    throw error;
  }
}

// Clean up expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoryCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      memoryCache.delete(key);
    }
  }
}, CACHE_TTL);