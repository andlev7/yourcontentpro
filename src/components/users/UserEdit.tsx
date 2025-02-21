import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabaseClient } from "../../lib/supabase";
import { User } from "../../interfaces";
import { LoadingScreen } from "../common/LoadingScreen";

export function UserEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load user data
  useState(() => {
    const loadUser = async () => {
      try {
        const { data, error } = await supabaseClient
          .from("profiles")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setUser(data);
      } catch (err) {
        console.error("Error loading user:", err);
        setError(err instanceof Error ? err.message : "Failed to load user");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const updates = {
        full_name: formData.get("full_name") as string,
        role: formData.get("role") as "admin" | "optimizer" | "client"
      };

      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update(updates)
        .eq("id", id);

      if (updateError) throw updateError;

      navigate("/users");
    } catch (err) {
      console.error("Error updating user:", err);
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (!user) return <div>User not found</div>;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Edit User</h2>
        
        {error && (
          <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              defaultValue={user.email}
              disabled
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              type="text"
              name="full_name"
              id="full_name"
              defaultValue={user.full_name || ""}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <select
              name="role"
              id="role"
              defaultValue={user.role}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="client">Client</option>
              <option value="optimizer">Optimizer</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate("/users")}
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