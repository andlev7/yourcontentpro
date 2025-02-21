import { useState, useEffect, useCallback } from 'react';
import { Brain, AlertTriangle, CheckCircle2, XCircle, TrendingUp, RefreshCw, Save } from 'lucide-react';
import { analyzeKeywords } from '../../lib/text-analysis';
import { performSemanticAnalysis } from '../../lib/semantic-analysis';
import { KeywordAnalysis } from '../../interfaces/analysis';
import { KeywordComparisonTable } from './KeywordComparisonTable';
import { supabaseClient } from '../../lib/supabase';
import { getCachedAnalysis, updateCachedAnalysis } from '../../lib/analysis-cache';
import { normalizeText, isStopWord } from '../../lib/stop-words';

// Helper function to prepare keyword comparison data
function prepareKeywordComparisonData(contentAnalysis: any) {
  if (!contentAnalysis?.competitors) {
    console.log('No content analysis or competitors data');
    return { competitors: [], keywords: [], additionalKeywords: new Set() };
  }

  const selectedDomains = contentAnalysis.selectedDomains || [];
  const allKeywords = new Set<string>();
  const competitors = [];

  console.log('Preparing data with selected domains:', selectedDomains);

  // First, add additional keywords to the set
  const additionalKeywords = contentAnalysis.additional_keywords || [];
  additionalKeywords
    .map(keyword => normalizeText(keyword))
    .filter(Boolean)
    .forEach(keyword => allKeywords.add(keyword));

  // Process our content
  if (selectedDomains.includes('our') && contentAnalysis.our_domain) {
    console.log('Processing our content');
    const ourText = [
      ...Object.values(contentAnalysis.our_domain.headers || {}).flat(),
      ...(contentAnalysis.our_domain.texts || [])
    ].join(' ').trim();

    if (ourText) {
      const wordCounts = new Map<string, number>();
      const normalizedText = normalizeText(ourText);
      const words = normalizedText.split(/\s+/);
      const totalWords = words.length;

      words.forEach(word => {
        if (word && !isStopWord(word)) {
          allKeywords.add(word);
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
      });

      const ourKeywords = Array.from(wordCounts.entries())
        .filter(([keyword]) => !isStopWord(keyword))
        .map(([keyword, frequency]) => ({
          keyword,
          frequency,
          tfIdf: 0,
          density: (frequency / totalWords) * 100
        }));

      console.log('Our keywords:', ourKeywords.length);

      competitors.push({
        domain: 'our',
        url: contentAnalysis.our_domain.url || '',
        keywords: ourKeywords
      });
    }
  }

  // Process competitor content
  contentAnalysis.competitors
    ?.filter((comp: any) => comp?.domain && selectedDomains.includes(comp.domain))
    .forEach((comp: any) => {
      console.log('Processing competitor:', comp.domain);
      const text = [
        ...Object.values(comp.headers || {}).flat(),
        ...(comp.texts || [])
      ].join(' ').trim();

      if (!text) return;

      const normalizedText = normalizeText(text);
      const words = normalizedText.split(/\s+/);
      const totalWords = words.length;

      const wordCounts = new Map<string, number>();
      words.forEach(word => {
        if (word && !isStopWord(word)) {
          allKeywords.add(word);
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
      });

      const compKeywords = Array.from(wordCounts.entries())
        .filter(([keyword]) => !isStopWord(keyword))
        .map(([keyword, frequency]) => ({
          keyword,
          frequency,
          tfIdf: 0,
          density: (frequency / totalWords) * 100
        }));

      console.log(`Competitor ${comp.domain} keywords:`, compKeywords.length);

      competitors.push({
        domain: comp.domain,
        url: comp.url,
        keywords: compKeywords
      });
    });

  // Calculate keyword frequencies
  const keywordFrequencies = new Map<string, number>();
  competitors.forEach(comp => {
    comp.keywords.forEach(({ keyword, frequency }) => {
      if (!isStopWord(keyword)) {
        keywordFrequencies.set(
          keyword,
          (keywordFrequencies.get(keyword) || 0) + frequency
        );
      }
    });
  });

  // Sort keywords
  const sortedKeywords = Array.from(allKeywords)
    .filter(keyword => !isStopWord(keyword))
    .sort((a, b) => {
      const aIsAdditional = additionalKeywords.includes(a);
      const bIsAdditional = additionalKeywords.includes(b);
      
      if (aIsAdditional && !bIsAdditional) return -1;
      if (!aIsAdditional && bIsAdditional) return 1;
      
      return (keywordFrequencies.get(b) || 0) - (keywordFrequencies.get(a) || 0);
    });

  console.log('Final prepared data:', {
    competitors: competitors.length,
    keywords: sortedKeywords.length,
    additionalKeywords: additionalKeywords.length
  });

  return { 
    competitors, 
    keywords: sortedKeywords,
    additionalKeywords: new Set(
      additionalKeywords
        .map(k => normalizeText(k))
        .filter(k => !isStopWord(k))
    )
  };
}

export function TextAnalysisTab({ analysisId, contentAnalysis }: TextAnalysisTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [competitorMetrics, setCompetitorMetrics] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentContentAnalysis, setCurrentContentAnalysis] = useState(contentAnalysis);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastAnalyzedContent, setLastAnalyzedContent] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [tableKey, setTableKey] = useState(0);

  useEffect(() => {
    setCurrentContentAnalysis(contentAnalysis);
  }, [contentAnalysis]);

  const getContentHash = useCallback((content: any) => {
    if (!content) return '';
    
    const selectedDomains = content.selectedDomains || [];
    const ourContent = content.our_domain ? JSON.stringify(content.our_domain) : '';
    const competitors = content.competitors
      ?.filter((comp: any) => selectedDomains.includes(comp.domain))
      .map((comp: any) => JSON.stringify(comp))
      .join('');
    
    return `${ourContent}${competitors}${selectedDomains.join(',')}`;
  }, []);

  const analyzeContent = useCallback(async (forceRefresh = false) => {
    if (!currentContentAnalysis) {
      setAnalysisResult(null);
      setCompetitorMetrics([]);
      return;
    }

    try {
      setProgress(5);
      const contentHash = getContentHash(currentContentAnalysis);
      
      if (!forceRefresh && contentHash === lastAnalyzedContent) {
        console.log('Content unchanged, skipping analysis');
        return;
      }

      setProgress(10);
      
      // Always clear cache when forcing refresh
      if (forceRefresh) {
        console.log('Force refresh requested, clearing cache...');
        await updateCachedAnalysis(analysisId, null);
      }

      const cachedAnalysis = await getCachedAnalysis(analysisId);
      
      if (!forceRefresh && cachedAnalysis?.lastUpdated && 
          new Date().getTime() - new Date(cachedAnalysis.lastUpdated).getTime() < 3600000 &&
          contentHash === lastAnalyzedContent) {
        console.log('Using cached analysis');
        setAnalysisResult(cachedAnalysis);
        setProgress(100);
        setTableKey(prev => prev + 1);
        return;
      }

      setProgress(20);
      const selectedDomains = currentContentAnalysis.selectedDomains || [];
      const includeOurContent = selectedDomains.includes('our');

      let ourText = '';
      if (includeOurContent && currentContentAnalysis.our_domain) {
        const ourHeaders = Object.values(currentContentAnalysis.our_domain.headers || {})
          .flat()
          .join(' ');
        const ourParagraphs = currentContentAnalysis.our_domain.texts?.join(' ') || '';
        ourText = `${ourHeaders} ${ourParagraphs}`.trim();
      }

      console.log('Content for analysis:', {
        hasOurContent: ourText.length > 0,
        ourTextLength: ourText.length,
        selectedDomains
      });

      setProgress(30);
      const competitorTexts = currentContentAnalysis.competitors
        ?.filter(comp => comp?.domain && selectedDomains.includes(comp.domain))
        .map(comp => {
          const headers = Object.values(comp.headers || {}).flat().join(' ');
          const texts = comp.texts?.join(' ') || '';
          return {
            text: `${headers} ${texts}`.trim(),
            domain: comp.domain,
            url: comp.url
          };
        })
        .filter(comp => comp.text.length > 0) || [];

      console.log('Competitor texts prepared:', competitorTexts.map(c => ({
        domain: c.domain,
        textLength: c.text.length
      })));

      if (competitorTexts.length === 0 && !ourText) {
        setAnalysisResult(null);
        setCompetitorMetrics([]);
        setProgress(100);
        return;
      }

      const targetText = ourText || competitorTexts[0].text;
      const comparisonTexts = ourText 
        ? competitorTexts.map(c => c.text)
        : competitorTexts.slice(1).map(c => c.text);

      setProgress(40);

      // Process text analysis
      const [keywords, semanticAnalysis] = await Promise.all([
        analyzeKeywords(targetText, comparisonTexts, (p) => setProgress(40 + p * 0.4)),
        performSemanticAnalysis(targetText, comparisonTexts)
      ]);

      console.log('Analysis results:', {
        keywordsCount: keywords.length,
        semanticScore: semanticAnalysis.score
      });

      setProgress(90);

      const analysisResult = {
        keywords,
        metrics: {
          avgWordCount: Math.round(competitorTexts.reduce((sum, c) => sum + c.text.split(/\s+/).length, 0) / competitorTexts.length),
          maxWordCount: Math.max(...competitorTexts.map(c => c.text.split(/\s+/).length)),
          avgKeywordDensity: keywords.reduce((sum, k) => sum + (k.density || 0), 0) / keywords.length
        },
        lastUpdated: new Date().toISOString()
      };

      // Update cache with new results
      await updateCachedAnalysis(analysisId, analysisResult);
      
      setAnalysisResult(analysisResult);
      setLastAnalyzedContent(contentHash);
      setError(null);
      setProgress(100);
      setTableKey(prev => prev + 1);

      return analysisResult;

    } catch (err) {
      console.error('Error analyzing content:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze content');
      setProgress(0);
    }
  }, [currentContentAnalysis, getContentHash, lastAnalyzedContent, analysisId]);

  useEffect(() => {
    let mounted = true;

    const initializeAnalysis = async () => {
      if (!mounted) return;
      
      setLoading(true);
      await analyzeContent();
      if (mounted) {
        setLoading(false);
      }
    };

    initializeAnalysis();

    return () => {
      mounted = false;
    };
  }, [analyzeContent]);

  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    setError(null);
    setProgress(0);

    try {
      console.log('Starting refresh...');
      
      // Force clear cache
      await updateCachedAnalysis(analysisId, null);
      
      // Get fresh data from database
      const { data: analysis, error: fetchError } = await supabaseClient
        .from('analyses')
        .select('*')
        .eq('id', analysisId)
        .single();

      if (fetchError) throw fetchError;

      console.log('Fetched new analysis data:', analysis);
      
      // Update content analysis state
      setCurrentContentAnalysis(analysis?.content_analysis || null);
      
      // Force new analysis
      const results = await analyzeContent(true);
      
      // Save results immediately
      const updateData = {
        keyword_analysis: {
          ...results,
          lastUpdated: new Date().toISOString()
        },
        last_analysis_at: new Date().toISOString()
      };

      const { error: updateError } = await supabaseClient
        .from('analyses')
        .update(updateData)
        .eq('id', analysisId);

      if (updateError) throw updateError;

      // Force table rerender
      setTableKey(prev => prev + 1);
      
      console.log('Refresh completed with new results:', results);
      
    } catch (err) {
      console.error('Error refreshing analysis:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh analysis');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSave = async () => {
    if (!analysisResult || isSaving) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const contentHash = getContentHash(currentContentAnalysis);
      
      const updateData = {
        keyword_analysis: {
          ...analysisResult,
          contentHash,
          lastUpdated: new Date().toISOString()
        },
        last_analysis_at: new Date().toISOString()
      };

      console.log('Saving analysis data:', updateData);

      const { error: updateError } = await supabaseClient
        .from('analyses')
        .update(updateData)
        .eq('id', analysisId);

      if (updateError) throw updateError;

      await updateCachedAnalysis(analysisId, analysisResult);

      const successMessage = document.createElement('div');
      successMessage.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg z-50';
      successMessage.textContent = 'Analysis saved successfully!';
      document.body.appendChild(successMessage);
      setTimeout(() => successMessage.remove(), 3000);

    } catch (err) {
      console.error('Error saving analysis:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save analysis');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-48 space-y-4">
        <div className="w-64 bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-in-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-gray-600">
          {progress === 0 ? 'Preparing analysis...' :
           progress < 100 ? `Analyzing content... ${Math.round(progress)}%` :
           'Analysis complete!'}
        </p>
      </div>
    );
  }

  const { competitors, keywords, additionalKeywords } = prepareKeywordComparisonData(currentContentAnalysis);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Keyword Analysis</h2>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving || !analysisResult}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Analysis'}
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Analysis'}
          </button>
        </div>
      </div>

      {(error || saveError) && (
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-800">{error || saveError}</p>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <KeywordComparisonTable 
          key={tableKey}
          competitors={competitors}
          keywords={keywords}
          additionalKeywords={additionalKeywords}
          keywordImportance={
            analysisResult?.keywords.reduce((acc: any, k: any) => ({
              ...acc,
              [k.keyword]: k.importance
            }), {}) || {}
          }
        />
      </div>

      {isSaving && (
        <div className="fixed bottom-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-md shadow-lg">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Saving analysis results...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default TextAnalysisTab;