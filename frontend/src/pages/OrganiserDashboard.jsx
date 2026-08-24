import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, Plus, Calendar, MapPin, Tag } from 'lucide-react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

export default function OrganiserDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Combined Form State
  const [formData, setFormData] = useState({
    title: '',
    type: 'Concert',
    description: '',
    venue_id: '',
    date: '',
    time: ''
  });

  useEffect(() => {
    if (!user || user.role !== 'organiser') {
      navigate('/');
      return;
    }

    Promise.all([
      api.get(`/events?organiser_id=${user.id}`),
      api.get('/venues')
    ])
    .then(([evRes, vRes]) => {
      setEvents(evRes.data);
      setVenues(vRes.data);
    })
    .catch(() => toast.error('Failed to load dashboard data'))
    .finally(() => setIsLoading(false));
  }, [user, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // 1. Create Event
      const evRes = await api.post('/events', {
        title: formData.title,
        type: formData.type,
        description: formData.description
      });
      
      const newEventId = evRes.data.id;

      // 2. Create Show for the event
      await api.post(`/events/${newEventId}/shows`, {
        venue_id: formData.venue_id,
        date: formData.date,
        time: formData.time,
        prices: { 'VIP': 5000, 'Premium': 3000, 'Standard': 1500 } // Default pricing for demo
      });

      toast.success('Event and show created successfully!');
      
      // Reset form
      setFormData({
        title: '', type: 'Concert', description: '', venue_id: '', date: '', time: ''
      });

      // Refresh list
      const updatedEvents = await api.get(`/events?organiser_id=${user.id}`);
      setEvents(updatedEvents.data);
      
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create event flow');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto py-8 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Organiser Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Manage your events and view ticket sales.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Event Form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 transition-colors">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-brand-500" /> Create New Event
            </h2>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Event Title</label>
                <input 
                  name="title" type="text" required 
                  className="w-full bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 p-3 rounded-xl focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                  value={formData.title} onChange={handleChange} placeholder="e.g. Summer Music Fest"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Category</label>
                <select 
                  name="type" required 
                  className="w-full bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 p-3 rounded-xl focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                  value={formData.type} onChange={handleChange}
                >
                  <option value="Concert">Concert</option>
                  <option value="Theater">Theater</option>
                  <option value="Comedy">Comedy</option>
                  <option value="Sports">Sports</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea 
                  name="description" rows="3" required 
                  className="w-full bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 p-3 rounded-xl focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                  value={formData.description} onChange={handleChange} placeholder="Brief details about the event..."
                />
              </div>

              <div className="h-px bg-gray-200 dark:bg-gray-700 my-2"></div>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Initial Show Details</p>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Venue</label>
                <select 
                  name="venue_id" required 
                  className="w-full bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 p-3 rounded-xl focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                  value={formData.venue_id} onChange={handleChange}
                >
                  <option value="">Select a venue...</option>
                  {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Date</label>
                  <input 
                    name="date" type="date" required 
                    className="w-full bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 p-3 rounded-xl focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                    value={formData.date} onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Time</label>
                  <input 
                    name="time" type="time" required 
                    className="w-full bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 p-3 rounded-xl focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                    value={formData.time} onChange={handleChange}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-brand-600 dark:bg-brand-500 text-white p-4 rounded-xl font-bold hover:bg-brand-700 dark:hover:bg-brand-400 transition-all shadow-md hover:shadow-lg active:scale-95 flex justify-center items-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                {isSubmitting ? 'Publishing...' : 'Publish Event & Show'}
              </button>
            </form>
          </div>
        </div>

        {/* Event List */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 transition-colors h-full">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Your Hosted Events</h2>
            
            {events.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">You haven't created any events yet.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {events.map(ev => (
                  <div key={ev.id} className="group bg-gray-50 dark:bg-gray-800/50 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-md transition-all">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg text-gray-900 dark:text-white">{ev.title}</h3>
                          <span className="text-xs font-semibold bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full">
                            {ev.type}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
                          {ev.first_show_date && (
                            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {new Date(ev.first_show_date).toLocaleDateString()}</span>
                          )}
                          {ev.venue_name && (
                            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {ev.venue_name}</span>
                          )}
                        </div>
                      </div>
                      
                      <button className="text-brand-600 dark:text-brand-400 text-sm font-bold hover:underline">
                        Manage Event
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
