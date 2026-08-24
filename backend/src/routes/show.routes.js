import { Router } from 'express';
import { body } from 'express-validator';
import { verifyToken, requireRole } from '../middleware/auth.js';
import * as SC from '../controllers/show.controller.js';

const router = Router();

const seatIdsValidation = [
  body('showSeatIds')
    .isArray({ min: 1 })
    .withMessage('showSeatIds must be a non-empty array.'),
  body('showSeatIds.*')
    .isInt({ min: 1 })
    .withMessage('Each showSeatId must be a positive integer.'),
];

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/',          SC.getAllShows);
router.get('/:id',       SC.getShow);
router.get('/:id/seats', SC.getShowSeats);

// ── POST /api/shows/:id/hold — customer only ──────────────────────────────────
router.post(
  '/:id/hold',
  verifyToken, requireRole('customer'),
  seatIdsValidation,
  SC.holdSeats
);

// ── POST /api/shows/:id/release — customer or organiser ──────────────────────
router.post(
  '/:id/release',
  verifyToken, requireRole('customer', 'organiser', 'admin'),
  seatIdsValidation,
  SC.releaseSeats
);

export default router;
