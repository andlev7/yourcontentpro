import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase";
import { Project } from "../../interfaces";
import { LoadingScreen } from "../common/LoadingScreen";
import { X } from "lucide-react";

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

export function ProjectEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState<ProjectWithUsers | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; email: string; full_name: string | null; role: string }>>([]);
  const [selectedUsers, setSelectedUsers] = useState<ProjectUser[]>([]);

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
        if (data?.project_users) {
          setSelectedUsers(data.project_users);
        }
      } catch (err) {
        console.error("Error loading project:", err);
        setError(err instanceof Error ? err.message : "Failed to load project");
      } finally {
        setLoading(false);
      }
    };

    const loadAvailableUsers = async () => {
      try {
        const { data, error } = await supabaseClient
          .from("profiles")
          .select("*")
          .in("role", ["optimizer", "client"]);

        if (error) throw error;
        setAvailableUsers(data || []);
      } catch (err) {
        console.error("Error loading users:", err);
      }
    };

    loadProject();
    loadAvailableUsers();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const updates = {
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        updated_at: new Date().toISOString()
      };

      // Update project details
      const { error: updateError } = await supabaseClient
        .from("projects")
        .update(updates)
        .eq("id", id);

      if (updateError) throw updateError;

      // Handle project users updates
      if (project?.project_users) {
        // Remove users that are no longer selected
        const removedUsers = project.project_users.filter(
          pu => !selectedUsers.some(su => su.user_id === pu.user_id)
        );

        for (const user of removedUsers) {
          await supabaseClient
            .from("project_users")
            .delete()
            .eq("project_id", id)
            .eq("user_id", user.user_id);
        }

        // Add new users
        const newUsers = selectedUsers.filter(
          su => !project.project_users?.some(pu => pu.user_id === su.user_id)
        );

        for (const user of newUsers) {
          await supabaseClient
            .from("project_users")
            .insert({
              project_id: id,
              user_id: user.user_id,
              role: user.role
            });
        }
      }

      navigate(`/projects/show/${id}`);
    } catch (err) {
      console.error("Error updating project:", err);
      setError(err instanceof Error ? err.message : "Failed to update project");
    } finally {
      setSaving(false);
    }
  };

  const handleAddUser = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = e.target.value;
    if (!userId) return;

    const user = availableUsers.find(u => u.id === userId);
    if (!user) return;

    if (selectedUsers.some(su => su.user_id === userId)) return;

    setSelectedUsers([...selectedUsers, {
      user_id: user.id,
      role: user.role,
      profiles: {
        email: user.email,
        full_name: user.full_name
      }
    }]);

    e.target.value = "";
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u.user_id !== userId));
  };

  if (loading) return <LoadingScreen />;
  if (!project) return <div>Project not found</div>;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Edit Project</h2>
        
        {error && (
          <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Project Name
            </label>
            <input
              type="text"
              name="name"
              id="name"
              defaultValue={project.name}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              id="description"
              rows={4}
              defaultValue={project.description || ""}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="assigned_users" className="block text-sm font-medium text-gray-700">
              Assign Users
            </label>
            <select
              id="assigned_users"
              onChange={handleAddUser}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Select users to add</option>
              {availableUsers
                .filter(user => !selectedUsers.some(su => su.user_id === user.id))
                .map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.email} ({user.role})
                  </option>
                ))
              }
            </select>

            {selectedUsers.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium text-gray-700">Selected Users:</p>
                <div className="space-y-2">
                  {selectedUsers.map(user => (
                    <div 
                      key={user.user_id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                    >
                      <div>
                        <span className="text-sm text-gray-900">
                          {user.profiles ? (user.profiles.full_name || user.profiles.email) : 'Unknown User'}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">({user.role})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveUser(user.user_id)}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate(`/projects/show/${id}`)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}