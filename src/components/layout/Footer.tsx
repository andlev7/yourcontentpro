import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Your Content Pro. All rights reserved.
          </p>
          <Link
            to="/instructions"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Instructions
          </Link>
        </div>
      </div>
    </footer>
  );
}