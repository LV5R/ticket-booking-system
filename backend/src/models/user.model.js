import pool from '../config/db.js';

// ── Create a new user ───────────────────────────────────────────────────────
export const createUser = async ({ name, email, passwordHash, role }) => {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at`,
    [name, email, passwordHash, role]
  );
  return rows[0];
};

// ── Find by email (includes password_hash for login check) ──────────────────
export const findUserByEmail = async (email) => {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return rows[0] ?? null;
};

// ── Find by id (safe — no password_hash returned) ───────────────────────────
export const findUserById = async (id) => {
  const { rows } = await pool.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
};
