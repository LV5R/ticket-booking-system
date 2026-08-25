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

// POST /api/bookings/create-payment-order
router.post('/create-payment-order',
  requireRole('customer'),
  [
    body('showSeatIds').isArray({ min: 1 }).withMessage('showSeatIds must be non-empty.'),
    body('showSeatIds.*').isInt({ min: 1 }).withMessage('Each ID must be a positive integer.'),
  ],
  BC.createPaymentOrder
);

// POST /api/bookings/confirm  — body: { showSeatIds: [], razorpay_payment_id: '', ... }
router.post('/confirm',
  requireRole('customer'),
  [
    body('showSeatIds').isArray({ min: 1 }).withMessage('showSeatIds must be non-empty.'),
    body('showSeatIds.*').isInt({ min: 1 }).withMessage('Each ID must be a positive integer.'),
    body('razorpay_payment_id').optional().isString(),
    body('razorpay_order_id').optional().isString(),
    body('razorpay_signature').optional().isString(),
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
