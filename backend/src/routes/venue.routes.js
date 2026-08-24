import { Router } from 'express';
import { body } from 'express-validator';
import { verifyToken, requireRole } from '../middleware/auth.js';
import * as VC from '../controllers/venue.controller.js';

const router = Router();

const venueBodyValidation = [
  body('name').trim().notEmpty().withMessage('Venue name is required.'),
  body('address').trim().notEmpty().withMessage('Address is required.'),
];

const seatsBodyValidation = [
  body('seats').isArray({ min: 1 }).withMessage('seats must be a non-empty array.'),
  body('seats.*.category').trim().notEmpty().withMessage('Each seat must have a category.'),
  body('seats.*.row_label').trim().notEmpty().withMessage('Each seat must have a row_label.'),
  body('seats.*.seat_number').isInt({ min: 1 }).withMessage('Each seat must have a valid seat_number.'),
];

// ── Public ───────────────────────────────────────────────────────────────────
router.get('/',    VC.getVenues);
router.get('/:id', VC.getVenue);

// ── Admin only ───────────────────────────────────────────────────────────────
router.post('/',       verifyToken, requireRole('admin'), venueBodyValidation, VC.createVenue);
router.put('/:id',     verifyToken, requireRole('admin'), venueBodyValidation, VC.updateVenue);
router.delete('/:id',  verifyToken, requireRole('admin'), VC.deleteVenue);
router.post('/:id/seats', verifyToken, requireRole('admin'), seatsBodyValidation, VC.addSeats);

export default router;
