import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

export default function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'customer' });
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/register', formData);
      login(res.data.user, res.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Register</h2>
      {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input 
          type="text" placeholder="Name" required className="border p-2 rounded"
          value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
        />
        <input 
          type="email" placeholder="Email" required className="border p-2 rounded"
          value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} 
        />
        <input 
          type="password" placeholder="Password" required className="border p-2 rounded"
          value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} 
        />
        <select 
          className="border p-2 rounded"
          value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
        >
          <option value="customer">Customer</option>
          <option value="organiser">Organiser</option>
        </select>
        <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Register</button>
      </form>
    </div>
  );
}
