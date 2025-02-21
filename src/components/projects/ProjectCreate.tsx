import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase";
import { X } from "lucide-react";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

interface SelectedUser {
  id: string;
  name: string;
  role: string;
}

export function ProjectCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);

  // Load available users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data, error } = await supabaseClient
          .from('profiles')
          .select('*')
          .in('role', ['optimizer', 'client']);

        if (error) throw error;
        setUsers(data || []);
      } catch (err) {
        console.error('Error loading users:', err);
        setError(err instanceof Error ? err.message : 'Failed to load users');
      }
    };

    loadUsers();
  }, []);

  const handleAddUser = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = e.target.value;
    if (!userId) return;

    const user = users.find(u => u.id === userId);
    if (!user) return;

    // Check if user is already selected
    if (selectedUsers.some(su => su.id === userId)) return;

    setSelectedUsers([...selectedUsers, {
      id: user.id,
      name: user.full_name || user.email,
      role: user.role
    }]);

    // Reset select
    e.target.value = "";
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const name = formData.get("name") as string;
      const description = formData.get("description") as string;

      // Get current user's ID
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create project
      const { data: project, error: projectError } = await supabaseClient
        .from("projects")
        .insert({
          name,
          description,
          owner_id: user.id
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Assign selected users
      if (selectedUsers.length > 0) {
        const projectUsers = selectedUsers.map(user => ({
          project_id: project.id,
          user_id: user.id,
          role: user.role
        }));

        const { error: assignError } = await supabaseClient
          .from("project_users")
          .insert(projectUsers);

        if (assignError) throw assignError;
      }

      navigate("/projects");
    } catch (err) {
      console.error("Error creating project:", err);
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Create Project</h2>
        
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
              {users
                .filter(user => !selectedUsers.some(su => su.id === user.id))
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
                      key={user.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                    >
                      <div>
                        <span className="text-sm text-gray-900">{user.name}</span>
                        <span className="ml-2 text-xs text-gray-500">({user.role})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveUser(user.id)}
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
              onClick={() => navigate("/projects")}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}