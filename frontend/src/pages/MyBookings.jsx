import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Calendar, Clock, MapPin, XCircle, Ticket, Filter } from 'lucide-react';
import api from '../api/axios';
import { Skeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState(null);
  
  // Pagination and Filtering State
  const [filter, setFilter] = useState('upcoming');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const limit = 8;

  useEffect(() => {
    fetchBookings(filter, 1, true);
  }, [filter]);

  const fetchBookings = (currentFilter, currentPage, reset = false) => {
    if (reset) setIsLoading(true);
    else setIsLoadingMore(true);

    api.get(`/bookings/my?filter=${currentFilter}&page=${currentPage}&limit=${limit}`)
      .then(res => {
        if (reset) {
          setBookings(res.data.bookings);
        } else {
          setBookings(prev => [...prev, ...res.data.bookings]);
        }
        setHasMore(res.data.hasMore);
      })
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => {
        setIsLoading(false);
        setIsLoadingMore(false);
      });
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchBookings(filter, nextPage, false);
  };

  const handleFilterChange = (newFilter) => {
    if (filter === newFilter) return;
    setFilter(newFilter);
    setPage(1);
  };

  const cancelBooking = async (id) => {
    try {
      await api.delete(`/bookings/${id}/cancel`);
      toast.success('Booking cancelled successfully');
      setCancelModal(null);
      // Update local state instead of doing a full refetch so we don't mess up pagination
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
      // If we are on 'upcoming', we might want to remove it entirely or just show it cancelled.
      // Usually it's nice to keep it on screen as cancelled so they know it worked.
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancel failed');
    }
  };

  const tabs = [
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'past', label: 'Past' },
    { id: 'cancelled', label: 'Cancelled' },
    { id: 'all', label: 'All' },
  ];

  return (
    <div className="max-w-4xl mx-auto py-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">My Bookings</h1>
        
        {/* Filter Tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-full md:w-auto overflow-x-auto hide-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleFilterChange(tab.id)}
              className={`flex-1 md:flex-none px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                filter === tab.id 
                  ? 'bg-white dark:bg-gray-900 text-brand-600 dark:text-brand-400 shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-2xl dark:bg-gray-800" />
          <Skeleton className="h-48 w-full rounded-2xl dark:bg-gray-800" />
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState 
          title={`No ${filter === 'all' ? '' : filter} bookings found`}
          message={filter === 'upcoming' ? "You don't have any upcoming events. Browse events and grab your seats!" : "Nothing to show here."} 
          icon={filter === 'cancelled' ? XCircle : filter === 'past' ? Clock : Ticket}
        />
      ) : (
        <>
          <div className="space-y-6">
            {bookings.map(b => (
              <div key={b.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col md:flex-row relative transition-all hover:shadow-md">
                
                {/* Status Ribbon */}
                <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-xl text-xs font-bold text-white shadow-sm
                  ${b.status === 'confirmed' ? 'bg-green-500 dark:bg-green-600' : 'bg-red-500 dark:bg-red-600'}`}>
                  {b.status.toUpperCase()}
                </div>

                {/* Main Content */}
                <div className="p-6 md:p-8 flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-5 pr-16">{b.event_title}</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center text-gray-600 dark:text-gray-300 gap-3 font-medium">
                      <div className="p-1.5 bg-brand-50 dark:bg-brand-900/30 rounded-lg text-brand-500 dark:text-brand-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <span>{new Date(b.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center text-gray-600 dark:text-gray-300 gap-3 font-medium">
                      <div className="p-1.5 bg-brand-50 dark:bg-brand-900/30 rounded-lg text-brand-500 dark:text-brand-400">
                        <Clock className="w-4 h-4" />
                      </div>
                      <span>{b.time}</span>
                    </div>
                    <div className="flex items-center text-gray-600 dark:text-gray-300 gap-3 sm:col-span-2 font-medium">
                      <div className="p-1.5 bg-brand-50 dark:bg-brand-900/30 rounded-lg text-brand-500 dark:text-brand-400">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <span>{b.venue_name}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 pt-6 border-t border-gray-100 dark:border-gray-800 mt-6">
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium uppercase tracking-wider">Booked Seats Breakdown</p>
                      <div className="flex flex-wrap gap-2">
                        {b.seats && b.seats.length > 0 ? (
                          b.seats.map((s, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 px-3 py-1.5 rounded-lg shadow-sm">
                              <span className="font-bold text-gray-900 dark:text-white">{s.seat}</span>
                              <span className="text-xs font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-1.5 py-0.5 rounded">{s.category}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">₹{s.price}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-500">N/A</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4">
                      <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 flex-1 min-w-[150px]">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Booking Reference</p>
                        <p className="font-mono font-bold text-gray-900 dark:text-white tracking-wider">{b.booking_ref}</p>
                      </div>
                      <div className="bg-brand-50 dark:bg-brand-900/20 px-4 py-2.5 rounded-xl border border-brand-100 dark:border-brand-900/50 flex-1 min-w-[150px]">
                        <p className="text-xs text-brand-600 dark:text-brand-400 mb-1 font-medium">Total Amount</p>
                        <p className="font-bold text-brand-700 dark:text-brand-300">₹{b.total_amount}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Sidebar Action / QR */}
                <div className="bg-gray-50 dark:bg-gray-800/30 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 p-6 flex flex-col items-center justify-center min-w-[220px] gap-4">
                  {b.status === 'confirmed' ? (
                    <>
                      <p className="text-xs font-bold text-gray-400 dark:text-gray-500 text-center uppercase tracking-widest">Entry Ticket</p>
                      <LinkToQR id={b.id} />
                      {new Date(b.date) >= new Date() && (
                        <button 
                          onClick={() => setCancelModal(b.id)} 
                          className="text-red-500 dark:text-red-400 text-sm font-medium hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1.5 mt-2 transition-colors py-2 px-3 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <XCircle className="w-4 h-4" /> Cancel Booking
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 gap-3 h-full">
                      <XCircle className="w-12 h-12 text-red-200 dark:text-red-900/50" />
                      <p className="text-sm font-bold uppercase tracking-wider">Cancelled</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3 px-8 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoadingMore ? 'Loading...' : 'Load More Bookings'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center animate-in fade-in zoom-in duration-200 border border-gray-100 dark:border-gray-800">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Cancel Booking?</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">Are you sure you want to cancel this booking? This action cannot be undone and your seats will be released.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setCancelModal(null)}
                className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold py-3.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                No, Keep it
              </button>
              <button 
                onClick={() => cancelBooking(cancelModal)}
                className="flex-1 bg-red-600 dark:bg-red-500 text-white font-bold py-3.5 rounded-xl hover:bg-red-700 dark:hover:bg-red-600 transition-colors shadow-md hover:shadow-lg active:scale-95"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LinkToQR({ id }) {
  const [qr, setQr] = useState('');
  useEffect(() => {
    api.get(`/bookings/${id}`).then(res => setQr(res.data.qrDataUrl)).catch(() => {});
  }, [id]);

  if (!qr) return <div className="w-32 h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse"></div>;
  return (
    <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:scale-105 transition-transform duration-300">
      <img src={qr} alt="QR Code" className="w-28 h-28 object-contain" />
    </div>
  );
}
