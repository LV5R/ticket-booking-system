import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function Home() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api.get('/events').then(res => setEvents(res.data)).catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Upcoming Events</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {events.map(event => (
          <div key={event.id} className="bg-white p-4 rounded shadow hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-bold">{event.title}</h2>
            <p className="text-gray-500 mb-2">{event.type}</p>
            <p className="text-sm mb-4 line-clamp-3">{event.description}</p>
            <p className="text-xs text-gray-400 mb-4">By: {event.organiser_name}</p>
            <Link to={`/events/${event.id}`} className="bg-blue-600 text-white px-4 py-2 rounded inline-block">
              View Shows
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
