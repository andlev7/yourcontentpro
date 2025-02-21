import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useList } from "@refinedev/core";
import { FileText, Plus } from "lucide-react";
import { Project } from "../../interfaces";
import { LoadingScreen } from "../common/LoadingScreen";

export function ProjectList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useList<Project>({
    resource: "projects",
    sorters: [
      {
        field: "created_at",
        order: "desc"
      }
    ]
  });

  const projects = data?.data || [];
  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Projects</h2>
          <button
            onClick={() => navigate("/projects/create")}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {project.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {project.description || "No description"}
                  </p>
                </div>
                <FileText className="h-5 w-5 text-gray-400" />
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex space-x-2">
                  <button
                    onClick={() => navigate(`/projects/edit/${project.id}`)}
                    className="text-sm text-indigo-600 hover:text-indigo-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => navigate(`/projects/show/${project.id}`)}
                    className="text-sm px-4 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                  >
                    Open
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new project.
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate("/projects/create")}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}