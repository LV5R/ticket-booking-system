import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-md p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-blue-600">TicketBooking</Link>
        <div className="flex gap-4 items-center">
          <Link to="/" className="hover:text-blue-500">Events</Link>
          {user ? (
            <>
              {user.role === 'customer' && <Link to="/my-bookings" className="hover:text-blue-500">My Bookings</Link>}
              {user.role === 'organiser' && <Link to="/organiser" className="hover:text-blue-500">Organiser Dashboard</Link>}
              {user.role === 'admin' && <Link to="/admin" className="hover:text-blue-500">Admin Dashboard</Link>}
              <span className="text-gray-500 text-sm">{user.name} ({user.role})</span>
              <button onClick={handleLogout} className="bg-red-500 text-white px-3 py-1 rounded">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-blue-500">Login</Link>
              <Link to="/register" className="bg-blue-600 text-white px-3 py-1 rounded">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
