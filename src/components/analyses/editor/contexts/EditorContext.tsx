import { createContext, useContext, ReactNode } from 'react';
import { Metrics } from '../types';

interface EditorContextType {
  content: string;
  setContent: (content: string) => void;
  metrics: Metrics;
  setMetrics: (metrics: Metrics) => void;
  uniquenessScore: number;
  setUniquenessScore: (score: number) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export function EditorProvider({ children }: { children: ReactNode }) {
  // We'll implement the provider logic after confirmation
  return <>{children}</>;
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
}