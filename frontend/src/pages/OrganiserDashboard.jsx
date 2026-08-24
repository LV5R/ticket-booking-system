import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function OrganiserDashboard() {
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Concert');
  const [description, setDescription] = useState('');

  // Show creation state
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedVenue, setSelectedVenue] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const [revenue, setRevenue] = useState(null);

  useEffect(() => {
    fetchEvents();
    api.get('/venues').then(res => setVenues(res.data)).catch(console.error);
  }, []);

  const fetchEvents = () => {
    api.get('/events').then(res => setEvents(res.data)).catch(console.error);
  };

  const createEvent = async (e) => {
    e.preventDefault();
    try {
      await api.post('/events', { title, type, description });
      setTitle(''); setDescription('');
      fetchEvents();
      alert('Event created!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create event');
    }
  };

  const createShow = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/events/${selectedEvent}/shows`, {
        venue_id: selectedVenue,
        date, time,
        prices: { 'VIP': 5000, 'Premium': 3000, 'Standard': 1000 } // Hardcoded for demo
      });
      alert('Show created!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create show');
    }
  };

  const viewRevenue = async (eventId) => {
    try {
      const res = await api.get(`/events/${eventId}/revenue`);
      setRevenue(res.data);
    } catch (err) {
      alert('No revenue data yet');
    }
  };

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Create Event</h2>
        <form onSubmit={createEvent} className="bg-white p-4 rounded shadow flex flex-col gap-4">
          <input type="text" placeholder="Title" required className="border p-2" value={title} onChange={e => setTitle(e.target.value)} />
          <input type="text" placeholder="Type (e.g., Concert, Theater)" required className="border p-2" value={type} onChange={e => setType(e.target.value)} />
          <textarea placeholder="Description" className="border p-2" value={description} onChange={e => setDescription(e.target.value)}></textarea>
          <button type="submit" className="bg-blue-600 text-white p-2">Create Event</button>
        </form>

        <h2 className="text-2xl font-bold mt-8 mb-4">Create Show for Event</h2>
        <form onSubmit={createShow} className="bg-white p-4 rounded shadow flex flex-col gap-4">
          <select className="border p-2" value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)} required>
            <option value="">Select Event</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
          </select>
          <select className="border p-2" value={selectedVenue} onChange={e => setSelectedVenue(e.target.value)} required>
            <option value="">Select Venue</option>
            {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <input type="date" required className="border p-2" value={date} onChange={e => setDate(e.target.value)} />
          <input type="time" required className="border p-2" value={time} onChange={e => setTime(e.target.value)} />
          <p className="text-xs text-gray-500">Note: Prices are hardcoded to VIP/Premium/Standard for demo.</p>
          <button type="submit" className="bg-blue-600 text-white p-2">Create Show</button>
        </form>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">My Events</h2>
        <div className="grid gap-4">
          {events.map(ev => (
            <div key={ev.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
              <div>
                <p className="font-bold">{ev.title}</p>
                <p className="text-sm text-gray-500">{ev.type}</p>
              </div>
              <button onClick={() => viewRevenue(ev.id)} className="text-blue-600 text-sm hover:underline">View Revenue</button>
            </div>
          ))}
        </div>

        {revenue && (
          <div className="mt-8 bg-green-50 p-6 rounded shadow border border-green-200">
            <h3 className="text-xl font-bold text-green-800 mb-4">Revenue: {revenue.event_title}</h3>
            <div className="grid grid-cols-3 gap-4 mb-4 text-center">
              <div className="bg-white p-2 rounded shadow"><p className="text-sm text-gray-500">Bookings</p><p className="font-bold">{revenue.summary.total_bookings}</p></div>
              <div className="bg-white p-2 rounded shadow"><p className="text-sm text-gray-500">Seats Sold</p><p className="font-bold">{revenue.summary.total_seats_sold}</p></div>
              <div className="bg-white p-2 rounded shadow"><p className="text-sm text-gray-500">Revenue</p><p className="font-bold text-green-600">₹{revenue.summary.total_revenue}</p></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
