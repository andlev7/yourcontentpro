import { useTable, ColumnDef } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
import { Edit, Trash, UserPlus } from "lucide-react";
import { User } from "../../interfaces";

export function UserList() {
  const navigate = useNavigate();

  const { tableQueryResult, setFilters } = useTable<User>({
    resource: "profiles",
    pagination: {
      pageSize: 10,
    },
    sorters: {
      initial: [
        {
          field: "created_at",
          order: "desc",
        },
      ],
    },
  });

  const users = tableQueryResult.data?.data || [];

  const columns: ColumnDef<User>[] = [
    {
      id: "email",
      header: "Email",
      accessorKey: "email",
    },
    {
      id: "full_name",
      header: "Full Name",
      accessorKey: "full_name",
    },
    {
      id: "role",
      header: "Role",
      accessorKey: "role",
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          row.original.role === 'admin' 
            ? 'bg-purple-100 text-purple-800'
            : row.original.role === 'optimizer'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-green-100 text-green-800'
        }`}>
          {row.original.role}
        </span>
      ),
    },
    {
      id: "created_at",
      header: "Created At",
      accessorKey: "created_at",
      cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/users/edit/${row.original.id}`)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <Edit className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={() => navigate(`/users/show/${row.original.id}`)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <Trash className="h-4 w-4 text-red-600" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Users</h2>
          <button
            onClick={() => navigate("/users/create")}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </button>
        </div>

        <div className="mt-4">
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Search by email..."
              className="px-4 py-2 border rounded-md w-64"
              onChange={(e) => {
                setFilters([
                  {
                    field: "email",
                    operator: "contains",
                    value: e.target.value,
                  },
                ]);
              }}
            />
            <select
              className="px-4 py-2 border rounded-md"
              onChange={(e) => {
                setFilters([
                  {
                    field: "role",
                    operator: "eq",
                    value: e.target.value,
                  },
                ]);
              }}
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="optimizer">Optimizer</option>
              <option value="client">Client</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.id}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {column.header as string}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    {columns.map((column) => (
                      <td key={column.id} className="px-6 py-4 whitespace-nowrap">
                        {column.cell
                          ? column.cell({ row: { original: user } })
                          : user[column.accessorKey as keyof User]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}