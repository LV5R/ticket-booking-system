import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, User, Mail, Lock } from 'lucide-react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

export default function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'customer' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    
    try {
      const res = await api.post('/auth/register', formData);
      login(res.data.user, res.data.token);
      toast.success('Registration successful!');
      navigate('/');
    } catch (err) {
      if (err.response?.status === 422 && err.response.data.errors) {
        const fieldErrors = {};
        err.response.data.errors.forEach(e => fieldErrors[e.path] = e.msg);
        setErrors(fieldErrors);
      } else {
        toast.error(err.response?.data?.message || 'Registration failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const InputField = ({ label, name, type = 'text', placeholder, icon: Icon }) => (
    <div>
      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{label}</label>
      <div className="relative group">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand-500 transition-colors" />}
        <input 
          type={type} placeholder={placeholder} required 
          className={`w-full bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white border p-3.5 ${Icon ? 'pl-12' : 'px-4'} rounded-xl focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all ${errors[name] ? 'border-red-500 dark:border-red-500/50' : 'border-gray-200 dark:border-gray-700'}`}
          value={formData[name]} onChange={e => setFormData({...formData, [name]: e.target.value})} 
        />
      </div>
      {errors[name] && <p className="text-red-500 dark:text-red-400 text-sm font-medium mt-1.5">{errors[name]}</p>}
    </div>
  );

  return (
    <div className="max-w-md mx-auto mt-12 bg-white dark:bg-gray-900 p-8 sm:p-10 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-500 transition-colors">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">Create Account</h2>
        <p className="text-gray-500 dark:text-gray-400 font-medium">Join us to start booking tickets</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <InputField label="Full Name" name="name" placeholder="John Doe" icon={User} />
        <InputField label="Email Address" name="email" type="email" placeholder="you@example.com" icon={Mail} />
        <InputField label="Password" name="password" type="password" placeholder="••••••••" icon={Lock} />
        
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Account Type</label>
          <select 
            className={`w-full bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white border p-3.5 rounded-xl focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all ${errors.role ? 'border-red-500 dark:border-red-500/50' : 'border-gray-200 dark:border-gray-700'}`}
            value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
          >
            <option value="customer">Customer</option>
            <option value="organiser">Organiser</option>
          </select>
          {errors.role && <p className="text-red-500 dark:text-red-400 text-sm font-medium mt-1.5">{errors.role}</p>}
        </div>
        
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="bg-brand-600 dark:bg-brand-500 text-white p-4 rounded-xl font-bold hover:bg-brand-700 dark:hover:bg-brand-400 transition-all shadow-md hover:shadow-lg active:scale-95 flex justify-center items-center gap-2 mt-6 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
          {isSubmitting ? 'Creating account...' : 'Register'}
        </button>
      </form>

      <p className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 mt-8">
        Already have an account? <Link to="/login" className="text-brand-600 dark:text-brand-400 font-bold hover:underline">Log in</Link>
      </p>
    </div>
  );
}
