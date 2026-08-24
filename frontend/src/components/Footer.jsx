import { Link } from 'react-router-dom';
import { Ticket, Code } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 mt-auto transition-colors">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-xl font-bold text-brand-600 dark:text-brand-400">
            <Ticket className="w-6 h-6" />
            <span>TicketFlow</span>
          </div>
          
          <div className="flex items-center gap-6 text-sm font-medium text-gray-500 dark:text-gray-400">
            <Link to="/" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Events</Link>
            <Link to="/about" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">About</Link>
            <Link to="/contact" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Contact</Link>
          </div>
          
          <div className="flex items-center gap-4">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              <Code className="w-5 h-5" />
            </a>
          </div>
        </div>
        
        <div className="text-center text-xs text-gray-400 dark:text-gray-600 mt-8">
          &copy; {new Date().getFullYear()} TicketFlow. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
