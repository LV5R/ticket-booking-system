import pool from '../config/db.js';

export const createShow = async ({ eventId, venueId, date, time }) => {
  const { rows } = await pool.query(
    `INSERT INTO shows (event_id, venue_id, date, time)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [eventId, venueId, date, time]
  );
  return rows[0];
};

export const getAllShows = async () => {
  const { rows } = await pool.query(
    `SELECT s.*,
            e.title AS event_title, e.type AS event_type,
            v.name  AS venue_name,  v.address AS venue_address
     FROM shows s
     JOIN events  e ON e.id = s.event_id
     JOIN venues  v ON v.id = s.venue_id
     ORDER BY s.date ASC, s.time ASC`
  );
  return rows;
};

export const getShowById = async (id) => {
  const { rows } = await pool.query(
    `SELECT s.*,
            e.title AS event_title, e.type AS event_type,
            v.name  AS venue_name,  v.address AS venue_address
     FROM shows s
     JOIN events  e ON e.id = s.event_id
     JOIN venues  v ON v.id = s.venue_id
     WHERE s.id = $1`,
    [id]
  );
  return rows[0] ?? null;
};

export const getShowsByEvent = async (eventId) => {
  const { rows } = await pool.query(
    `SELECT s.*,
            v.name AS venue_name, v.address AS venue_address
     FROM shows s
     JOIN venues v ON v.id = s.venue_id
     WHERE s.event_id = $1
     ORDER BY s.date ASC, s.time ASC`,
    [eventId]
  );
  return rows;
};

export const updateShow = async (id, { date, time }) => {
  const { rows } = await pool.query(
    `UPDATE shows
     SET date = COALESCE($1, date),
         time = COALESCE($2, time)
     WHERE id = $3
     RETURNING *`,
    [date, time, id]
  );
  return rows[0] ?? null;
};

export const deleteShow = async (id) => {
  const { rows } = await pool.query(
    'DELETE FROM shows WHERE id = $1 RETURNING *',
    [id]
  );
  return rows[0] ?? null;
};
