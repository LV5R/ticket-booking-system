import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Search, Music, Ticket, Star, Mic2, Tv } from 'lucide-react';
import api from '../api/axios';
import { CardSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

export default function Home() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/events')
      .then(res => setEvents(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const getEventIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'concert': return <Music className="w-10 h-10" />;
      case 'theater': return <Tv className="w-10 h-10" />;
      case 'comedy': return <Mic2 className="w-10 h-10" />;
      default: return <Star className="w-10 h-10" />;
    }
  };

  const getEventGradient = (type) => {
    switch (type?.toLowerCase()) {
      case 'concert': return 'from-purple-500 to-indigo-600';
      case 'theater': return 'from-rose-500 to-red-600';
      case 'comedy': return 'from-amber-400 to-orange-500';
      default: return 'from-brand-400 to-brand-600';
    }
  };

  const filteredEvents = events.filter(e => e.title.toLowerCase().includes(search.toLowerCase()) || e.type.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-in fade-in duration-500 pb-12">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden bg-gray-900 text-white mb-12 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-900 to-indigo-900 opacity-90"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10 px-6 py-16 md:py-24 max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            The Best Live Experiences, <br className="hidden md:block"/> One Click Away
          </h1>
          <p className="text-lg md:text-xl text-brand-100 mb-10 max-w-2xl mx-auto font-medium">
            Discover concerts, theater, and sports events. Book your seats instantly and securely.
          </p>
          <div className="max-w-xl mx-auto relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-brand-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search by event title or category..."
              className="w-full bg-white text-gray-900 rounded-full py-4 pl-12 pr-6 shadow-lg focus:outline-none focus:ring-4 focus:ring-brand-500/50 transition-all text-lg"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-end mb-8 px-2">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Upcoming Events</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Book tickets for the best shows in town.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(n => <CardSkeleton key={n} />)}
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState 
          title="No events found" 
          message={search ? "No events match your search query." : "There are currently no upcoming events scheduled. Please check back later!"} 
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEvents.map(event => (
            <div key={event.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col">
              <div className={`h-48 bg-gradient-to-br ${getEventGradient(event.type)} relative`}>
                <div className="absolute inset-0 flex items-center justify-center text-white/20 group-hover:scale-110 transition-transform duration-500">
                  {getEventIcon(event.type)}
                </div>
                <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm border border-white/10 uppercase tracking-wider">
                  {event.type}
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-1">{event.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 line-clamp-2 flex-1">{event.description}</p>
                
                <div className="space-y-2.5 mb-6 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center text-xs text-gray-700 dark:text-gray-300 gap-2.5">
                    <Calendar className="w-4 h-4 text-brand-500" />
                    <span className="font-medium">{event.first_show_date ? new Date(event.first_show_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBD'}</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-700 dark:text-gray-300 gap-2.5">
                    <MapPin className="w-4 h-4 text-brand-500" />
                    <span className="font-medium line-clamp-1">{event.venue_name || 'Multiple Venues'}</span>
                  </div>
                </div>
                
                <Link 
                  to={`/events/${event.id}`} 
                  className="block text-center bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-3 rounded-xl font-semibold hover:bg-brand-600 dark:hover:bg-brand-500 hover:text-white transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
