import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { Loader2, Monitor, ArrowLeft, Ticket, Clock as ClockIcon } from 'lucide-react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { Skeleton } from '../components/Skeleton';

export default function SeatMap() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [show, setShow] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeatObjects, setSelectedSeatObjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [expireTime, setExpireTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    api.get(`/shows/${id}/seats`)
      .then(res => {
        setShow({ event: res.data.event, venue: res.data.venue, date: res.data.date, time: res.data.time });
        setSeats(res.data.seats);
        
        // Find existing held seats for this user
        const myHeldSeats = res.data.seats.filter(s => s.status === 'held' && s.held_by === user.id);
        if (myHeldSeats.length > 0) {
          setSelectedSeatObjects(myHeldSeats);
          const earliest = Math.min(...myHeldSeats.map(s => new Date(s.held_until).getTime()));
          setExpireTime(earliest);
        }
      })
      .catch(err => {
        toast.error('Failed to load seats');
        console.error(err);
      })
      .finally(() => setIsLoading(false));

    const token = localStorage.getItem('token');
    const newSocket = io('http://localhost:5000', { auth: { token } });

    newSocket.on('connect', () => newSocket.emit('join-show', id));

    newSocket.on('seat:held', ({ showSeatId, customerId }) => {
      setSeats(prev => prev.map(s => s.id === showSeatId ? { ...s, status: 'held', held_by: customerId } : s));
    });

    newSocket.on('seat:released', ({ showSeatId }) => {
      setSeats(prev => prev.map(s => s.id === showSeatId ? { ...s, status: 'available', held_by: null, held_until: null } : s));
      // If someone else's release matches our selection, remove it
      setSelectedSeatObjects(prev => {
        const next = prev.filter(s => s.id !== showSeatId);
        if (next.length === 0) setExpireTime(null);
        return next;
      });
    });

    newSocket.on('seat:booked', ({ showSeatIds }) => {
      setSeats(prev => prev.map(s => showSeatIds.includes(s.id) ? { ...s, status: 'booked' } : s));
      setSelectedSeatObjects(prev => {
        const next = prev.filter(s => !showSeatIds.includes(s.id));
        if (next.length === 0) setExpireTime(null);
        return next;
      });
    });

    return () => {
      newSocket.emit('leave-show', id);
      newSocket.disconnect();
    };
  }, [id, user, navigate]);

  useEffect(() => {
    if (!expireTime || selectedSeatObjects.length === 0) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.floor((expireTime - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        handleHoldExpiry();
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    // Initial check
    const initialRemaining = Math.floor((expireTime - Date.now()) / 1000);
    if (initialRemaining <= 0) {
      setTimeLeft(0);
      handleHoldExpiry();
    } else {
      setTimeLeft(initialRemaining);
    }

    return () => clearInterval(interval);
  }, [expireTime, selectedSeatObjects.length]);

  const handleHoldExpiry = () => {
    toast.error('Your seat hold has expired. Please select seats again.');
    const expiredIds = selectedSeatObjects.map(s => s.id);
    setSelectedSeatObjects([]);
    setExpireTime(null);
    setSeats(prev => prev.map(s => expiredIds.includes(s.id) ? { ...s, status: 'available', held_by: null, held_until: null } : s));
  };

  const handleSeatClick = async (seat) => {
    if (seat.status === 'booked') return;
    if (seat.status === 'held' && seat.held_by !== user.id) return;

    const isSelected = selectedSeatObjects.some(s => s.id === seat.id);

    if (isSelected) {
      try {
        await api.post(`/shows/${id}/release`, { showSeatIds: [seat.id] });
        setSelectedSeatObjects(prev => {
          const next = prev.filter(s => s.id !== seat.id);
          if (next.length === 0) setExpireTime(null);
          return next;
        });
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to release seat');
      }
    } else {
      try {
        const res = await api.post(`/shows/${id}/hold`, { showSeatIds: [seat.id] });
        setSelectedSeatObjects(prev => [...prev, seat]);
        if (!expireTime && res.data.held_until) {
          setExpireTime(new Date(res.data.held_until).getTime());
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Seat is no longer available');
      }
    }
  };

  const confirmBooking = async () => {
    if (selectedSeatObjects.length === 0 || timeLeft === 0) return;
    setIsConfirming(true);
    try {
      await api.post('/bookings/confirm', { showSeatIds: selectedSeatObjects.map(s => s.id) });
      toast.success('Booking confirmed successfully!');
      setExpireTime(null); // Clear timer
      navigate('/my-bookings');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
      setIsConfirming(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const totalPrice = selectedSeatObjects.reduce((sum, s) => sum + Number(s.price), 0);
  
  const breakdown = selectedSeatObjects.reduce((acc, s) => {
    acc[s.category] = (acc[s.category] || 0) + 1;
    return acc;
  }, {});

  const categoriesMap = seats.reduce((acc, seat) => {
    if (!acc[seat.category]) acc[seat.category] = seat.price;
    return acc;
  }, {});
  const categories = Object.entries(categoriesMap).map(([name, price]) => ({ name, price }));

  const getCategoryStyles = (category) => {
    switch (category?.toLowerCase()) {
      case 'vip': return 'bg-fuchsia-100 dark:bg-fuchsia-900/30 border-fuchsia-300 dark:border-fuchsia-700 hover:bg-fuchsia-200 dark:hover:bg-fuchsia-800/50 text-fuchsia-800 dark:text-fuchsia-300';
      case 'premium': return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-800/50 text-blue-800 dark:text-blue-300';
      default: return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <Skeleton className="h-12 w-1/3 mb-2 dark:bg-gray-800" />
        <Skeleton className="h-6 w-1/4 mb-8 dark:bg-gray-800" />
        <Skeleton className="h-[500px] w-full rounded-3xl dark:bg-gray-800" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-40 animate-in fade-in duration-500">
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 mb-8 transition-colors font-medium">
        <ArrowLeft className="w-5 h-5 mr-2" /> Back to Event
      </button>

      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-3 tracking-tight">{show?.event}</h1>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-medium text-lg">
            <Ticket className="w-5 h-5 text-brand-500" />
            <span>{show?.venue}</span>
            <span className="text-gray-300 dark:text-gray-700 mx-2">•</span> 
            <span>{new Date(show?.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at {show?.time}</span>
          </div>
        </div>
        
        {timeLeft !== null && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-xl border border-amber-200 dark:border-amber-800/50 shadow-sm animate-in fade-in zoom-in">
            <ClockIcon className="w-5 h-5 animate-pulse" />
            <span className="font-bold font-mono text-lg">{formatTime(timeLeft)}</span>
            <span className="text-sm font-medium">remaining</span>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-x-auto relative mb-6 transition-colors">
        {/* Stage */}
        <div className="flex flex-col items-center mb-20">
          <div className="w-full max-w-2xl h-16 bg-gradient-to-b from-gray-100 to-transparent dark:from-gray-800 border-t-8 border-gray-300 dark:border-gray-700 rounded-t-[100%] flex items-center justify-center shadow-inner">
            <span className="text-sm font-bold text-gray-400 dark:text-gray-500 tracking-[0.3em] flex items-center gap-2 mt-2">
              <Monitor className="w-5 h-5" /> STAGE
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col items-center gap-4 mb-12 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl max-w-4xl mx-auto">
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pricing Categories</p>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
            {categories.map(cat => (
              <div key={cat.name} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-lg border shadow-sm ${getCategoryStyles(cat.name)}`}></div>
                <span className="text-gray-700 dark:text-gray-300 font-medium">{cat.name} <span className="font-bold ml-1 text-gray-900 dark:text-white">₹{cat.price}</span></span>
              </div>
            ))}
          </div>
          
          <div className="h-px w-full bg-gray-200 dark:bg-gray-700 my-2"></div>
          
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
            <div className="flex items-center gap-3"><div className="w-6 h-6 rounded-lg bg-brand-500 border border-brand-600 shadow-sm"></div><span className="text-gray-700 dark:text-gray-300 font-medium">Selected (Yours)</span></div>
            <div className="flex items-center gap-3"><div className="w-6 h-6 rounded-lg bg-amber-400 border border-amber-500 shadow-sm"></div><span className="text-gray-700 dark:text-gray-300 font-medium">Held (Others)</span></div>
            <div className="flex items-center gap-3"><div className="w-6 h-6 rounded-lg bg-gray-300 dark:bg-gray-700 border border-gray-400 dark:border-gray-600 opacity-50 shadow-sm flex items-center justify-center"><span className="text-[10px] text-gray-500 font-bold">X</span></div><span className="text-gray-700 dark:text-gray-300 font-medium">Booked</span></div>
          </div>
        </div>

        {/* Seat Grid */}
        <div className="flex flex-col items-center gap-4 pb-8 min-w-max">
          {Object.entries(
            seats.reduce((acc, seat) => {
              if (!acc[seat.row_label]) acc[seat.row_label] = [];
              acc[seat.row_label].push(seat);
              return acc;
            }, {})
          ).map(([rowLabel, rowSeats]) => (
            <div key={rowLabel} className="flex items-center gap-4">
              <div className="w-6 text-center font-bold text-gray-400 dark:text-gray-500">{rowLabel}</div>
              <div className="flex gap-3">
                {rowSeats.map(seat => {
                  const isSelected = selectedSeatObjects.some(s => s.id === seat.id);
                  
                  let colorClasses = getCategoryStyles(seat.category);
                  let cursor = 'cursor-pointer';
                  let content = <><span className="text-[10px] opacity-70 font-semibold leading-none mb-0.5">{seat.row_label}</span><span className="text-xs font-bold leading-none">{seat.seat_number}</span></>;
                  
                  if (seat.status === 'booked') {
                    colorClasses = 'bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-600 opacity-50';
                    cursor = 'cursor-not-allowed';
                    content = <span className="text-lg font-bold text-gray-400 dark:text-gray-600">×</span>;
                  } else if (seat.status === 'held') {
                    if (seat.held_by === user?.id) {
                      colorClasses = 'bg-brand-500 border-brand-600 text-white shadow-md transform scale-105';
                    } else {
                      colorClasses = 'bg-amber-400 border-amber-500 text-amber-900 shadow-sm';
                      cursor = 'cursor-not-allowed';
                    }
                  }
                  if (isSelected) {
                    colorClasses = 'bg-brand-500 border-brand-600 text-white shadow-md transform scale-110 ring-4 ring-brand-500/30';
                  }

                  return (
                    <div 
                      key={seat.id}
                      onClick={() => handleSeatClick(seat)}
                      className={`w-11 h-11 sm:w-12 sm:h-12 flex flex-col items-center justify-center rounded-t-xl rounded-b-md border-2 transition-all duration-200 ${colorClasses} ${cursor}`}
                      title={`${seat.category} - Row ${seat.row_label} Seat ${seat.seat_number} - ₹${seat.price}`}
                    >
                      {content}
                    </div>
                  );
                })}
              </div>
              <div className="w-6 text-center font-bold text-gray-400 dark:text-gray-500">{rowLabel}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      {selectedSeatObjects.length > 0 && (
        <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.3)] p-4 md:p-6 z-40 transform translate-y-0 transition-all duration-500 animate-in slide-in-from-bottom-full">
          <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left flex-1">
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Selected Seats</p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                {selectedSeatObjects.map(s => (
                  <span key={s.id} className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 rounded text-sm font-bold border border-gray-200 dark:border-gray-700">
                    {s.row_label}{s.seat_number}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {Object.entries(breakdown).map(([cat, count]) => `${count}x ${cat}`).join(' • ')}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-8 w-full md:w-auto">
              {timeLeft !== null && (
                <div className="text-center sm:text-right hidden md:block mr-4">
                  <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-1">Time Remaining</p>
                  <p className={`font-mono font-bold text-xl ${timeLeft < 60 ? 'text-red-500' : 'text-amber-500'}`}>
                    {formatTime(timeLeft)}
                  </p>
                </div>
              )}
              
              <div className="text-center md:text-right flex-1 sm:flex-none">
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Total Price</p>
                <p className="font-extrabold text-3xl text-gray-900 dark:text-white tracking-tight">₹{totalPrice}</p>
              </div>
              
              <button 
                onClick={confirmBooking}
                disabled={isConfirming || timeLeft === 0}
                className="w-full sm:w-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-10 py-4 rounded-xl font-bold text-lg hover:bg-brand-600 dark:hover:bg-brand-400 hover:text-white transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
              >
                {isConfirming && <Loader2 className="w-6 h-6 animate-spin" />}
                {isConfirming ? 'Processing...' : 'Checkout Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
