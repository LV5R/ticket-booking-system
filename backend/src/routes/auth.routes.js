import { Router } from 'express';
import { body } from 'express-validator';
import { register, login } from '../controllers/auth.controller.js';

const router = Router();

// ── Validation chains ────────────────────────────────────────────────────────

const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ max: 150 }).withMessage('Name must be 150 characters or fewer.'),

  body('email')
    .trim()
    .isEmail().withMessage('A valid email address is required.')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain at least one number.'),

  body('role')
    .optional()
    .isIn(['customer', 'organiser', 'admin'])
    .withMessage('Role must be one of: customer, organiser, admin.'),
];

const loginValidation = [
  body('email')
    .trim()
    .isEmail().withMessage('A valid email address is required.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.'),
];

// ── Routes ───────────────────────────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', registerValidation, register);

// POST /api/auth/login
router.post('/login', loginValidation, login);

export default router;
