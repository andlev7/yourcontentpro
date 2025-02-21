import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Brain, FileText, Users, RefreshCw } from 'lucide-react';
import { supabaseClient } from '../../../lib/supabase';
import { Editor } from './components/Editor';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar } from './components/RightSidebar';
import { Metrics } from './types';
import { calculateEditorMetrics } from '../../../lib/editor-metrics';
import { parseUrlForEditor } from '../../../lib/editor-parser';

const defaultMetrics: Metrics = {
  wordCount: { current: 0, avg: 0, max: 0 },
  entityDensity: { current: 0, avg: 0, max: 0 },
  headers: {
    h2: { current: 0, avg: 0, max: 0 },
    h3: { current: 0, avg: 0, max: 0 },
    h4: { current: 0, avg: 0, max: 0 }
  }
};

export function TextEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [url, setUrl] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isUpdatingData, setIsUpdatingData] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>(defaultMetrics);
  const [uniquenessScore, setUniquenessScore] = useState<number>(0);
  const [isRefreshingUniqueness, setIsRefreshingUniqueness] = useState(false);
  const [activeTab, setActiveTab] = useState<'keywords' | 'recommendations' | 'competitors'>('keywords');
  const [isEditorEnabled, setIsEditorEnabled] = useState(true);

  // Load initial content and analysis
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
        if (data.editor_content) {
          console.log('Setting initial content:', data.editor_content.length);
          setContent(data.editor_content);
        }

      } catch (err) {
        console.error('Error loading analysis:', err);
        setError(err instanceof Error ? err.message : 'Failed to load analysis');
      }
    };

    loadAnalysis();
  }, [id]);

  // Update metrics when content changes
  const handleContentChange = useCallback((newContent: string) => {
    if (!isEditorEnabled) return;
    
    console.log('Content changed:', newContent.length);
    setContent(newContent);
    
    // Calculate current metrics
    const currentMetrics = calculateEditorMetrics(newContent);
    
    setMetrics(current => ({
      ...current,
      wordCount: {
        ...current.wordCount,
        current: currentMetrics.wordCount
      },
      headers: {
        h2: { ...current.headers.h2, current: currentMetrics.headers.h2 },
        h3: { ...current.headers.h3, current: currentMetrics.headers.h3 },
        h4: { ...current.headers.h4, current: currentMetrics.headers.h4 }
      }
    }));
  }, [isEditorEnabled]);

  // Handle manual metrics update
  const handleUpdateData = useCallback(async () => {
    if (!id) return;

    setIsUpdatingData(true);
    setError(null);

    try {
      const currentMetrics = calculateEditorMetrics(content);
      
      setMetrics(current => ({
        ...current,
        wordCount: {
          ...current.wordCount,
          current: currentMetrics.wordCount
        },
        headers: {
          h2: { ...current.headers.h2, current: currentMetrics.headers.h2 },
          h3: { ...current.headers.h3, current: currentMetrics.headers.h3 },
          h4: { ...current.headers.h4, current: currentMetrics.headers.h4 }
        }
      }));

      // Show success message
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg z-50';
      successMessage.textContent = 'Metrics updated successfully!';
      document.body.appendChild(successMessage);
      setTimeout(() => successMessage.remove(), 3000);

    } catch (err) {
      console.error('Error updating metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to update metrics');
    } finally {
      setIsUpdatingData(false);
    }
  }, [id, content]);

  // Save function
  const handleSave = async () => {
    if (!content.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabaseClient
        .from('analyses')
        .update({
          editor_content: content,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

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
      setSaving(false);
    }
  };

  // Handle URL parsing
  const handleParseContent = async () => {
    if (!url.trim()) return;

    setIsParsing(true);
    setError(null);
    setIsEditorEnabled(false); // Disable editor during parsing

    try {
      console.log('Starting content parsing...');
      const result = await parseUrlForEditor(url);
      console.log('Parsing completed, content length:', result.content.length);
      
      if (result.content) {
        // Save parsed content to database first
        const { error: updateError } = await supabaseClient
          .from('analyses')
          .update({
            editor_content: result.content,
            url: url,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (updateError) throw updateError;

        // Force update editor content
        console.log('Updating editor content:', result.content.length);
        setContent(''); // Clear first to force update
        setTimeout(() => {
          setContent(result.content);
          handleContentChange(result.content);
        }, 0);

      } else {
        throw new Error('No content returned from parser');
      }
    } catch (err) {
      console.error('Error parsing content:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse content');
    } finally {
      setIsParsing(false);
      setIsEditorEnabled(true); // Re-enable editor after parsing
    }
  };

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
        <LeftSidebar
          metrics={metrics}
          uniquenessScore={uniquenessScore}
          isRefreshingUniqueness={isRefreshingUniqueness}
          onRefreshUniqueness={() => {}}
          onUpdateData={handleUpdateData}
          isUpdatingData={isUpdatingData}
        />

        <Editor
          content={content}
          url={url}
          isParsing={isParsing}
          error={error}
          onContentChange={handleContentChange}
          onUrlChange={setUrl}
          onParseContent={handleParseContent}
          isEnabled={isEditorEnabled}
        />

        <RightSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>
    </div>
  );
}