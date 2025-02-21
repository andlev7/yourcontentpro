import { FileText, Brain, Users } from 'lucide-react';

interface RightSidebarProps {
  activeTab: 'keywords' | 'recommendations' | 'competitors';
  onTabChange: (tab: 'keywords' | 'recommendations' | 'competitors') => void;
}

export function RightSidebar({ activeTab, onTabChange }: RightSidebarProps) {
  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => onTabChange('keywords')}
            className={`flex-1 px-4 py-3 text-sm font-medium text-center ${
              activeTab === 'keywords'
                ? 'border-b-2 border-indigo-500 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Brain className="h-4 w-4 mx-auto mb-1" />
            Keywords
          </button>
          <button
            onClick={() => onTabChange('recommendations')}
            className={`flex-1 px-4 py-3 text-sm font-medium text-center ${
              activeTab === 'recommendations'
                ? 'border-b-2 border-indigo-500 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="h-4 w-4 mx-auto mb-1" />
            Recommendations
          </button>
          <button
            onClick={() => onTabChange('competitors')}
            className={`flex-1 px-4 py-3 text-sm font-medium text-center ${
              activeTab === 'competitors'
                ? 'border-b-2 border-indigo-500 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="h-4 w-4 mx-auto mb-1" />
            Competitors
          </button>
        </nav>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'keywords' && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Keywords</h3>
          </div>
        )}
        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Recommendations</h3>
          </div>
        )}
        {activeTab === 'competitors' && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Competitors</h3>
          </div>
        )}
      </div>
    </div>
  );
}