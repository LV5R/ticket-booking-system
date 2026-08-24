import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Info } from 'lucide-react';
import api from '../api/axios';
import { Skeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

export default function EventDetails() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [shows, setShows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/events/${id}`),
      api.get(`/shows/event/${id}`)
    ])
    .then(([eventRes, showsRes]) => {
      setEvent(eventRes.data);
      setShows(showsRes.data);
    })
    .catch(console.error)
    .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 animate-in fade-in duration-300">
        <Skeleton className="h-48 w-full rounded-2xl mb-8 dark:bg-gray-800" />
        <Skeleton className="h-8 w-1/3 mb-4 dark:bg-gray-800" />
        <Skeleton className="h-24 w-full mb-12 dark:bg-gray-800" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full dark:bg-gray-800" />
          <Skeleton className="h-32 w-full dark:bg-gray-800" />
        </div>
      </div>
    );
  }

  if (!event) return <EmptyState title="Event not found" message="This event doesn't exist or has been removed." />;

  return (
    <div className="max-w-4xl mx-auto py-8 animate-in fade-in zoom-in-95 duration-500">
      {/* Event Header */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden mb-10 transition-colors">
        <div className="h-48 md:h-64 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-brand-900 dark:to-indigo-950 flex items-end p-8 text-white relative">
          <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
            {event.type}
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold mb-3 tracking-tight">{event.title}</h1>
            <p className="text-gray-300 flex items-center gap-2 font-medium">
              <Info className="w-4 h-4" /> Organized by {event.organiser_name || 'Organiser'}
            </p>
          </div>
        </div>
        <div className="p-8">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">About this event</h3>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">{event.description}</p>
        </div>
      </div>

      {/* Shows List */}
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Available Shows</h2>
      
      {shows.length === 0 ? (
        <EmptyState title="No shows scheduled" message="There are currently no shows available for this event." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {shows.map(show => (
            <div key={show.id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-md transition-all duration-300 group flex flex-col justify-between">
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-5">{show.venue_name}</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center text-sm text-gray-700 dark:text-gray-300 gap-4">
                    <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <span className="font-medium">{new Date(show.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-700 dark:text-gray-300 gap-4">
                    <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
                      <Clock className="w-5 h-5" />
                    </div>
                    <span className="font-medium">{show.time}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-700 dark:text-gray-300 gap-4">
                    <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <span className="font-medium line-clamp-1">{show.venue_name}</span>
                  </div>
                </div>
              </div>
              
              <Link 
                to={`/shows/${show.id}/seats`} 
                className="block text-center bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-3.5 rounded-xl font-bold hover:bg-brand-600 dark:hover:bg-brand-500 hover:text-white transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                Select Seats
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
