import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase";
import { LoadingScreen } from "../common/LoadingScreen";
import { Edit, Trash, ArrowLeft, Globe, BarChart2, FileText, Brain, RefreshCw, PenSquare } from 'lucide-react';
import { parseCompetitorContent } from "../../lib/content-parser";
import { createSerpTask, analyzeSerpResults } from "../../lib/dataforseo";
import ContentAnalysisTab from "./ContentAnalysisTab";
import TextAnalysisTab from "./TextAnalysisTab";

interface Analysis {
  id: string;
  keyword: string;
  quick_score: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  created_at: string;
  serp_results?: any[];
  content_analysis?: any;
  url?: string;
}

interface TabProps {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function Tab({ isActive, onClick, children }: TabProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 font-medium text-sm rounded-md ${
        isActive
          ? "bg-indigo-100 text-indigo-700"
          : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

export function AnalysisShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'serp' | 'content' | 'text'>('serp');
  const [parsingStatus, setParsingStatus] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isRefreshingSERP, setIsRefreshingSERP] = useState(false);

  useEffect(() => {
    const loadAnalysis = async () => {
      try {
        const { data, error } = await supabaseClient
          .from("analyses")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setAnalysis(data);
      } catch (err) {
        console.error("Error loading analysis:", err);
        setError(err instanceof Error ? err.message : "Failed to load analysis");
      } finally {
        setLoading(false);
      }
    };

    loadAnalysis();
  }, [id]);

  const handleRefreshSERP = async () => {
    if (!analysis) return;

    setIsRefreshingSERP(true);
    setError(null);

    try {
      // Create new SERP task
      const results = await createSerpTask(analysis.keyword, "2804"); // Default to Ukraine
      
      // Calculate difficulty score
      const score = await analyzeSerpResults(results);

      // Update analysis in database
      const { error: updateError } = await supabaseClient
        .from("analyses")
        .update({ 
          serp_results: results,
          quick_score: score,
          status: 'completed'
        })
        .eq("id", analysis.id);

      if (updateError) throw updateError;

      // Update local state
      setAnalysis({
        ...analysis,
        serp_results: results,
        quick_score: score,
        status: 'completed'
      });

      setError(null);
    } catch (err) {
      console.error("Error refreshing SERP:", err);
      setError(err instanceof Error ? err.message : "Failed to refresh SERP results");
    } finally {
      setIsRefreshingSERP(false);
    }
  };

  const handleRefreshAnalysis = async () => {
    if (!analysis) return;

    setIsParsing(true);
    setError(null);

    try {
      // Parse competitor content
      const contentAnalysis = await parseCompetitorContent(
        analysis.serp_results || [],
        analysis.url || null,
        (progress) => setParsingStatus(progress)
      );

      // Update analysis in database
      const { error: updateError } = await supabaseClient
        .from("analyses")
        .update({ content_analysis: contentAnalysis })
        .eq("id", analysis.id);

      if (updateError) throw updateError;

      // Update local state
      setAnalysis({
        ...analysis,
        content_analysis: contentAnalysis
      });

      setParsingStatus("Analysis completed successfully!");
    } catch (err) {
      console.error("Error refreshing analysis:", err);
      setError(err instanceof Error ? err.message : "Failed to refresh analysis");
    } finally {
      setIsParsing(false);
      setParsingStatus(null);
    }
  };

  const renderContent = () => {
    if (activeTab === 'serp') {
      return (
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">TOP-10 Results</h3>
            <button
              onClick={handleRefreshSERP}
              disabled={isRefreshingSERP}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingSERP ? 'animate-spin' : ''}`} />
              {isRefreshingSERP ? 'Refreshing...' : 'Refresh SERP'}
            </button>
          </div>

          {analysis?.serp_results?.length > 0 ? (
            analysis.serp_results.map((result, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-gray-500">#{result.position}</span>
                      <h4 className="text-lg font-medium text-blue-600 hover:text-blue-800">
                        <a href={result.url} target="_blank" rel="noopener noreferrer">
                          {result.title}
                        </a>
                      </h4>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{result.description}</p>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Globe className="h-4 w-4 mr-1" />
                        {result.domain}
                      </div>
                      <div>
                        Links: {result.links_count || 0}
                      </div>
                      {result.estimated_paid_traffic_cost > 0 && (
                        <div className="text-green-600">
                          Est. Traffic Cost: ${result.estimated_paid_traffic_cost}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No SERP results available for this analysis.</p>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'content') {
      return (
        <div>
          {parsingStatus && (
            <div className="mb-6 bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2" />
                <p className="text-sm text-blue-700">{parsingStatus}</p>
              </div>
            </div>
          )}

          <ContentAnalysisTab 
            analysisId={id!} 
            contentAnalysis={analysis?.content_analysis}
            onRefresh={handleRefreshAnalysis}
          />
        </div>
      );
    }

    return (
      <TextAnalysisTab
        analysisId={id!}
        contentAnalysis={analysis?.content_analysis}
      />
    );
  };

  if (loading) return <LoadingScreen />;
  if (!analysis) return <div>Analysis not found</div>;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-800">
              {analysis.keyword}
            </h2>
            <div className="flex items-center space-x-8">
              <div>
                <span className="text-sm text-gray-500">Quick Score:</span>
                <span className="ml-2 text-lg font-semibold">{analysis.quick_score}%</span>
              </div>
              <div>
                <span className="text-sm text-gray-500">Status:</span>
                <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                  analysis.status === 'completed' ? 'bg-green-100 text-green-800' :
                  analysis.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                  analysis.status === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {analysis.status}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/analyses/${id}/editor`)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PenSquare className="h-4 w-4 mr-2" />
              Editor
            </button>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}

        <div className="border-b border-gray-200 mb-6">
          <div className="flex space-x-4">
            <Tab
              isActive={activeTab === 'serp'}
              onClick={() => setActiveTab('serp')}
            >
              <div className="flex items-center space-x-2">
                <BarChart2 className="h-4 w-4" />
                <span>SERP</span>
              </div>
            </Tab>
            <Tab
              isActive={activeTab === 'content'}
              onClick={() => setActiveTab('content')}
            >
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Content</span>
              </div>
            </Tab>
            <Tab
              isActive={activeTab === 'text'}
              onClick={() => setActiveTab('text')}
            >
              <div className="flex items-center space-x-2">
                <Brain className="h-4 w-4" />
                <span>Keywords</span>
              </div>
            </Tab>
          </div>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}