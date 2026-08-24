import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

export default function SeatMap() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [show, setShow] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    api.get(`/shows/${id}/seats`).then(res => {
      setShow({ event: res.data.event, venue: res.data.venue, date: res.data.date, time: res.data.time });
      setSeats(res.data.seats);
    }).catch(console.error);

    const token = localStorage.getItem('token');
    const newSocket = io('http://localhost:5000', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      newSocket.emit('join-show', id);
    });

    newSocket.on('seat:held', ({ showSeatId, customerId }) => {
      setSeats(prev => prev.map(s => s.id === showSeatId ? { ...s, status: 'held', held_by: customerId } : s));
    });

    newSocket.on('seat:released', ({ showSeatId }) => {
      setSeats(prev => prev.map(s => s.id === showSeatId ? { ...s, status: 'available', held_by: null } : s));
      setSelectedSeats(prev => prev.filter(id => id !== showSeatId));
    });

    newSocket.on('seat:booked', ({ showSeatIds }) => {
      setSeats(prev => prev.map(s => showSeatIds.includes(s.id) ? { ...s, status: 'booked' } : s));
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('leave-show', id);
      newSocket.disconnect();
    };
  }, [id, user, navigate]);

  const handleSeatClick = async (seat) => {
    if (seat.status === 'booked') return;
    if (seat.status === 'held' && seat.held_by !== user.id) return;

    if (selectedSeats.includes(seat.id)) {
      // Release
      try {
        await api.post(`/shows/${id}/release`, { showSeatIds: [seat.id] });
        setSelectedSeats(prev => prev.filter(sid => sid !== seat.id));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to release seat');
      }
    } else {
      // Hold
      try {
        await api.post(`/shows/${id}/hold`, { showSeatIds: [seat.id] });
        setSelectedSeats(prev => [...prev, seat.id]);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to hold seat');
      }
    }
  };

  const confirmBooking = async () => {
    if (selectedSeats.length === 0) return;
    try {
      await api.post('/bookings/confirm', { showSeatIds: selectedSeats });
      navigate('/my-bookings');
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed');
    }
  };

  if (!show) return <div>Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold">{show.event}</h1>
          <p className="text-gray-600">{show.venue} • {new Date(show.date).toLocaleDateString()} at {show.time}</p>
        </div>
        <button 
          onClick={confirmBooking}
          disabled={selectedSeats.length === 0}
          className="bg-green-600 text-white px-6 py-2 rounded disabled:opacity-50"
        >
          Confirm Booking ({selectedSeats.length})
        </button>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4">{error}</div>}

      <div className="bg-white p-6 rounded shadow overflow-auto">
        <div className="flex justify-center mb-8"><div className="w-2/3 h-4 bg-gray-300 rounded text-center text-xs">STAGE</div></div>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(40px, 1fr))' }}>
          {seats.map(seat => {
            let color = 'bg-gray-200 hover:bg-blue-200'; // available
            if (seat.status === 'booked') color = 'bg-red-500 cursor-not-allowed';
            else if (seat.status === 'held') {
              color = seat.held_by === user?.id ? 'bg-blue-500 text-white' : 'bg-yellow-400 cursor-not-allowed';
            }
            if (selectedSeats.includes(seat.id)) color = 'bg-blue-500 text-white';

            return (
              <div 
                key={seat.id}
                onClick={() => handleSeatClick(seat)}
                className={`p-2 rounded text-center text-xs cursor-pointer border ${color}`}
                title={`${seat.category} - Row ${seat.row_label} Seat ${seat.seat_number} - ₹${seat.price}`}
              >
                {seat.row_label}{seat.seat_number}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
