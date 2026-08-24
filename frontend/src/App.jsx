import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import EventDetails from './pages/EventDetails';
import SeatMap from './pages/SeatMap';
import MyBookings from './pages/MyBookings';
import OrganiserDashboard from './pages/OrganiserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './components/NotFound';

function App() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check localStorage or system preference on mount
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-center" toastOptions={{ 
          duration: 4000,
          style: isDark ? { background: '#1f2937', color: '#f9fafb' } : {}
        }} />
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
          <Navbar toggleTheme={toggleTheme} isDark={isDark} />
          <main className="flex-1 container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/events/:id" element={<EventDetails />} />
              <Route path="/shows/:id/seats" element={<SeatMap />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/organiser/dashboard" element={<OrganiserDashboard />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
