import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isEditorPage = location.pathname.includes('/editor');

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <div className="flex flex-1 pt-16">
        {!isEditorPage && <Sidebar />}
        <div className={`flex-1 ${!isEditorPage ? 'lg:pl-64' : ''}`}>
          <main className="flex-1 p-6">
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}