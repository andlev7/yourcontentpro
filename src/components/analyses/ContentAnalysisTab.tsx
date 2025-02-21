import { useState, useEffect, useCallback } from 'react';
import { Save, X, Edit2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { supabaseClient } from '../../lib/supabase';
import { extractHeaders } from '../../lib/header-extractor';

// Helper function to count words in text
function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

// Helper function to calculate total word count
function calculateTotalWordCount(content: any): number {
  let totalWords = 0;
  
  // Count words in headers
  if (content.headers) {
    Object.values(content.headers).forEach((headers: any) => {
      if (Array.isArray(headers)) {
        headers.forEach(text => {
          totalWords += countWords(text);
        });
      }
    });
  }
  
  // Count words in texts
  if (Array.isArray(content.texts)) {
    content.texts.forEach(text => {
      totalWords += countWords(text);
    });
  }
  
  return totalWords;
}

interface EditableCellProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isHeader?: boolean;
}

interface ContentAnalysisTabProps {
  analysisId: string;
  contentAnalysis: any;
  onRefresh?: () => Promise<void>;
}

function EditableCell({ value, onChange, onSave, onCancel, isHeader }: EditableCellProps) {
  return (
    <div className="h-[200px] flex flex-col">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-none"
        placeholder={isHeader ? "Enter headers (one per line, format: H1: text)" : "Enter text content"}
      />
      <div className="flex justify-end gap-2 mt-2">
        <button
          onClick={onCancel}
          className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <X className="h-4 w-4" />
        </button>
        <button
          onClick={onSave}
          className="px-2 py-1 text-sm text-green-600 hover:text-green-900"
        >
          <Save className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

async function fetchAnalysisWithRetry(analysisId: string, maxRetries = 3): Promise<any> {
  let lastError;
  for (let retry = 0; retry < maxRetries; retry++) {
    try {
      const { data, error } = await supabaseClient
        .from("analyses")
        .select("*")
        .eq("id", analysisId)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      lastError = err;
      console.warn(`Attempt ${retry + 1} failed:`, err);
      if (retry < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1)));
      }
    }
  }
  throw lastError;
}

export default function ContentAnalysisTab({ analysisId, contentAnalysis, onRefresh }: ContentAnalysisTabProps) {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingKeywords, setEditingKeywords] = useState(false);
  const [keywordsValue, setKeywordsValue] = useState("");
  const [showAllKeywords, setShowAllKeywords] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentContentAnalysis, setCurrentContentAnalysis] = useState(contentAnalysis);

  useEffect(() => {
    setCurrentContentAnalysis(contentAnalysis);
  }, [contentAnalysis]);

  useEffect(() => {
    let isMounted = true;

    const loadAnalysis = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchAnalysisWithRetry(analysisId);
        if (isMounted) {
          setAnalysis(data);
          if (data?.additional_keywords) {
            setKeywordsValue(data.additional_keywords.join('\n'));
          }
          if (data?.content_analysis?.selectedDomains) {
            setSelectedDomains(data.content_analysis.selectedDomains);
          } else if (data?.content_analysis) {
            const allDomains = ['our'];
            if (data.content_analysis.competitors) {
              data.content_analysis.competitors.forEach((comp: any) => {
                if (comp?.domain) allDomains.push(comp.domain);
              });
            }
            setSelectedDomains(allDomains);
          }
        }
      } catch (err) {
        console.error("Error loading analysis:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load analysis");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadAnalysis();

    return () => {
      isMounted = false;
    };
  }, [analysisId]);

  const handleSave = async () => {
    if (!editingCell) return;
    
    setIsSaving(true);
    try {
      const [domain, type] = editingCell.split('|');
      console.log('Saving content for:', { domain, type });

      const updatedAnalysis = { ...currentContentAnalysis };
      console.log('Current analysis state:', updatedAnalysis);

      if (domain === 'our') {
        if (type === 'headers') {
          const headers = extractHeaders(editValue);
          const groupedHeaders = headers.reduce((acc: any, { level, text }) => {
            if (!acc[level]) acc[level] = [];
            acc[level].push(text);
            return acc;
          }, {});
          updatedAnalysis.our_domain.headers = groupedHeaders;
          // Recalculate word count including both headers and texts
          updatedAnalysis.our_domain.word_count = calculateTotalWordCount(updatedAnalysis.our_domain);
        } else {
          updatedAnalysis.our_domain.texts = editValue.split('\n\n').filter(Boolean);
          // Recalculate word count including both headers and texts
          updatedAnalysis.our_domain.word_count = calculateTotalWordCount(updatedAnalysis.our_domain);
        }
      } else {
        const competitor = updatedAnalysis.competitors.find((c: any) => c && c.domain === domain);
        if (!competitor) {
          console.error('Competitor not found:', domain);
          console.log('Available competitors:', updatedAnalysis.competitors.map((c: any) => c?.domain));
          throw new Error(`Competitor ${domain} not found`);
        }

        const competitorIndex = updatedAnalysis.competitors.indexOf(competitor);
        
        if (type === 'headers') {
          const headers = extractHeaders(editValue);
          const groupedHeaders = headers.reduce((acc: any, { level, text }) => {
            if (!acc[level]) acc[level] = [];
            acc[level].push(text);
            return acc;
          }, {});
          updatedAnalysis.competitors[competitorIndex].headers = groupedHeaders;
          // Recalculate word count including both headers and texts
          updatedAnalysis.competitors[competitorIndex].word_count = calculateTotalWordCount(updatedAnalysis.competitors[competitorIndex]);
        } else {
          const texts = editValue.split('\n\n').filter(Boolean);
          
          console.log('Updating competitor content:', {
            domain,
            index: competitorIndex,
            textsCount: texts.length
          });
          
          updatedAnalysis.competitors[competitorIndex] = {
            ...competitor,
            texts,
            // Recalculate word count including both headers and texts
            word_count: calculateTotalWordCount({
              headers: competitor.headers,
              texts
            })
          };
        }
      }

      console.log('Saving updated analysis:', updatedAnalysis);

      const { error: updateError } = await supabaseClient
        .from('analyses')
        .update({ 
          content_analysis: updatedAnalysis,
          updated_at: new Date().toISOString()
        })
        .eq('id', analysisId);

      if (updateError) throw updateError;

      setCurrentContentAnalysis(updatedAnalysis);
      setEditingCell(null);
      setEditValue("");
      setError(null);

      // Show success message
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg z-50';
      successMessage.textContent = 'Content saved successfully!';
      document.body.appendChild(successMessage);
      setTimeout(() => successMessage.remove(), 3000);

    } catch (err) {
      console.error('Error saving content:', err);
      setError(err instanceof Error ? err.message : 'Failed to save content');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (domain: string, type: 'headers' | 'texts') => {
    console.log('Starting edit for:', { domain, type });
    
    const content = domain === 'our' ? currentContentAnalysis.our_domain : 
      currentContentAnalysis.competitors.find((c: any) => c && c.domain === domain);
    
    if (!content) {
      console.error('Content not found for domain:', domain);
      return;
    }

    let value = '';
    if (type === 'headers') {
      value = Object.entries(content.headers || {})
        .flatMap(([level, headers]: [string, any]) => 
          Array.isArray(headers) ? headers.map(text => `${level.toUpperCase()}: ${text}`) : [])
        .join('\n');
    } else {
      value = Array.isArray(content.texts) ? content.texts.join('\n\n') : '';
    }

    console.log('Setting edit value:', { value });
    setEditValue(value);
    setEditingCell(`${domain}|${type}`);
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    
    setIsRefreshing(true);
    setError(null);
    
    try {
      await onRefresh();
    } catch (err) {
      console.error('Error refreshing analysis:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh analysis');
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderCell = (domain: string, type: 'headers' | 'texts', content: any) => {
    if (!content) return null;
    
    const cellId = `${domain}|${type}`;
    
    if (editingCell === cellId) {
      return (
        <EditableCell
          value={editValue}
          onChange={setEditValue}
          onSave={handleSave}
          onCancel={() => {
            setEditingCell(null);
            setEditValue("");
          }}
          isHeader={type === 'headers'}
        />
      );
    }

    if (type === 'headers') {
      return (
        <div 
          className="h-[200px] overflow-y-auto p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
          onClick={() => handleStartEdit(domain, type)}
        >
          {Object.entries(content.headers || {}).map(([level, headers]: [string, any]) => (
            <div key={level} className="mb-2">
              {Array.isArray(headers) && headers.map((text: string, i: number) => (
                <div key={`${level}-${i}`} className="text-sm">
                  <span className="font-medium">{level.toUpperCase()}:</span> {text}
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div 
        className="h-[200px] overflow-y-auto p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
        onClick={() => handleStartEdit(domain, type)}
      >
        <div className="text-sm space-y-2">
          {Array.isArray(content.texts) && content.texts.map((text: string, i: number) => (
            <p key={`${domain}-text-${i}`}>{text}</p>
          ))}
        </div>
      </div>
    );
  };

  const toggleDomain = async (domain: string) => {
    setIsSaving(true);
    const newSelectedDomains = selectedDomains.includes(domain)
      ? selectedDomains.filter(d => d !== domain)
      : [...selectedDomains, domain];
    
    try {
      const updatedAnalysis = {
        ...currentContentAnalysis,
        selectedDomains: newSelectedDomains
      };

      const { error: updateError } = await supabaseClient
        .from('analyses')
        .update({ 
          content_analysis: updatedAnalysis,
          updated_at: new Date().toISOString()
        })
        .eq('id', analysisId);

      if (updateError) throw updateError;

      setSelectedDomains(newSelectedDomains);
      setCurrentContentAnalysis(updatedAnalysis);

    } catch (err) {
      console.error('Error saving domain selection:', err);
      setError(err instanceof Error ? err.message : 'Failed to save domain selection');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveKeywords = async () => {
    try {
      const keywords = keywordsValue
        .split('\n')
        .map(k => k.trim())
        .filter(Boolean);

      const { error: updateError } = await supabaseClient
        .from('analyses')
        .update({ additional_keywords: keywords })
        .eq('id', analysisId);

      if (updateError) throw updateError;

      setEditingKeywords(false);
      setAnalysis({ ...analysis, additional_keywords: keywords });
    } catch (err) {
      console.error('Error saving keywords:', err);
      setError(err instanceof Error ? err.message : 'Failed to save keywords');
    }
  };

  const renderKeywords = (keywords: string[]) => {
    if (!keywords?.length) return null;

    const KEYWORDS_PER_ROW = 5;
    const INITIAL_ROWS = 2;
    const initialDisplay = KEYWORDS_PER_ROW * INITIAL_ROWS;
    
    const displayedKeywords = showAllKeywords ? keywords : keywords.slice(0, initialDisplay);
    const hasMore = keywords.length > initialDisplay;

    return (
      <>
        <div className="flex flex-wrap gap-2">
          {displayedKeywords.map((keyword: string, index: number) => (
            <span
              key={index}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {keyword}
            </span>
          ))}
        </div>
        {hasMore && (
          <button
            onClick={() => setShowAllKeywords(!showAllKeywords)}
            className="mt-2 flex items-center text-sm text-indigo-600 hover:text-indigo-900"
          >
            {showAllKeywords ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show More ({keywords.length - initialDisplay} more)
              </>
            )}
          </button>
        )}
      </>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!currentContentAnalysis) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No content analysis available. Run the analysis first.</p>
      </div>
    );
  }

  const competitors = currentContentAnalysis.competitors || [];
  const ourDomain = currentContentAnalysis.our_domain || { 
    headers: { h1: [], h2: [], h3: [], h4: [] }, 
    texts: [],
    word_count: 0 
  };

  const selectedCompetitors = competitors.filter((comp: any) => 
    comp && comp.domain && selectedDomains.includes(comp.domain)
  );

  const ourWordCount = selectedDomains.includes('our') ? (ourDomain.word_count || 0) : 0;

  const avgWordCount = selectedCompetitors.length > 0
    ? Math.round(selectedCompetitors.reduce((sum: number, comp: any) => sum + (comp.word_count || 0), 0) / selectedCompetitors.length)
    : 0;

  const maxWordCount = selectedCompetitors.length > 0
    ? Math.max(...selectedCompetitors.map((comp: any) => comp.word_count || 0))
    : 0;

  const ourHeaderCounts = {
    h2: ourDomain.headers?.h2?.length || 0,
    h3: ourDomain.headers?.h3?.length || 0,
    h4: ourDomain.headers?.h4?.length || 0
  };

  const avgHeaderCounts = {
    h2: selectedCompetitors.length > 0
      ? Math.round(selectedCompetitors.reduce((sum, comp) => sum + (comp.headers?.h2?.length || 0), 0) / selectedCompetitors.length)
      : 0,
    h3: selectedCompetitors.length > 0
      ? Math.round(selectedCompetitors.reduce((sum, comp) => sum + (comp.headers?.h3?.length || 0), 0) / selectedCompetitors.length)
      : 0,
    h4: selectedCompetitors.length > 0
      ? Math.round(selectedCompetitors.reduce((sum, comp) => sum + (comp.headers?.h4?.length || 0), 0) / selectedCompetitors.length)
      : 0
  };

  const maxHeaderCounts = {
    h2: selectedCompetitors.length > 0
      ? Math.max(...selectedCompetitors.map(comp => comp.headers?.h2?.length || 0))
      : 0,
    h3: selectedCompetitors.length > 0
      ? Math.max(...selectedCompetitors.map(comp => comp.headers?.h3?.length || 0))
      : 0,
    h4: selectedCompetitors.length > 0
      ? Math.max(...selectedCompetitors.map(comp => comp.headers?.h4?.length || 0))
      : 0
  };

  return (
    <div>
      {error && (
        <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Content Analysis</h2>
        {onRefresh && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Analysis'}
          </button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Our Word Count</h3>
          <p className="text-2xl font-bold text-blue-600">{ourWordCount}</p>
          <p className="text-xs text-gray-500 mt-1">Current content length</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Average Word Count</h3>
          <p className="text-2xl font-bold text-indigo-600">{avgWordCount}</p>
          <p className="text-xs text-gray-500 mt-1">Across selected competitors</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Max Word Count</h3>
          <p className="text-2xl font-bold text-green-600">{maxWordCount}</p>
          <p className="text-xs text-gray-500 mt-1">Highest among selected</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Headers count</h3>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="font-medium">H2:</span>{' '}
              <span className="text-blue-600">{ourHeaderCounts.h2}</span>
              <span className="text-gray-400">/</span>
              <span className="text-indigo-600">{avgHeaderCounts.h2}</span>
              <span className="text-gray-400">/</span>
              <span className="text-green-600">{maxHeaderCounts.h2}</span>
            </p>
            <p className="text-sm">
              <span className="font-medium">H3:</span>{' '}
              <span className="text-blue-600">{ourHeaderCounts.h3}</span>
              <span className="text-gray-400">/</span>
              <span className="text-indigo-600">{avgHeaderCounts.h3}</span>
              <span className="text-gray-400">/</span>
              <span className="text-green-600">{maxHeaderCounts.h3}</span>
            </p>
            <p className="text-sm">
              <span className="font-medium">H4:</span>{' '}
              <span className="text-blue-600">{ourHeaderCounts.h4}</span>
              <span className="text-gray-400">/</span>
              <span className="text-indigo-600">{avgHeaderCounts.h4}</span>
              <span className="text-gray-400">/</span>
              <span className="text-green-600">{maxHeaderCounts.h4}</span>
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-2">OUR/AVG/MAX</p>
        </div>
      </div>

      {analysis?.additional_keywords && (
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-900">Additional Keywords</h3>
            <button
              onClick={() => setEditingKeywords(!editingKeywords)}
              className="text-sm text-indigo-600 hover:text-indigo-900 flex items-center"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              {editingKeywords ? 'Cancel' : 'Edit'}
            </button>
          </div>
          {editingKeywords ? (
            <div className="space-y-2">
              <textarea
                value={keywordsValue}
                onChange={(e) => setKeywordsValue(e.target.value)}
                className="w-full h-24 p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="Enter keywords (one per line)"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSaveKeywords}
                  className="px-3 py-1 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  Save Keywords
                </button>
              </div>
            </div>
          ) : (
            renderKeywords(analysis.additional_keywords)
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-[200px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Domain
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Headers
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Text Content
              </th>
              <th className="w-[100px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Words Count
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <tr>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedDomains.includes('our')}
                    onChange={() => toggleDomain('our')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-2"
                  />
                  <span className="text-sm font-medium text-gray-900">Our Content</span>
                </div>
              </td>
              <td className="px-6 py-4">
                {renderCell('our', 'headers', ourDomain)}
              </td>
              <td className="px-6 py-4">
                {renderCell('our', 'texts', ourDomain)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {ourDomain.word_count || 0}
              </td>
            </tr>
            {competitors.map((competitor: any, index: number) => (
              competitor && competitor.domain ? (
                <tr key={`${competitor.domain}-${index}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedDomains.includes(competitor.domain)}
                        onChange={() => toggleDomain(competitor.domain)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-2"
                      />
                      <a
                        href={competitor.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {competitor.domain}
                      </a>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {renderCell(competitor.domain, 'headers', competitor)}
                  </td>
                  <td className="px-6 py-4">
                    {renderCell(competitor.domain, 'texts', competitor)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {competitor.word_count || 0}
                  </td>
                </tr>
              ) : null
            ))}
          </tbody>
        </table>
      </div>

      {isSaving && (
        <div className="fixed bottom-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-md shadow-lg">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Saving changes...</span>
          </div>
        </div>
      )}
    </div>
  );
}