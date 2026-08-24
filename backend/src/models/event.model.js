import pool from '../config/db.js';

export const createEvent = async ({ organiserId, title, type, description }) => {
  const { rows } = await pool.query(
    `INSERT INTO events (organiser_id, title, type, description)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [organiserId, title, type, description]
  );
  return rows[0];
};

// Supports filter by type, date, and organiserId
export const getAllEvents = async ({ type, date, organiserId } = {}) => {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (type) {
    conditions.push(`e.type = $${idx++}`);
    params.push(type);
  }
  if (date) {
    // Only return events that have at least one show on this date
    conditions.push(
      `EXISTS (SELECT 1 FROM shows s WHERE s.event_id = e.id AND s.date = $${idx++})`
    );
    params.push(date);
  }
  if (organiserId) {
    conditions.push(`e.organiser_id = $${idx++}`);
    params.push(organiserId);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT e.*, u.name AS organiser_name,
       (SELECT MIN(s.date) FROM shows s WHERE s.event_id = e.id) as first_show_date,
       (SELECT v.name FROM shows s JOIN venues v ON v.id = s.venue_id WHERE s.event_id = e.id ORDER BY s.date ASC LIMIT 1) as venue_name
     FROM events e
     JOIN users u ON u.id = e.organiser_id
     ${where}
     ORDER BY e.created_at DESC`,
    params
  );
  return rows;
};

export const getEventById = async (id) => {
  const { rows } = await pool.query(
    `SELECT e.*, u.name AS organiser_name
     FROM events e
     JOIN users u ON u.id = e.organiser_id
     WHERE e.id = $1`,
    [id]
  );
  return rows[0] ?? null;
};

export const updateEvent = async (id, { title, type, description }) => {
  const { rows } = await pool.query(
    `UPDATE events
     SET title       = COALESCE($1, title),
         type        = COALESCE($2, type),
         description = COALESCE($3, description)
     WHERE id = $4 RETURNING *`,
    [title, type, description, id]
  );
  return rows[0] ?? null;
};

export const deleteEvent = async (id) => {
  const { rows } = await pool.query(
    'DELETE FROM events WHERE id = $1 RETURNING *', [id]
  );
  return rows[0] ?? null;
};

// Revenue report for an event (organiser view)
export const getEventRevenue = async (eventId, organiserId) => {
  const { rows } = await pool.query(
    `SELECT
       e.id            AS event_id,
       e.title         AS event_title,
       COUNT(DISTINCT b.id)           AS total_bookings,
       COUNT(DISTINCT bs.show_seat_id) AS total_seats_sold,
       COALESCE(SUM(b.total_amount), 0) AS total_revenue,
       s.id   AS show_id,
       s.date AS show_date,
       s.time AS show_time,
       v.name AS venue_name
     FROM events e
     JOIN shows  s  ON s.event_id  = e.id
     JOIN venues v  ON v.id        = s.venue_id
     LEFT JOIN bookings     b  ON b.show_id    = s.id AND b.status = 'confirmed'
     LEFT JOIN booking_seats bs ON bs.booking_id = b.id
     WHERE e.id = $1 AND e.organiser_id = $2
     GROUP BY e.id, e.title, s.id, s.date, s.time, v.name
     ORDER BY s.date ASC`,
    [eventId, organiserId]
  );
  return rows;
};
