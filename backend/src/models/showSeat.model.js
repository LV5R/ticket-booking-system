import pool from '../config/db.js';

// Bulk-create show_seats from seat_layouts when a show is created.
// prices = { "Premium": 500, "Standard": 300 }
// defaultPrice used when a category has no explicit price.
export const bulkCreateShowSeats = async (showId, seatLayouts, prices = {}, defaultPrice = 0) => {
  if (!seatLayouts.length) return [];

  // 2 bound params per row: seat_layout_id ($b+1), price ($b+2)
  const values = seatLayouts.map((_, i) => {
    const b = i * 2;
    return `(${showId}, $${b + 1}, $${b + 2}, 'available')`;
  }).join(', ');

  const params = seatLayouts.flatMap(sl => [
    sl.id,
    prices[sl.category] ?? defaultPrice,
  ]);

  const { rows } = await pool.query(
    `INSERT INTO show_seats (show_id, seat_layout_id, price, status)
     VALUES ${values}
     ON CONFLICT (show_id, seat_layout_id) DO NOTHING
     RETURNING *`,
    params
  );
  return rows;
};

// Full seat map for a show — includes layout metadata
export const getShowSeatsByShow = async (showId) => {
  const { rows } = await pool.query(
    `SELECT
       ss.id,
       ss.show_id,
       ss.status,
       ss.price,
       sl.category,
       sl.row_label,
       sl.seat_number
     FROM show_seats ss
     JOIN seat_layouts sl ON sl.id = ss.seat_layout_id
     WHERE ss.show_id = $1
     ORDER BY sl.category, sl.row_label, sl.seat_number`,
    [showId]
  );
  return rows;
};

export const getShowSeatById = async (id) => {
  const { rows } = await pool.query(
    `SELECT ss.*, sl.category, sl.row_label, sl.seat_number
     FROM show_seats ss
     JOIN seat_layouts sl ON sl.id = ss.seat_layout_id
     WHERE ss.id = $1`,
    [id]
  );
  return rows[0] ?? null;
};

// Availability summary: { category, status, count }
export const getShowSeatSummary = async (showId) => {
  const { rows } = await pool.query(
    `SELECT sl.category, ss.status, COUNT(*) AS count
     FROM show_seats ss
     JOIN seat_layouts sl ON sl.id = ss.seat_layout_id
     WHERE ss.show_id = $1
     GROUP BY sl.category, ss.status
     ORDER BY sl.category, ss.status`,
    [showId]
  );
  return rows;
};
