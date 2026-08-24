import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = () => {
    api.get('/bookings/my').then(res => setBookings(res.data)).catch(console.error);
  };

  const cancelBooking = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await api.delete(`/bookings/${id}/cancel`);
      fetchBookings();
    } catch (err) {
      setError(err.response?.data?.message || 'Cancel failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">My Bookings</h1>
      {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4">{error}</div>}
      
      <div className="grid gap-4">
        {bookings.map(b => (
          <div key={b.id} className="bg-white p-4 rounded shadow flex flex-col md:flex-row justify-between">
            <div>
              <p className="text-xl font-bold">{b.event_title}</p>
              <p className="text-gray-600">{b.venue_name} • {new Date(b.date).toLocaleDateString()} at {b.time}</p>
              <p className="mt-2 text-sm text-gray-500">Ref: <span className="font-mono bg-gray-100 p-1 rounded">{b.booking_ref}</span></p>
              <p className="mt-1 font-semibold text-blue-600">Total: ₹{b.total_amount}</p>
              <p className="mt-1 font-bold text-sm">Status: <span className={b.status === 'confirmed' ? 'text-green-600' : 'text-red-600'}>{b.status.toUpperCase()}</span></p>
            </div>
            
            <div className="mt-4 md:mt-0 flex flex-col items-center justify-center gap-2">
              {b.status === 'confirmed' && (
                <>
                  <button onClick={() => cancelBooking(b.id)} className="text-red-500 text-sm hover:underline">Cancel Booking</button>
                  <LinkToQR id={b.id} />
                </>
              )}
            </div>
          </div>
        ))}
        {bookings.length === 0 && <p>You have no bookings.</p>}
      </div>
    </div>
  );
}

function LinkToQR({ id }) {
  const [qr, setQr] = useState('');
  useEffect(() => {
    api.get(`/bookings/${id}`).then(res => setQr(res.data.qrDataUrl)).catch(() => {});
  }, [id]);

  if (!qr) return null;
  return <img src={qr} alt="QR Code" className="w-24 h-24 border" />;
}
