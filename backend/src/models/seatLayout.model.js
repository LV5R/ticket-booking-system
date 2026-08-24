import pool from '../config/db.js';

// Bulk-insert seats — accepts snake_case: { category, row_label, seat_number }
export const addSeatsToVenue = async (venueId, seats) => {
  if (!seats.length) return [];

  const values = seats.map((_, i) => {
    const b = i * 3;
    return `($${b + 1}, $${b + 2}, $${b + 3}, ${venueId})`;
  }).join(', ');

  const params = seats.flatMap(s => [s.category, s.row_label, s.seat_number]);

  const { rows } = await pool.query(
    `INSERT INTO seat_layouts (category, row_label, seat_number, venue_id)
     VALUES ${values}
     ON CONFLICT (venue_id, category, row_label, seat_number) DO NOTHING
     RETURNING *`,
    params
  );
  return rows;
};

export const getSeatLayoutsByVenue = async (venueId) => {
  const { rows } = await pool.query(
    `SELECT * FROM seat_layouts
     WHERE venue_id = $1
     ORDER BY category, row_label, seat_number`,
    [venueId]
  );
  return rows;
};

export const getSeatLayoutById = async (id) => {
  const { rows } = await pool.query(
    'SELECT * FROM seat_layouts WHERE id = $1', [id]
  );
  return rows[0] ?? null;
};

export const deleteSeatLayout = async (id) => {
  const { rows } = await pool.query(
    'DELETE FROM seat_layouts WHERE id = $1 RETURNING *', [id]
  );
  return rows[0] ?? null;
};
