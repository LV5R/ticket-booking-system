import pool from '../config/db.js';

export const joinWaitlist = async ({ customerId, showId, category }) => {
  // Get next position
  const { rows: pos } = await pool.query(
    `SELECT COALESCE(MAX(position), 0) + 1 AS next_pos
     FROM waitlist WHERE show_id = $1 AND category = $2`,
    [showId, category]
  );
  const position = pos[0].next_pos;

  const { rows } = await pool.query(
    `INSERT INTO waitlist (customer_id, show_id, category, position, status)
     VALUES ($1, $2, $3, $4, 'waiting')
     ON CONFLICT (customer_id, show_id, category) DO NOTHING
     RETURNING *`,
    [customerId, showId, category, position]
  );
  return rows[0] ?? null;
};

export const getWaitlistEntry = async (customerId, showId, category) => {
  const { rows } = await pool.query(
    `SELECT * FROM waitlist
     WHERE customer_id = $1 AND show_id = $2 AND category = $3`,
    [customerId, showId, category]
  );
  return rows[0] ?? null;
};

export const getNextInWaitlist = async (showId, category) => {
  const { rows } = await pool.query(
    `SELECT w.*, u.email, u.name
     FROM waitlist w
     JOIN users u ON u.id = w.customer_id
     WHERE w.show_id = $1 AND w.category = $2 AND w.status = 'waiting'
     ORDER BY w.position ASC
     LIMIT 1`,
    [showId, category]
  );
  return rows[0] ?? null;
};

export const updateWaitlistStatus = async (id, status) => {
  const { rows } = await pool.query(
    `UPDATE waitlist SET status = $1 WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return rows[0] ?? null;
};

export const getWaitlistByCustomer = async (customerId) => {
  const { rows } = await pool.query(
    `SELECT w.*, e.title AS event_title, s.date, s.time
     FROM waitlist w
     JOIN shows  s ON s.id = w.show_id
     JOIN events e ON e.id = s.event_id
     WHERE w.customer_id = $1
     ORDER BY w.created_at DESC`,
    [customerId]
  );
  return rows;
};
