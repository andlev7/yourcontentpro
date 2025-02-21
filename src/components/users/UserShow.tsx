import { useOne, useDelete } from "@refinedev/core";
import { useNavigate, useParams } from "react-router-dom";
import { User } from "../../interfaces";
import { LoadingScreen } from "../common/LoadingScreen";
import { Edit, Trash } from "lucide-react";

export function UserShow() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useOne<User>({
    resource: "profiles",
    id: id || "",
  });

  const { mutate: deleteUser } = useDelete();

  if (isLoading) return <LoadingScreen />;

  const user = data?.data;

  if (!user) {
    return <div>User not found</div>;
  }

  const handleDelete = async () => {
    const confirmation = window.confirm("Are you sure you want to delete this user?");
    if (confirmation) {
      await deleteUser({
        resource: "profiles",
        id: user.id,
      });
      navigate("/users");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">User Details</h2>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/users/edit/${user.id}`)}
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

        <div className="border-t border-gray-200 pt-4">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Full Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{user.full_name || "-"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Role</dt>
              <dd className="mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  user.role === 'admin' 
                    ? 'bg-purple-100 text-purple-800'
                    : user.role === 'optimizer'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {user.role}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created At</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(user.created_at).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}