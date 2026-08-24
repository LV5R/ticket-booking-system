import { Router } from 'express';
import { body } from 'express-validator';
import { verifyToken, requireRole } from '../middleware/auth.js';
import * as BC from '../controllers/booking.controller.js';

const router = Router();
router.use(verifyToken);

// GET /api/bookings/my
router.get('/my', BC.getMyBookings);

// GET /api/bookings/waitlist/my
router.get('/waitlist/my', BC.getMyWaitlist);

// POST /api/bookings/confirm  — body: { showSeatIds: [] }
router.post('/confirm',
  requireRole('customer'),
  [
    body('showSeatIds').isArray({ min: 1 }).withMessage('showSeatIds must be non-empty.'),
    body('showSeatIds.*').isInt({ min: 1 }).withMessage('Each ID must be a positive integer.'),
  ],
  BC.confirmBookingHandler
);

// POST /api/bookings/waitlist
router.post('/waitlist',
  requireRole('customer'),
  [
    body('show_id').isInt({ min: 1 }).withMessage('Valid show_id required.'),
    body('category').trim().notEmpty().withMessage('category is required.'),
  ],
  BC.joinWaitlistHandler
);

// GET /api/bookings/:id
router.get('/:id', BC.getBooking);

// DELETE /api/bookings/:id/cancel
router.delete('/:id/cancel', requireRole('customer'), BC.cancelBooking);

export default router;
