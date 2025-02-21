export interface Metrics {
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

export interface EditorProps {
  content: string;
  url: string;
  isParsing: boolean;
  error: string | null;
  onContentChange: (content: string) => void;
  onUrlChange: (url: string) => void;
  onParseContent: () => void;
}

export interface SidebarProps {
  metrics: Metrics;
  uniquenessScore: number;
  onRefreshUniqueness: () => void;
  isRefreshingUniqueness: boolean;
}