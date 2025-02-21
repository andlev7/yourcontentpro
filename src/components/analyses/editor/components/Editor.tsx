import { useEffect, useRef, useCallback } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface EditorProps {
  content: string;
  url: string;
  isParsing: boolean;
  error: string | null;
  onContentChange: (content: string) => void;
  onUrlChange: (url: string) => void;
  onParseContent: () => void;
  isEnabled: boolean;
}

const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, 4, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link'],
    ['clean']
  ]
};

export function Editor({
  content,
  url,
  isParsing,
  error,
  onContentChange,
  onUrlChange,
  onParseContent,
  isEnabled
}: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill>();
  const isInitializedRef = useRef(false);
  const contentRef = useRef(content);

  // Handle content changes from Quill
  const handleQuillChange = useCallback(() => {
    if (!quillRef.current || !isEnabled) return;
    
    const newContent = quillRef.current.root.innerHTML;
    if (newContent !== contentRef.current) {
      contentRef.current = newContent;
      onContentChange(newContent);
    }
  }, [onContentChange, isEnabled]);

  // Initialize Quill
  useEffect(() => {
    if (editorRef.current && !quillRef.current) {
      quillRef.current = new Quill(editorRef.current, {
        theme: 'snow',
        modules,
        placeholder: 'Start writing or paste your content...',
        readOnly: !isEnabled
      });

      quillRef.current.on('text-change', handleQuillChange);
      isInitializedRef.current = true;
    }

    return () => {
      if (quillRef.current) {
        quillRef.current.off('text-change', handleQuillChange);
      }
    };
  }, [handleQuillChange]);

  // Update editor content when prop changes
  useEffect(() => {
    if (quillRef.current && content !== contentRef.current) {
      contentRef.current = content;
      quillRef.current.root.innerHTML = content;
    }
  }, [content]);

  // Update editor enabled state
  useEffect(() => {
    if (quillRef.current) {
      quillRef.current.enable(isEnabled);
    }
  }, [isEnabled]);

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-2">
        <div className="flex items-center space-x-4 mb-2">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <input
                type="url"
                value={url}
                onChange={(e) => onUrlChange(e.target.value)}
                placeholder="Enter URL to parse content"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                onClick={onParseContent}
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

      <div className="flex-1 p-6 overflow-hidden">
        <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-lg">
          <div className="editor-container">
            <div ref={editorRef} className={!isEnabled ? 'opacity-50' : ''} />
          </div>
        </div>
      </div>
    </div>
  );
}