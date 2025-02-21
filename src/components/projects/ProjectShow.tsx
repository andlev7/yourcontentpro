import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase";
import { Project } from "../../interfaces";
import { LoadingScreen } from "../common/LoadingScreen";
import { Edit, Plus, Search, Trash } from "lucide-react";

interface Analysis {
  id: string;
  keyword: string;
  quick_score: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  created_at: string;
}

interface ProjectUser {
  user_id: string;
  role: string;
  profiles?: {
    email: string;
    full_name: string | null;
  } | null;
}

interface ProjectWithUsers extends Project {
  project_users?: ProjectUser[];
}

export function ProjectShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectWithUsers | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");

  useEffect(() => {
    const loadProject = async () => {
      try {
        const { data, error } = await supabaseClient
          .from("projects")
          .select(`
            *,
            project_users (
              user_id,
              role,
              profiles (
                email,
                full_name
              )
            )
          `)
          .eq("id", id)
          .single();

        if (error) throw error;
        setProject(data);

        // Load analyses for the project
        const { data: analysesData, error: analysesError } = await supabaseClient
          .from("analyses")
          .select("*")
          .eq("project_id", id)
          .order("created_at", { ascending: false });

        if (analysesError) throw analysesError;
        setAnalyses(analysesData);
      } catch (err) {
        console.error("Error loading project:", err);
        setError(err instanceof Error ? err.message : "Failed to load project");
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [id]);

  const handleDelete = async () => {
    const confirmed = window.confirm("Are you sure you want to delete this project?");
    if (!confirmed) return;

    try {
      const { error } = await supabaseClient
        .from("projects")
        .delete()
        .eq("id", id);

      if (error) throw error;
      navigate("/projects");
    } catch (err) {
      console.error("Error deleting project:", err);
      setError(err instanceof Error ? err.message : "Failed to delete project");
    }
  };

  const handleDeleteAnalysis = async (analysisId: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this analysis?");
    if (!confirmed) return;

    try {
      const { error } = await supabaseClient
        .from("analyses")
        .delete()
        .eq("id", analysisId);

      if (error) throw error;
      
      // Update the local state
      setAnalyses(analyses.filter(a => a.id !== analysisId));
    } catch (err) {
      console.error("Error deleting analysis:", err);
      setError(err instanceof Error ? err.message : "Failed to delete analysis");
    }
  };

  const filteredAnalyses = analyses.filter(analysis =>
    analysis.keyword.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  if (loading) return <LoadingScreen />;
  if (!project) return <div>Project not found</div>;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">{project.name}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/projects/edit/${project.id}`)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}

        <div className="prose max-w-none mb-8">
          <p className="text-gray-600">{project.description || "No description provided."}</p>
        </div>

        <div className="border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Analyses</h3>
            <button
              onClick={() => navigate(`/projects/${id}/analyses/create`)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Analysis
            </button>
          </div>

          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search keywords..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-2" />
            </div>
          </div>

          {filteredAnalyses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Keyword
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quick Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAnalyses.map((analysis) => (
                    <tr key={analysis.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {analysis.keyword}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {analysis.quick_score !== null ? `${analysis.quick_score}%` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(analysis.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          analysis.status === 'completed' ? 'bg-green-100 text-green-800' :
                          analysis.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                          analysis.status === 'error' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {analysis.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => navigate(`/analyses/${analysis.id}`)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => handleDeleteAnalysis(analysis.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">No analyses found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}