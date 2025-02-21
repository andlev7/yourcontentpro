import { Brain, RefreshCw } from 'lucide-react';
import { Metrics } from '../types';

interface LeftSidebarProps {
  metrics: Metrics;
  uniquenessScore: number;
  isRefreshingUniqueness: boolean;
  onRefreshUniqueness: () => void;
  onUpdateData?: () => void;
  isUpdatingData?: boolean;
}

export function LeftSidebar({ 
  metrics, 
  uniquenessScore, 
  isRefreshingUniqueness, 
  onRefreshUniqueness,
  onUpdateData,
  isUpdatingData = false
}: LeftSidebarProps) {
  // Calculate text score based on metrics
  const textScore = 0; // Placeholder for now

  // Get color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="text-center">
          <div className="w-24 h-24 rounded-full border-4 border-gray-100 flex items-center justify-center mx-auto">
            <span className={`text-3xl font-extrabold ${getScoreColor(textScore)}`}>
              {textScore}%
            </span>
          </div>
          <p className="mt-2 text-sm font-bold text-gray-700">Text Score</p>
        </div>
      </div>

      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Metrics (Current/Avg/Max)</h3>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Word Count</span>
            <span className="text-sm text-gray-900">
              {metrics.wordCount.current}/{metrics.wordCount.avg}/{metrics.wordCount.max}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">H2</span>
              <span className="text-sm text-gray-900">
                {metrics.headers.h2.current}/{metrics.headers.h2.avg}/{metrics.headers.h2.max}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">H3</span>
              <span className="text-sm text-gray-900">
                {metrics.headers.h3.current}/{metrics.headers.h3.avg}/{metrics.headers.h3.max}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">H4</span>
              <span className="text-sm text-gray-900">
                {metrics.headers.h4.current}/{metrics.headers.h4.avg}/{metrics.headers.h4.max}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Text Uniqueness:</span>
            <span className="text-sm font-semibold text-gray-900">{uniquenessScore}%</span>
          </div>
          <button
            onClick={onRefreshUniqueness}
            disabled={isRefreshingUniqueness}
            className="p-1 hover:bg-gray-100 rounded-full disabled:opacity-50"
            title="Refresh uniqueness score"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshingUniqueness ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <button
          onClick={onUpdateData}
          disabled={isUpdatingData}
          className="w-full flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isUpdatingData ? 'animate-spin' : ''}`} />
          {isUpdatingData ? 'Updating...' : 'Update Metrics'}
        </button>
      </div>
    </div>
  );
}