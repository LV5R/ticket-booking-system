import pool from '../config/db.js';

export const createVenue = async ({ name, address, createdBy }) => {
  const { rows } = await pool.query(
    `INSERT INTO venues (name, address, created_by)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name, address, createdBy]
  );
  return rows[0];
};

export const getAllVenues = async () => {
  const { rows } = await pool.query(
    `SELECT v.*, u.name AS created_by_name
     FROM venues v
     JOIN users u ON u.id = v.created_by
     ORDER BY v.created_at DESC`
  );
  return rows;
};

export const getVenueById = async (id) => {
  const { rows } = await pool.query(
    `SELECT v.*, u.name AS created_by_name
     FROM venues v
     JOIN users u ON u.id = v.created_by
     WHERE v.id = $1`,
    [id]
  );
  return rows[0] ?? null;
};

export const updateVenue = async (id, { name, address }) => {
  const { rows } = await pool.query(
    `UPDATE venues
     SET name = COALESCE($1, name),
         address = COALESCE($2, address)
     WHERE id = $3
     RETURNING *`,
    [name, address, id]
  );
  return rows[0] ?? null;
};

export const deleteVenue = async (id) => {
  const { rows } = await pool.query(
    'DELETE FROM venues WHERE id = $1 RETURNING *',
    [id]
  );
  return rows[0] ?? null;
};
