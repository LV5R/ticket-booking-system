import { Link } from 'react-router-dom';
import { Ghost } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <Ghost className="w-24 h-24 text-brand-300 mb-6" />
      <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
      <p className="text-xl text-gray-600 mb-8">Oops! The page you're looking for doesn't exist.</p>
      <Link to="/" className="bg-brand-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-700 transition shadow-sm hover:shadow">
        Go back home
      </Link>
    </div>
  );
}
