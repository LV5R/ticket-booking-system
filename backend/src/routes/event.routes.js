import { Router } from 'express';
import { body } from 'express-validator';
import { verifyToken, requireRole } from '../middleware/auth.js';
import * as EC from '../controllers/event.controller.js';

const router = Router();

// ── Validation ────────────────────────────────────────────────────────────────
const eventValidation = [
  body('title').trim().notEmpty().withMessage('Title is required.'),
  body('type').trim().notEmpty().withMessage('Type is required.'),
  body('description').optional().isString(),
];

const showValidation = [
  body('venue_id').isInt({ min: 1 }).withMessage('Valid venue_id is required.'),
  body('date').isDate().withMessage('Valid date (YYYY-MM-DD) is required.'),
  body('time')
    .matches(/^\d{2}:\d{2}$/)
    .withMessage('Valid time (HH:MM) is required.'),
  body('prices')
    .isObject()
    .withMessage('prices must be an object mapping category to price.')
    .custom(val => {
      if (Object.keys(val).length === 0) throw new Error('prices cannot be empty.');
      return true;
    }),
];

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/',    EC.getEvents);   // ?type=concert&date=2025-12-25
router.get('/:id', EC.getEvent);

// ── Organiser only ────────────────────────────────────────────────────────────
router.post(
  '/',
  verifyToken, requireRole('organiser'),
  eventValidation,
  EC.createEvent
);

router.put(
  '/:id',
  verifyToken, requireRole('organiser'),
  eventValidation,
  EC.updateEvent
);

router.delete(
  '/:id',
  verifyToken, requireRole('organiser'),
  EC.deleteEvent
);

// POST /api/events/:id/shows  — organiser only
router.post(
  '/:id/shows',
  verifyToken, requireRole('organiser'),
  showValidation,
  EC.createShow
);

export default router;
