import { Refine } from "@refinedev/core";
import { BrowserRouter, Outlet, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/layout/Layout';
import { LoadingScreen } from './components/common/LoadingScreen';
import { LoginForm } from './components/auth/LoginForm';
import { supabaseClient } from "./lib/supabase";
import { dataProvider, liveProvider } from "@refinedev/supabase";
import { UserList } from "./components/users/UserList";
import { UserCreate } from "./components/users/UserCreate";
import { UserEdit } from "./components/users/UserEdit";
import { UserShow } from "./components/users/UserShow";
import { ProjectList } from "./components/projects/ProjectList";
import { ProjectCreate } from "./components/projects/ProjectCreate";
import { ProjectEdit } from "./components/projects/ProjectEdit";
import { ProjectShow } from "./components/projects/ProjectShow";
import { AnalysisCreate } from "./components/analyses/AnalysisCreate";
import { AnalysisShow } from "./components/analyses/AnalysisShow";
import { TextEditor } from "./components/analyses/editor/TextEditor";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { useAuth } from './contexts/AuthContext';

// Placeholder pages
const Dashboard = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
    <p>Welcome to your dashboard!</p>
  </div>
);

const Analytics = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <h1 className="text-2xl font-bold mb-4">Analytics</h1>
    <p>Analytics data will be displayed here.</p>
  </div>
);

const ApiServices = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <h1 className="text-2xl font-bold mb-4">API Services</h1>
    <p>API services configuration will be available here.</p>
  </div>
);

const Instructions = () => (
  <div className="bg-white rounded-lg shadow p-6">
    <h1 className="text-2xl font-bold mb-4">Instructions</h1>
    <p>Usage instructions and documentation will be shown here.</p>
  </div>
);

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Refine
            dataProvider={dataProvider(supabaseClient)}
            liveProvider={liveProvider(supabaseClient)}
            authProvider={{
              login: async ({ email, password }) => {
                const { error } = await supabaseClient.auth.signInWithPassword({
                  email,
                  password,
                });
                if (error) {
                  return {
                    success: false,
                    error,
                  };
                }
                return {
                  success: true,
                  redirectTo: "/",
                };
              },
              logout: async () => {
                const { error } = await supabaseClient.auth.signOut();
                if (error) {
                  return {
                    success: false,
                    error,
                  };
                }
                return {
                  success: true,
                  redirectTo: "/login",
                };
              },
              check: async () => {
                const { data } = await supabaseClient.auth.getSession();
                const { session } = data;
                if (!session) {
                  return {
                    authenticated: false,
                    redirectTo: "/login",
                  };
                }
                return {
                  authenticated: true,
                };
              },
              getPermissions: async () => {
                const { data } = await supabaseClient.auth.getSession();
                return data.session?.user.user_metadata.role;
              },
              getIdentity: async () => {
                const { data } = await supabaseClient.auth.getUser();
                if (data?.user) {
                  return {
                    ...data.user,
                    name: data.user.email,
                  };
                }
                return null;
              },
            }}
            resources={[
              {
                name: "dashboard",
                list: "/",
                meta: {
                  label: "Dashboard",
                  icon: "Dashboard",
                },
              },
              {
                name: "projects",
                list: "/projects",
                show: "/projects/show/:id",
                create: "/projects/create",
                edit: "/projects/edit/:id",
                meta: {
                  label: "Projects",
                  icon: "Projects",
                },
              },
              {
                name: "analytics",
                list: "/analytics",
                meta: {
                  label: "Analytics",
                  icon: "Analytics",
                },
              },
              {
                name: "users",
                list: "/users",
                show: "/users/show/:id",
                create: "/users/create",
                edit: "/users/edit/:id",
                meta: {
                  label: "Users",
                  icon: "Users",
                },
              },
              {
                name: "api-services",
                list: "/api-services",
                meta: {
                  label: "API Services",
                  icon: "ApiServices",
                },
              },
            ]}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
            }}
          >
            <Routes>
              <Route path="/login" element={<LoginForm />} />
              <Route
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Outlet />
                    </Layout>
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="/projects" element={<ProjectList />} />
                <Route path="/projects/create" element={<ProjectCreate />} />
                <Route path="/projects/edit/:id" element={<ProjectEdit />} />
                <Route path="/projects/show/:id" element={<ProjectShow />} />
                <Route path="/projects/:projectId/analyses/create" element={<AnalysisCreate />} />
                <Route path="/analyses/:id" element={<AnalysisShow />} />
                <Route path="/analyses/:id/editor" element={<TextEditor />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/users" element={<UserList />} />
                <Route path="/users/create" element={<UserCreate />} />
                <Route path="/users/edit/:id" element={<UserEdit />} />
                <Route path="/users/show/:id" element={<UserShow />} />
                <Route path="/api-services" element={<ApiServices />} />
                <Route path="/instructions" element={<Instructions />} />
              </Route>
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Refine>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}