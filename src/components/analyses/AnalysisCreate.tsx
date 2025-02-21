import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase";
import { createSerpTask, analyzeSerpResults } from "../../lib/dataforseo";
import { LoadingScreen } from "../common/LoadingScreen";
import { Search, MapPin, List, Globe, ArrowRight, Save, Play } from "lucide-react";
import { parseCompetitorContent } from "../../lib/content-parser";

interface DataForSEOResult {
  url: string;
  title: string;
  description: string;
  position: number;
  domain: string;
  breadcrumb: string;
  links_count: number;
  main_domain: string;
  relative_url: string;
  etv: number;
  estimated_paid_traffic_cost: number;
  rank_group: number;
  xpath: string;
}

interface Location {
  id: string;
  name: string;
  parentId?: string;
  countryCode: string;
  type: 'Country' | 'Region';
}

const LOCATIONS: Location[] = [
  { id: "2804", name: "Ukraine", countryCode: "UA", type: "Country" },
  { id: "21118", name: "Kyiv city, Ukraine", parentId: "2804", countryCode: "UA", type: "Region" },
  { id: "21580", name: "Kyiv Oblast, Ukraine", parentId: "2804", countryCode: "UA", type: "Region" }
];

export function AnalysisCreate() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [ownUrl, setOwnUrl] = useState("");
  const [location, setLocation] = useState("2804"); // Default to Ukraine
  const [keywordsList, setKeywordsList] = useState("");
  const [competitors, setCompetitors] = useState<DataForSEOResult[]>([]);
  const [step, setStep] = useState<'input' | 'processing' | 'results'>('input');
  const [progress, setProgress] = useState<string>("");
  const [difficultyScore, setDifficultyScore] = useState<number | null>(null);
  const [additionalKeywords, setAdditionalKeywords] = useState<string[]>([]);
  const [contentAnalysis, setContentAnalysis] = useState<any>(null);
  const [isAnalyzingContent, setIsAnalyzingContent] = useState(false);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    setError(null);
    setStep('processing');
    setProgress("Creating SERP analysis task...");

    try {
      // Create SERP task and get results immediately
      const results = await createSerpTask(keyword.trim(), location);
      
      // Calculate difficulty score
      setProgress("Analyzing SERP results...");
      const score = await analyzeSerpResults(results);
      
      setCompetitors(results);
      setDifficultyScore(score);
      setStep('results');
    } catch (err) {
      console.error("Error analyzing keyword:", err);
      setError(err instanceof Error ? err.message : "Failed to analyze keyword");
      setStep('input');
    } finally {
      setLoading(false);
    }
  };

  const handleContentAnalysis = async () => {
    if (!competitors.length) return;

    setIsAnalyzingContent(true);
    setError(null);

    try {
      // Convert competitors to the format expected by parseCompetitorContent
      const competitorsList = competitors.map(comp => ({
        domain: comp.domain,
        url: comp.url
      }));

      const analysis = await parseCompetitorContent(
        competitorsList,
        ownUrl || null,
        (progress) => setProgress(progress)
      );

      setContentAnalysis(analysis);
    } catch (err) {
      console.error("Error analyzing content:", err);
      setError(err instanceof Error ? err.message : "Failed to analyze content");
    } finally {
      setIsAnalyzingContent(false);
    }
  };

  const handleSave = async () => {
    if (!competitors.length || difficultyScore === null) return;

    setLoading(true);
    setError(null);

    try {
      // Create analysis record with SERP results and additional data
      const analysisData = {
        project_id: projectId,
        keyword: keyword.trim(),
        quick_score: difficultyScore,
        status: 'completed',
        serp_results: competitors,
        additional_keywords: keywordsList.split('\n').filter(k => k.trim()),
        url: ownUrl.trim() || null,
        content_analysis: contentAnalysis
      };

      console.log('Saving analysis:', analysisData);

      const { data, error: createError } = await supabaseClient
        .from("analyses")
        .insert(analysisData)
        .select()
        .single();

      if (createError) {
        console.error("Error creating analysis:", createError);
        throw createError;
      }

      console.log('Analysis saved:', data);
      navigate(`/projects/show/${projectId}`);
    } catch (err) {
      console.error("Error saving analysis:", err);
      setError(err instanceof Error ? err.message : "Failed to save analysis");
    } finally {
      setLoading(false);
    }
  };

  if (step === 'processing') {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center">
        <LoadingScreen />
        <p className="mt-4 text-sm text-gray-600">{progress}</p>
      </div>
    );
  }

  if (step === 'results') {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Analysis Results</h2>
            <div className="flex gap-2">
              {!isAnalyzingContent && !contentAnalysis && (
                <button
                  onClick={handleContentAnalysis}
                  disabled={isAnalyzingContent}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Content Analysis
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Analysis
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-md">
              {error}
            </div>
          )}

          {isAnalyzingContent && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <div className="mr-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
                <p className="text-sm text-blue-700">{progress}</p>
              </div>
            </div>
          )}

          <div className="mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Keyword: {keyword}</h3>
                  <p className="text-sm text-gray-500">
                    Location: {LOCATIONS.find(l => l.id === location)?.name}
                  </p>
                </div>
                {difficultyScore !== null && (
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Difficulty Score</p>
                    <p className={`text-2xl font-bold ${
                      difficultyScore < 30 ? 'text-green-600' :
                      difficultyScore < 60 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {difficultyScore}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">TOP-10 Results</h3>
            {competitors.length > 0 ? (
              competitors.map((result, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold text-gray-500">{index + 1}#{result.position}</span>
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
                <p className="text-gray-500">No results found for this keyword.</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end space-x-4">
            <button
              onClick={() => setStep('input')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Back to Input
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {loading ? "Saving..." : "Save Analysis"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Create New Analysis</h2>

        {error && (
          <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleAnalyze} className="space-y-6">
          <div>
            <label htmlFor="keyword" className="block text-sm font-medium text-gray-700">
              Target Keyword
            </label>
            <div className="mt-1 relative">
              <input
                type="text"
                id="keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Enter your target keyword"
                required
              />
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Location
            </label>
            <div className="mt-1 relative">
              <select
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              >
                {LOCATIONS.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
              <MapPin className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label htmlFor="keywordsList" className="block text-sm font-medium text-gray-700">
              Additional Keywords (Optional)
            </label>
            <div className="mt-1 relative">
              <textarea
                id="keywordsList"
                value={keywordsList}
                onChange={(e) => setKeywordsList(e.target.value)}
                rows={4}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Enter additional keywords (one per line)"
              />
              <List className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Enter additional keywords to analyze, one per line
            </p>
          </div>

          <div>
            <label htmlFor="ownUrl" className="block text-sm font-medium text-gray-700">
              Your URL (Optional)
            </label>
            <input
              type="url"
              id="ownUrl"
              value={ownUrl}
              onChange={(e) => setOwnUrl(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="https://your-site.com/page"
            />
            <p className="mt-1 text-sm text-gray-500">
              Add your page URL to compare it with competitors
            </p>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate(`/projects/show/${projectId}`)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              {loading ? "Processing..." : "Analyze Keyword"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}