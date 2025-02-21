// Base interfaces for the system
export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
  assigned_users?: string[];
}

export interface Analysis {
  id: string;
  project_id: string;
  keyword: string;
  quick_score?: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  created_at: string;
  updated_at: string;
  serp_results?: any[];
  additional_keywords?: string[];
  url?: string | null;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'optimizer' | 'client';
  created_at: string;
}

export interface ApiService {
  id: string;
  name: string;
  api_key: string;
  service_type: 'dataforseo' | 'candycontent' | 'openai';
  is_active: boolean;
}