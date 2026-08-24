import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, Mail, Lock } from 'lucide-react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.user, res.data.token);
      toast.success('Successfully logged in!');
      navigate('/');
    } catch (err) {
      if (err.response?.status === 422 && err.response.data.errors) {
        const fieldErrors = {};
        err.response.data.errors.forEach(e => fieldErrors[e.path] = e.msg);
        setErrors(fieldErrors);
      } else {
        toast.error(err.response?.data?.message || 'Login failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 bg-white dark:bg-gray-900 p-8 sm:p-10 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-500 transition-colors">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">Welcome Back</h2>
        <p className="text-gray-500 dark:text-gray-400 font-medium">Please sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Email</label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
            <input 
              type="email" placeholder="you@example.com" required 
              className={`w-full bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white border p-3.5 pl-12 rounded-xl focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all ${errors.email ? 'border-red-500 dark:border-red-500/50' : 'border-gray-200 dark:border-gray-700'}`}
              value={email} onChange={e => setEmail(e.target.value)} 
            />
          </div>
          {errors.email && <p className="text-red-500 dark:text-red-400 text-sm font-medium mt-1.5">{errors.email}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Password</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
            <input 
              type="password" placeholder="••••••••" required 
              className={`w-full bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white border p-3.5 pl-12 rounded-xl focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all ${errors.password ? 'border-red-500 dark:border-red-500/50' : 'border-gray-200 dark:border-gray-700'}`}
              value={password} onChange={e => setPassword(e.target.value)} 
            />
          </div>
          {errors.password && <p className="text-red-500 dark:text-red-400 text-sm font-medium mt-1.5">{errors.password}</p>}
        </div>
        
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="bg-brand-600 dark:bg-brand-500 text-white p-4 rounded-xl font-bold hover:bg-brand-700 dark:hover:bg-brand-400 transition-all shadow-md hover:shadow-lg active:scale-95 flex justify-center items-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      
      <p className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 mt-8">
        Don't have an account? <Link to="/register" className="text-brand-600 dark:text-brand-400 font-bold hover:underline">Register here</Link>
      </p>
    </div>
  );
}
