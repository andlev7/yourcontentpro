import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactQuill, { UnprivilegedEditor } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { ArrowLeft, Save, Brain, FileText, Users, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabaseClient } from '../../lib/supabase';
import { LoadingScreen } from '../common/LoadingScreen';
import { performSemanticAnalysis } from '../../lib/semantic-analysis';
import { parseCompetitorContent } from '../../lib/content-parser';

// Define Quill formats and modules outside component to prevent re-renders
const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet',
  'link',
  'align',
  'clean'
];

const modules = {
  toolbar: {
    container: [
      [{ 'header': [1, 2, 3, 4, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link'],
      ['clean']
    ]
  }
};

// Helper function to format content from headers and texts
function formatContentFromAnalysis(analysis: any) {
  let formattedContent = '';
  
  // Format headers with "H1:", "H2:", etc. prefix
  if (analysis?.headers) {
    Object.entries(analysis.headers).forEach(([level, items]) => {
      items.forEach((text: string) => {
        formattedContent += `${level.toUpperCase()}: ${text}\n`;
      });
    });
  }

  // Add text content
  if (analysis?.texts) {
    analysis.texts.forEach((text: string) => {
      formattedContent += `${text}\n\n`;
    });
  }

  return formattedContent.trim();
}

// Helper function to parse content back to structured format
function parseContentToStructured(content: string) {
  const lines = content.split('\n');
  const headers: Record<string, string[]> = {
    h1: [],
    h2: [],
    h3: [],
    h4: []
  };
  const texts: string[] = [];
  let currentText = '';

  lines.forEach(line => {
    const headerMatch = line.match(/^(H[1-4]):\s*(.+)$/i);
    if (headerMatch) {
      // If we have accumulated text, add it to texts array
      if (currentText.trim()) {
        texts.push(currentText.trim());
        currentText = '';
      }
      const [, level, text] = headerMatch;
      const headerKey = level.toLowerCase() as keyof typeof headers;
      headers[headerKey].push(text.trim());
    } else if (line.trim()) {
      currentText += (currentText ? '\n' : '') + line;
    } else if (currentText.trim()) {
      texts.push(currentText.trim());
      currentText = '';
    }
  });

  // Add any remaining text
  if (currentText.trim()) {
    texts.push(currentText.trim());
  }

  return { headers, texts };
}

type Tab = 'keywords' | 'recommendations' | 'competitors';

interface Metrics {
  wordCount: {
    current: number;
    avg: number;
    max: number;
  };
  entityDensity: {
    current: number;
    avg: number;
    max: number;
  };
  headers: {
    h2: { current: number; avg: number; max: number };
    h3: { current: number; avg: number; max: number };
    h4: { current: number; avg: number; max: number };
  };
}

const defaultMetrics: Metrics = {
  wordCount: {
    current: 0,
    avg: 674,
    max: 1232
  },
  entityDensity: {
    current: 0,
    avg: 13,
    max: 15
  },
  headers: {
    h2: { current: 0, avg: 2, max: 3 },
    h3: { current: 0, avg: 4, max: 5 },
    h4: { current: 0, avg: 1, max: 2 }
  }
};

export function TextEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [uniquenessScore, setUniquenessScore] = useState<number>(0);
  const [isRefreshingUniqueness, setIsRefreshingUniqueness] = useState(false);
  const [competitorTexts, setCompetitorTexts] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('keywords');
  const [saving, setSaving] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [url, setUrl] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>(defaultMetrics);
  const [editor, setEditor] = useState<UnprivilegedEditor | null>(null);

  // Memoize uniqueness check function
  const checkUniqueness = useCallback(async (text: string, competitors: any[]) => {
    if (!text.trim() || competitors.length === 0) {
      return 0;
    }

    const compTexts = competitors.map(comp => {
      const headers = Object.values(comp.headers || {}).flat().join(' ');
      const texts = comp.texts?.join(' ') || '';
      return `${headers} ${texts}`;
    }).filter(Boolean);

    const analysis = await performSemanticAnalysis(text, compTexts);
    return Math.max(0, Math.min(100, 100 - analysis.score));
  }, []);

  // Load initial data
  useEffect(() => {
    const loadAnalysis = async () => {
      try {
        const { data, error } = await supabaseClient
          .from('analyses')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        setKeyword(data.keyword);
        if (data.url) setUrl(data.url);

        // Format content from analysis
        if (data?.content_analysis?.our_domain) {
          const formattedContent = formatContentFromAnalysis(data.content_analysis.our_domain);
          setContent(formattedContent);
        }

        // Set competitor texts
        if (data?.content_analysis?.competitors) {
          const texts = data.content_analysis.competitors
            .map((comp: any) => formatContentFromAnalysis(comp))
            .filter(Boolean);
          setCompetitorTexts(texts);

          // Check initial uniqueness
          const score = await checkUniqueness(content, data?.content_analysis?.competitors || []);
          setUniquenessScore(score);
        }

      } catch (err) {
        console.error('Error loading analysis:', err);
        setError(err instanceof Error ? err.message : 'Failed to load analysis');
      } finally {
        setLoading(false);
      }
    };

    loadAnalysis();
  }, [id, checkUniqueness]);

  // Update metrics when content changes
  const updateMetrics = useCallback(() => {
    if (!editor) return;
    
    const text = editor.getText();
    const words = text.split(/\s+/).filter(Boolean).length;

    const root = editor.root as HTMLElement;
    const h2Count = root.querySelectorAll('h2').length;
    const h3Count = root.querySelectorAll('h3').length;
    const h4Count = root.querySelectorAll('h4').length;

    setMetrics(current => ({
      ...current,
      wordCount: {
        ...current.wordCount,
        current: words
      },
      headers: {
        h2: { ...current.headers.h2, current: h2Count },
        h3: { ...current.headers.h3, current: h3Count },
        h4: { ...current.headers.h4, current: h4Count }
      }
    }));
  }, [editor]);

  // Handle content change
  const handleContentChange = useCallback((value: string, _delta: any, _source: any, editorInstance: UnprivilegedEditor) => {
    setContent(value);
    setEditor(editorInstance);
    updateMetrics();
  }, [updateMetrics]);

  // Handle save
  const handleSave = async () => {
    if (!content.trim()) return;

    setSaving(true);
    try {
      const { headers, texts } = parseContentToStructured(content);

      const { error } = await supabaseClient
        .from('analyses')
        .update({
          content_analysis: {
            our_domain: {
              headers,
              texts,
              word_count: content.split(/\s+/).filter(Boolean).length
            }
          }
        })
        .eq('id', id);

      if (error) throw error;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Handle URL parsing
  const handleParseContent = async () => {
    setIsParsing(true);
    setError(null);

    try {
      const parsedContent = await parseCompetitorContent(
        [{ domain: new URL(url).hostname, url }],
        null,
        () => {}
      );

      if (!parsedContent?.competitors?.[0]) {
        throw new Error('Failed to parse content from URL');
      }

      const formattedContent = formatContentFromAnalysis(parsedContent.competitors[0]);
      setContent(formattedContent);
    } catch (err) {
      console.error('Error parsing content:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse content');
    } finally {
      setIsParsing(false);
    }
  };

  // Handle uniqueness refresh
  const handleRefreshUniqueness = async () => {
    if (!editor) return;
    
    setIsRefreshingUniqueness(true);
    try {
      const text = editor.getText();
      const score = await checkUniqueness(text, competitorTexts);
      setUniquenessScore(score);
    } catch (err) {
      console.error('Error checking uniqueness:', err);
    } finally {
      setIsRefreshingUniqueness(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            {keyword}
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full border-4 border-gray-100 flex items-center justify-center mx-auto">
                <span className="text-3xl font-bold text-gray-700">{metrics.wordCount.current}</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">Word Count</p>
              <p className="text-xs text-gray-400">Normal Mode</p>
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

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Entity Density</span>
                <span className="text-sm text-gray-900">
                  {metrics.entityDensity.current}%/{metrics.entityDensity.avg}%/{metrics.entityDensity.max}%
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

          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Text Uniqueness:</span>
                <span className="text-sm font-semibold text-gray-900">{uniquenessScore}%</span>
              </div>
              <button
                onClick={handleRefreshUniqueness}
                disabled={isRefreshingUniqueness}
                className="p-1 hover:bg-gray-100 rounded-full disabled:opacity-50"
                title="Refresh uniqueness score"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshingUniqueness ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-gray-50">
          <div className="bg-white border-b border-gray-200 p-2">
            <div className="flex items-center space-x-4 mb-2">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Enter URL to parse content"
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    onClick={handleParseContent}
                    disabled={isParsing || !url.trim()}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {isParsing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Parsing...
                      </>
                    ) : (
                      'Parse Content'
                    )}
                  </button>
                </div>
                {error && (
                  <div className="mt-2 flex items-center text-sm text-red-600">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-lg">
              <div className="h-[calc(100vh-16rem)]">
                <ReactQuill
                  theme="snow"
                  value={content}
                  onChange={handleContentChange}
                  modules={modules}
                  formats={formats}
                  preserveWhitespace
                  className="h-full"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('keywords')}
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
                onClick={() => setActiveTab('recommendations')}
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
                onClick={() => setActiveTab('competitors')}
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
      </div>
    </div>
  );
}