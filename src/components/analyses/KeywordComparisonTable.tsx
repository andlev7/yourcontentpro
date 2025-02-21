import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { isStopWord } from '../../lib/stop-words';

interface Competitor {
  domain: string;
  url?: string;
  keywords: Array<{
    keyword: string;
    frequency: number;
    tfIdf?: number;
    density?: number;
    forms?: string[];
  }>;
}

interface KeywordComparisonTableProps {
  competitors: Competitor[];
  keywords: string[];
  additionalKeywords: Set<string>;
  keywordImportance?: Record<string, number>;
}

// Helper function to clean word forms
function cleanWordForms(forms: string[]): string[] {
  return forms
    .map(form => form
      .toLowerCase()
      .replace(/[.,!?;:()[\]{}«»""'']+/g, '') // Remove all punctuation
      .replace(/[.,]+$/, '') // Remove trailing dots and commas
      .trim()
    )
    .filter(Boolean)
    .filter((form, index, self) => self.indexOf(form) === index); // Remove duplicates
}

function calculateKeywordImportance(
  keyword: string,
  isAdditional: boolean,
  metrics: {
    competitorCount: number;
    totalCompetitors: number;
    avgDensity: number;
  }
): number {
  // Base score from competitor presence (0-5 points)
  const competitorPresenceScore = Math.round((metrics.competitorCount / metrics.totalCompetitors) * 5);

  // Density score (0-3 points)
  let densityScore = 0;
  if (metrics.avgDensity > 0) {
    if (metrics.avgDensity >= 0.5) {
      densityScore = 3; // High density among competitors
    } else if (metrics.avgDensity >= 0.2) {
      densityScore = 2; // Medium density
    } else {
      densityScore = 1; // Low but present
    }
  }

  // Target keyword bonus (0-2 points)
  const targetBonus = isAdditional ? 2 : 0;

  // Calculate final importance (0-10 scale)
  return Math.min(10, competitorPresenceScore + densityScore + targetBonus);
}

export function KeywordComparisonTable({ 
  competitors, 
  keywords,
  additionalKeywords,
  keywordImportance = {} 
}: KeywordComparisonTableProps) {
  const [page, setPage] = useState(0);
  const [itemsPerPage] = useState(50);
  const [sortField, setSortField] = useState<'competitors' | 'importance' | 'density'>('importance');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showAllKeywords, setShowAllKeywords] = useState(false);

  // Calculate keyword metrics first
  const keywordMetrics = useMemo(() => {
    console.log('Calculating keyword metrics...');
    console.log('Input data:', {
      competitorsCount: competitors.length,
      keywordsCount: keywords.length,
      additionalKeywordsCount: additionalKeywords.size
    });

    const metrics: Record<string, {
      density: number;
      avgDensity: number;
      densityRatio: number;
      competitorCount: number;
      totalFrequency: number;
      importance: number;
      forms: string[];
    }> = {};

    const totalCompetitors = competitors.filter(c => c.domain !== 'our').length;

    keywords.forEach(keyword => {
      // Find our content metrics
      const ourContent = competitors.find(c => c.domain === 'our');
      const ourKeyword = ourContent?.keywords.find(k => k.keyword === keyword);
      
      // Get all forms of the keyword and clean them
      const forms = ourKeyword?.forms || [keyword];
      const cleanedForms = cleanWordForms(forms);
      
      console.log('Processing keyword:', {
        keyword,
        formsCount: forms.length,
        cleanedFormsCount: cleanedForms.length
      });
      
      // Calculate competitor metrics
      const competitorData = competitors
        .filter(c => c.domain !== 'our')
        .map(comp => comp.keywords.find(k => k.keyword === keyword))
        .filter(Boolean);

      // Calculate average density from competitors
      const avgDensity = competitorData.reduce((sum, k) => sum + (k?.density || 0), 0) / 
        Math.max(1, competitorData.length);

      // Calculate density ratio (our density / avg competitor density)
      const ourDensity = ourKeyword?.density || 0;
      const densityRatio = avgDensity > 0 ? ourDensity / avgDensity : 0;

      // Calculate importance
      const isAdditional = additionalKeywords.has(keyword.toLowerCase());
      const importance = calculateKeywordImportance(
        keyword,
        isAdditional,
        {
          competitorCount: competitorData.filter(k => k && k.frequency > 0).length,
          totalCompetitors,
          avgDensity
        }
      );

      metrics[keyword] = {
        density: ourDensity,
        avgDensity,
        densityRatio,
        competitorCount: competitorData.filter(k => k && k.frequency > 0).length,
        totalFrequency: competitorData.reduce((sum, k) => sum + (k?.frequency || 0), 0),
        importance,
        forms: cleanedForms
      };
    });

    console.log('Metrics calculation completed');
    return metrics;
  }, [competitors, keywords, additionalKeywords]);

  // Then sort keywords using the calculated metrics
  const sortedKeywords = useMemo(() => {
    return [...keywords].sort((a, b) => {
      // First sort by additional keywords
      const aIsAdditional = additionalKeywords.has(a.toLowerCase());
      const bIsAdditional = additionalKeywords.has(b.toLowerCase());
      
      if (aIsAdditional && !bIsAdditional) return -1;
      if (!aIsAdditional && bIsAdditional) return 1;

      // Then sort by selected field
      if (sortField === 'competitors') {
        const aMetrics = keywordMetrics[a];
        const bMetrics = keywordMetrics[b];
        
        // First compare by number of competitors using the keyword
        const compCountDiff = bMetrics.competitorCount - aMetrics.competitorCount;
        if (compCountDiff !== 0) {
          return sortDirection === 'desc' ? compCountDiff : -compCountDiff;
        }
        
        // If same number of competitors, compare by total frequency
        return sortDirection === 'desc' 
          ? bMetrics.totalFrequency - aMetrics.totalFrequency
          : aMetrics.totalFrequency - bMetrics.totalFrequency;
      }
      
      if (sortField === 'importance') {
        return sortDirection === 'desc'
          ? keywordMetrics[b].importance - keywordMetrics[a].importance
          : keywordMetrics[a].importance - keywordMetrics[b].importance;
      }

      if (sortField === 'density') {
        return sortDirection === 'desc'
          ? keywordMetrics[b].densityRatio - keywordMetrics[a].densityRatio
          : keywordMetrics[a].densityRatio - keywordMetrics[b].densityRatio;
      }
      
      return 0;
    });
  }, [keywords, sortField, sortDirection, keywordMetrics, additionalKeywords]);

  // Get visible items for current page
  const visibleKeywords = useMemo(() => {
    const start = page * itemsPerPage;
    return sortedKeywords.slice(start, start + itemsPerPage);
  }, [sortedKeywords, page, itemsPerPage]);

  const handleSort = (field: 'competitors' | 'importance' | 'density') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Helper function to format ratio
  const formatRatio = (ratio: number) => {
    if (ratio === 0) return '-';
    return ratio.toFixed(2);
  };

  // Helper function to get ratio color
  const getRatioColor = (ratio: number) => {
    if (ratio === 0) return 'text-gray-400';
    if (ratio < 0.5) return 'text-red-600';
    if (ratio < 0.8) return 'text-yellow-600';
    if (ratio < 1.2) return 'text-green-600';
    return 'text-blue-600 font-bold';
  };

  // Helper function to get importance color
  const getImportanceColor = (importance: number) => {
    if (importance >= 8) return 'text-green-600 font-bold';
    if (importance >= 6) return 'text-green-600';
    if (importance >= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Helper function to get keyword background color
  const getKeywordBackground = (keyword: string, metrics: any) => {
    const importance = metrics.importance;
    const density = metrics.density;

    if (importance >= 5) {
      if (density > 0) {
        return 'bg-green-100';
      }
      return 'bg-red-100';
    }
    return '';
  };

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Keyword Distribution Analysis</h3>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48 bg-gray-50">
                <div className="relative h-[200px]">
                  <div 
                    className="absolute bottom-0 left-1/2 transform -rotate-60 origin-bottom-left whitespace-nowrap"
                    style={{ marginLeft: '-20px' }}
                  >
                    Keywords
                  </div>
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24 bg-gray-50 cursor-pointer"
                onClick={() => handleSort('importance')}
              >
                <div className="relative h-[200px]">
                  <div 
                    className="absolute bottom-0 left-1/2 transform -rotate-60 origin-bottom-left whitespace-nowrap flex items-center"
                    style={{ marginLeft: '-20px' }}
                  >
                    Importance
                    {sortField === 'importance' && (
                      sortDirection === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />
                    )}
                  </div>
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24 bg-gray-50 cursor-pointer"
                onClick={() => handleSort('competitors')}
              >
                <div className="relative h-[200px]">
                  <div 
                    className="absolute bottom-0 left-1/2 transform -rotate-60 origin-bottom-left whitespace-nowrap flex items-center"
                    style={{ marginLeft: '-20px' }}
                  >
                    Competitors
                    {sortField === 'competitors' && (
                      sortDirection === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />
                    )}
                  </div>
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24 bg-gray-50 cursor-pointer"
                onClick={() => handleSort('density')}
              >
                <div className="relative h-[200px]">
                  <div 
                    className="absolute bottom-0 left-1/2 transform -rotate-60 origin-bottom-left whitespace-nowrap flex items-center"
                    style={{ marginLeft: '-20px' }}
                  >
                    Density
                    {sortField === 'density' && (
                      sortDirection === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />
                    )}
                  </div>
                </div>
              </th>
              {competitors.map((competitor, index) => (
                <th 
                  key={index}
                  className="px-6 py-3 bg-gray-50 relative"
                  style={{ width: '100px', height: '200px' }}
                >
                  <div 
                    className="absolute text-xs font-medium text-gray-500 uppercase whitespace-nowrap"
                    style={{
                      bottom: '40px',
                      left: '50%',
                      width: 'max-content',
                      transformOrigin: 'left bottom',
                      transform: 'rotate(-60deg) translateX(-50%)',
                      textAlign: 'left'
                    }}
                  >
                    {competitor.url ? (
                      <a 
                        href={competitor.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {competitor.domain}
                      </a>
                    ) : competitor.domain}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {visibleKeywords.map((keyword, rowIndex) => {
              const metrics = keywordMetrics[keyword];
              return (
                <tr key={rowIndex} className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                  additionalKeywords.has(keyword.toLowerCase()) ? 'bg-blue-50' : ''
                }`}>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="flex items-center">
                        <span className={`text-sm rounded px-1 ${
                          additionalKeywords.has(keyword.toLowerCase()) 
                            ? 'font-semibold text-blue-700'
                            : 'text-gray-900'
                        } ${getKeywordBackground(keyword, metrics)}`}>
                          {keyword}
                        </span>
                        {additionalKeywords.has(keyword.toLowerCase()) && (
                          <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            Target
                          </span>
                        )}
                      </div>
                      {metrics.forms && metrics.forms.length > 1 && (
                        <div className="text-xs text-gray-500 mt-1">
                          Forms: {metrics.forms.join(', ')}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm font-medium">
                    <span className={`text-sm font-semibold ${getImportanceColor(metrics.importance)}`}>
                      {Math.round(metrics.importance)}
                    </span>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm">
                    <span className={`font-medium ${
                      metrics.competitorCount === 0 ? 'text-gray-400' :
                      metrics.competitorCount === 1 ? 'text-yellow-600' :
                      metrics.competitorCount >= 3 ? 'text-green-600 font-bold' :
                      'text-blue-600'
                    }`}>
                      {metrics.competitorCount}/{competitors.length - 1}
                    </span>
                    <span className="text-xs text-gray-500 ml-1">
                      ({metrics.totalFrequency})
                    </span>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm">
                    <div className="flex flex-col">
                      <span className={getRatioColor(metrics.densityRatio)}>
                        {formatRatio(metrics.densityRatio)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {metrics.density.toFixed(2)}% / {metrics.avgDensity.toFixed(2)}%
                      </span>
                    </div>
                  </td>
                  {competitors.map((competitor, colIndex) => {
                    const keywordData = competitor.keywords.find(k => k.keyword === keyword);
                    const frequency = keywordData ? keywordData.frequency : 0;
                    return (
                      <td 
                        key={colIndex}
                        className="px-6 py-3"
                      >
                        <div className="flex justify-center">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                            frequency === 0 ? 'bg-red-100 text-red-800' :
                            frequency <= 2 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {frequency}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {sortedKeywords.length > itemsPerPage && (
        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page + 1} of {Math.ceil(sortedKeywords.length / itemsPerPage)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={(page + 1) * itemsPerPage >= sortedKeywords.length}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}