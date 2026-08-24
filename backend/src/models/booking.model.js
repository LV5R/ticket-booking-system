import pool from '../config/db.js';

export const createBooking = async ({ customerId, showId, bookingRef, qrPayload, totalAmount }, client = pool) => {
  const { rows } = await client.query(
    `INSERT INTO bookings (customer_id, show_id, booking_ref, qr_payload, status, total_amount)
     VALUES ($1, $2, $3, $4, 'confirmed', $5)
     RETURNING *`,
    [customerId, showId, bookingRef, qrPayload, totalAmount]
  );
  return rows[0];
};

export const createBookingSeats = async (bookingId, showSeatIds, client = pool) => {
  if (!showSeatIds.length) return [];
  const values = showSeatIds.map((_, i) => `($1, $${i + 2})`).join(', ');
  const { rows } = await client.query(
    `INSERT INTO booking_seats (booking_id, show_seat_id) VALUES ${values} RETURNING *`,
    [bookingId, ...showSeatIds]
  );
  return rows;
};

export const getBookingById = async (id) => {
  const { rows } = await pool.query(
    `SELECT b.*,
            u.name  AS customer_name, u.email AS customer_email,
            e.title AS event_title,
            v.name  AS venue_name,
            s.date, s.time
     FROM bookings b
     JOIN users  u ON u.id = b.customer_id
     JOIN shows  s ON s.id = b.show_id
     JOIN events e ON e.id = s.event_id
     JOIN venues v ON v.id = s.venue_id
     WHERE b.id = $1`,
    [id]
  );
  return rows[0] ?? null;
};

export const getBookingWithSeats = async (id) => {
  const booking = await getBookingById(id);
  if (!booking) return null;
  const { rows } = await pool.query(
    `SELECT sl.category, sl.row_label, sl.seat_number, ss.price
     FROM booking_seats bs
     JOIN show_seats   ss ON ss.id = bs.show_seat_id
     JOIN seat_layouts sl ON sl.id = ss.seat_layout_id
     WHERE bs.booking_id = $1`,
    [id]
  );
  return { ...booking, seats: rows };
};

export const getBookingsByCustomer = async (customerId, filter = 'upcoming', page = 1, limit = 8) => {
  let whereClause = 'WHERE b.customer_id = $1';
  const params = [customerId];
  
  if (filter === 'upcoming') {
    whereClause += ` AND s.date >= CURRENT_DATE AND b.status != 'cancelled'`;
  } else if (filter === 'past') {
    whereClause += ` AND s.date < CURRENT_DATE AND b.status != 'cancelled'`;
  } else if (filter === 'cancelled') {
    whereClause += ` AND b.status = 'cancelled'`;
  }
  
  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT b.id, b.booking_ref, b.status, b.total_amount, b.created_at,
            e.title AS event_title, s.date, s.time, v.name AS venue_name,
            (
              SELECT json_agg(json_build_object(
                'seat', sl.row_label || sl.seat_number, 
                'category', sl.category, 
                'price', ss.price
              ))
              FROM booking_seats bs
              JOIN show_seats ss ON ss.id = bs.show_seat_id
              JOIN seat_layouts sl ON sl.id = ss.seat_layout_id
              WHERE bs.booking_id = b.id
            ) AS seats
     FROM bookings b
     JOIN shows  s ON s.id = b.show_id
     JOIN events e ON e.id = s.event_id
     JOIN venues v ON v.id = s.venue_id
     ${whereClause}
     ORDER BY b.created_at DESC
     LIMIT $2 OFFSET $3`,
    params
  );
  return rows;
};

export const updateBookingStatus = async (id, status, client = pool) => {
  const { rows } = await client.query(
    `UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return rows[0] ?? null;
};

export const getBookingByRef = async (ref) => {
  const { rows } = await pool.query(
    'SELECT * FROM bookings WHERE booking_ref = $1', [ref]
  );
  return rows[0] ?? null;
};

export const updateQrPayload = async (id, qrPayload) => {
  await pool.query('UPDATE bookings SET qr_payload = $1 WHERE id = $2', [qrPayload, id]);
};
