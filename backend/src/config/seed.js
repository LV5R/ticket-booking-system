import pool from './db.js';
import bcrypt from 'bcrypt';

const seed = async () => {
  console.log('🌱 Starting database seed with expanded layouts...');
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Clear existing shows and seats for a clean slate
    await client.query('TRUNCATE shows, show_seats, seat_layouts, events, venues, bookings, booking_seats, waitlist CASCADE');

    // 2. Create Users
    console.log('Creating users...');
    const passHash = await bcrypt.hash('password123', 10);
    const { rows: users } = await client.query(`
      INSERT INTO users (name, email, password_hash, role) VALUES 
      ('Admin User', 'admin@example.com', $1, 'admin'),
      ('LiveNation', 'organiser@example.com', $1, 'organiser'),
      ('John Doe', 'john@example.com', $1, 'customer')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, role;
    `, [passHash]);

    const adminId = users.find(u => u.role === 'admin').id;
    const orgId = users.find(u => u.role === 'organiser').id;

    // 3. Create Venues
    console.log('Creating venues...');
    const { rows: venues } = await client.query(`
      INSERT INTO venues (name, address, created_by) VALUES 
      ('Grand Arena', '123 Stadium Drive, City Center', $1),
      ('Intimate Theater', '45 Arts District, Downtown', $1)
      RETURNING id, name;
    `, [adminId]);

    const arenaId = venues.find(v => v.name === 'Grand Arena').id;
    const theaterId = venues.find(v => v.name === 'Intimate Theater').id;

    // 4. Create Seat Layouts (Expanded)
    console.log('Creating seat layouts...');
    const arenaSeats = [];
    // Arena: 6 rows (A-F), 10 seats each
    // A, B = VIP; C, D = Premium; E, F = Standard
    for(let rIdx = 0; rIdx < 6; rIdx++) {
      let cat = 'Standard';
      if (rIdx < 2) cat = 'VIP';
      else if (rIdx < 4) cat = 'Premium';
      for(let s = 1; s <= 10; s++) {
        arenaSeats.push(`('${cat}', '${String.fromCharCode(65 + rIdx)}', ${s}, ${arenaId})`);
      }
    }
    if (arenaSeats.length) {
      await client.query(`
        INSERT INTO seat_layouts (category, row_label, seat_number, venue_id) 
        VALUES ${arenaSeats.join(',')}
      `);
    }

    const theaterSeats = [];
    // Theater: 5 rows (A-E), 8 seats each
    // A = VIP; B, C = Premium; D, E = Standard
    for(let rIdx = 0; rIdx < 5; rIdx++) {
      let cat = 'Standard';
      if (rIdx === 0) cat = 'VIP';
      else if (rIdx < 3) cat = 'Premium';
      for(let s = 1; s <= 8; s++) {
        theaterSeats.push(`('${cat}', '${String.fromCharCode(65 + rIdx)}', ${s}, ${theaterId})`);
      }
    }
    if (theaterSeats.length) {
      await client.query(`
        INSERT INTO seat_layouts (category, row_label, seat_number, venue_id) 
        VALUES ${theaterSeats.join(',')}
      `);
    }

    // 5. Create Events
    console.log('Creating events...');
    const { rows: events } = await client.query(`
      INSERT INTO events (title, type, description, organiser_id) VALUES 
      ('Summer Music Festival 2026', 'Concert', 'The biggest music event of the summer featuring top artists.', $1),
      ('Hamilton', 'Theater', 'The hit Broadway musical comes to town.', $1)
      RETURNING id, title;
    `, [orgId]);

    const concertId = events.find(e => e.title.includes('Summer')).id;
    const theaterEvId = events.find(e => e.title.includes('Hamilton')).id;

    // 6. Create Shows and Show Seats
    console.log('Creating shows and seats...');
    
    // Show 1: Concert at Arena
    const { rows: show1 } = await client.query(`
      INSERT INTO shows (event_id, venue_id, date, time) VALUES 
      ($1, $2, CURRENT_DATE + INTERVAL '14 days', '19:00')
      RETURNING id;
    `, [concertId, arenaId]);

    await client.query(`
      INSERT INTO show_seats (show_id, seat_layout_id, price, status)
      SELECT $1, id, 
        CASE WHEN category = 'VIP' THEN 5000 
             WHEN category = 'Premium' THEN 3000 
             ELSE 1500 END,
        'available'
      FROM seat_layouts WHERE venue_id = $2
    `, [show1[0].id, arenaId]);

    // Show 2: Theater at Theater
    const { rows: show2 } = await client.query(`
      INSERT INTO shows (event_id, venue_id, date, time) VALUES 
      ($1, $2, CURRENT_DATE + INTERVAL '7 days', '20:00')
      RETURNING id;
    `, [theaterEvId, theaterId]);

    await client.query(`
      INSERT INTO show_seats (show_id, seat_layout_id, price, status)
      SELECT $1, id, 
        CASE WHEN category = 'VIP' THEN 4000 
             WHEN category = 'Premium' THEN 2500
             ELSE 1000 END,
        'available'
      FROM seat_layouts WHERE venue_id = $2
    `, [show2[0].id, theaterId]);

    await client.query('COMMIT');
    console.log('✅ Seeding completed successfully!');
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err);
  } finally {
    client.release();
    process.exit(0);
  }
};

seed();
