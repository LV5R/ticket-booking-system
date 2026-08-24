import { useContext } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Ticket, LogOut, Sun, Moon } from 'lucide-react';

export default function Navbar({ toggleTheme, isDark }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || '?';
  };

  const navClass = ({ isActive }) => 
    `text-sm font-medium transition-all duration-200 hover:text-brand-600 dark:hover:text-brand-400 ${isActive ? 'text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 dark:border-brand-400 pb-1' : 'text-gray-600 dark:text-gray-300'}`;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-800 transition-colors">
      <div className="container mx-auto px-4 h-16 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors">
          <Ticket className="w-6 h-6" />
          <span>TicketFlow</span>
        </Link>
        
        <div className="flex items-center gap-4 md:gap-6">
          <NavLink to="/" className={navClass} end>Events</NavLink>
          
          {user ? (
            <>
              {user.role === 'customer' && <NavLink to="/my-bookings" className={navClass}>My Bookings</NavLink>}
              {user.role === 'organiser' && <NavLink to="/organiser/dashboard" className={navClass}>Dashboard</NavLink>}
              {user.role === 'admin' && <NavLink to="/admin" className={navClass}>Admin</NavLink>}
              
              <div className="flex items-center gap-3 ml-2 md:ml-4 pl-4 border-l border-gray-200 dark:border-gray-700">
                <button onClick={toggleTheme} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full">
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-sm border border-brand-200 dark:border-brand-700">
                    {getInitials(user.name)}
                  </div>
                  <span className="text-sm font-medium hidden md:block text-gray-700 dark:text-gray-200">{user.name}</span>
                </div>
                <button 
                  onClick={handleLogout} 
                  title="Logout"
                  className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all active:scale-95"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 ml-2 pl-4 border-l border-gray-200 dark:border-gray-700">
              <button onClick={toggleTheme} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full mr-1">
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <Link to="/login" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Login</Link>
              <Link to="/register" className="text-sm font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-lg hover:bg-brand-600 dark:hover:bg-gray-200 transition-all shadow-sm hover:shadow active:scale-95">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
