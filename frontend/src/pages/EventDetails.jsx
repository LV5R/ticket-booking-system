import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';

export default function EventDetails() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [shows, setShows] = useState([]);

  useEffect(() => {
    api.get(`/events/${id}`).then(res => setEvent(res.data)).catch(console.error);
    api.get(`/shows/event/${id}`).then(res => setShows(res.data)).catch(console.error);
  }, [id]);

  if (!event) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded shadow mb-6">
        <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
        <p className="text-gray-600 mb-4">{event.type}</p>
        <p>{event.description}</p>
      </div>

      <h2 className="text-2xl font-bold mb-4">Shows</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shows.map(show => (
          <div key={show.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
            <div>
              <p className="font-bold">{show.venue_name}</p>
              <p className="text-gray-600">{new Date(show.date).toLocaleDateString()} at {show.time}</p>
            </div>
            <Link to={`/shows/${show.id}/seats`} className="bg-green-600 text-white px-4 py-2 rounded">
              Book Seats
            </Link>
          </div>
        ))}
        {shows.length === 0 && <p>No shows scheduled for this event.</p>}
      </div>
    </div>
  );
}
