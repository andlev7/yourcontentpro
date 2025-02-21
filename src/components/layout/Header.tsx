import { LogOut } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { signOut } from '../../lib/auth';

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const title = location.pathname === '/' ? 'Your Content Pro' : 'Your Content Pro: ' + location.pathname.slice(1).charAt(0).toUpperCase() + location.pathname.slice(2);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-gray-900">
              {title}
            </Link>
          </div>
          {user && (
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {user.email}
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}