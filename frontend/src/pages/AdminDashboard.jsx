import { useState } from 'react';
import api from '../api/axios';

export default function AdminDashboard() {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  
  const [venueId, setVenueId] = useState('');
  const [rows, setRows] = useState(10);
  const [seatsPerRow, setSeatsPerRow] = useState(10);

  const createVenue = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/venues', { name, address });
      alert(`Venue created with ID: ${res.data.id}`);
      setName(''); setAddress('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create venue');
    }
  };

  const generateSeats = async (e) => {
    e.preventDefault();
    
    const seats = [];
    for (let r = 0; r < rows; r++) {
      const rowLabel = String.fromCharCode(65 + r); // A, B, C...
      const category = r < 2 ? 'VIP' : (r < 5 ? 'Premium' : 'Standard');
      
      for (let s = 1; s <= seatsPerRow; s++) {
        seats.push({ category, row_label: rowLabel, seat_number: s });
      }
    }

    try {
      await api.post(`/venues/${venueId}/seats`, { seats });
      alert('Seats generated successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate seats');
    }
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Create Venue</h2>
        <form onSubmit={createVenue} className="bg-white p-4 rounded shadow flex flex-col gap-4">
          <input type="text" placeholder="Venue Name" required className="border p-2" value={name} onChange={e => setName(e.target.value)} />
          <input type="text" placeholder="Address" required className="border p-2" value={address} onChange={e => setAddress(e.target.value)} />
          <button type="submit" className="bg-purple-600 text-white p-2">Create Venue</button>
        </form>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Bulk Generate Seats</h2>
        <form onSubmit={generateSeats} className="bg-white p-4 rounded shadow flex flex-col gap-4">
          <input type="number" placeholder="Venue ID" required className="border p-2" value={venueId} onChange={e => setVenueId(e.target.value)} />
          <div className="flex gap-4">
            <input type="number" placeholder="Rows" required className="border p-2 w-1/2" value={rows} onChange={e => setRows(e.target.value)} />
            <input type="number" placeholder="Seats per row" required className="border p-2 w-1/2" value={seatsPerRow} onChange={e => setSeatsPerRow(e.target.value)} />
          </div>
          <button type="submit" className="bg-purple-600 text-white p-2">Generate Seats</button>
        </form>
      </div>
    </div>
  );
}
