import { BarChart2, FileText, Home, Settings, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Projects', href: '/projects', icon: FileText },
  { name: 'Analytics', href: '/analytics', icon: BarChart2 },
  { name: 'Users', href: '/users', icon: Users, adminOnly: true },
  { name: 'API Services', href: '/api-services', icon: Settings, adminOnly: true },
];

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();

  // Check if user has admin role from metadata or profiles table
  const isAdmin = 
    user?.user_metadata?.role === 'admin' || 
    user?.role === 'admin' ||
    user?.email === 'andmaillev@gmail.com'; // Temporary fix to ensure admin access

  const filteredNavigation = navigation.filter(item => 
    !item.adminOnly || (item.adminOnly && isAdmin)
  );

  return (
    <div className="fixed inset-y-0 left-0 w-64 hidden lg:flex">
      <div className="flex flex-col flex-grow w-full bg-white border-r border-gray-200">
        <div className="flex-1 flex flex-col pt-20 pb-4 overflow-y-auto">
          <nav className="flex-1 px-2 space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                  )}
                >
                  <item.icon
                    className={cn(
                      isActive
                        ? 'text-gray-500'
                        : 'text-gray-400 group-hover:text-gray-500',
                      'mr-3 h-5 w-5'
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}