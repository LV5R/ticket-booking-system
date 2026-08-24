import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { createUser, findUserByEmail } from '../models/user.model.js';

const SALT_ROUNDS = 12;

// ── Helper: sign a JWT with user payload ────────────────────────────────────
const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

// ── POST /api/auth/register ─────────────────────────────────────────────────
export const register = async (req, res) => {
  // 1. Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const { name, email, password, role = 'customer' } = req.body;

  try {
    // 2. Check email uniqueness
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    // 3. Hash password and persist
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await createUser({ name, email, passwordHash, role });

    // 4. Issue JWT
    const token = signToken(user);

    return res.status(201).json({
      message: 'Registration successful.',
      user,
      token,
    });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// ── POST /api/auth/login ────────────────────────────────────────────────────
export const login = async (req, res) => {
  // 1. Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // 2. Lookup user (always fetch, compare, then respond — avoids timing oracle)
    const user = await findUserByEmail(email);

    // 3. Constant-time password check even when user not found
    const dummyHash = '$2b$12$invalidhashfortimingprotectiononly000000000000000000000';
    const passwordHash = user ? user.password_hash : dummyHash;
    const isValid = await bcrypt.compare(password, passwordHash);

    if (!user || !isValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // 4. Issue JWT
    const token = signToken(user);

    // 5. Strip password_hash before sending response
    const { password_hash, ...safeUser } = user;

    return res.status(200).json({
      message: 'Login successful.',
      user: safeUser,
      token,
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
