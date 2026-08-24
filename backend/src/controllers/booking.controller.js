import { validationResult }    from 'express-validator';
import pool                    from '../config/db.js';
import * as BookingModel       from '../models/booking.model.js';
import * as WaitlistModel      from '../models/waitlist.model.js';
import { getEventRevenue }     from '../models/event.model.js';
import { confirmBooking }      from '../services/seatHold.service.js';
import { joinWaitlist, assignNextInLine } from '../services/waitlist.service.js';

// POST /api/bookings/confirm  — customer only
// Body: { showSeatIds: [1, 2, 3] }
export const confirmBookingHandler = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const booking = await confirmBooking(
      req.body.showSeatIds,
      req.user.id,
      req.user.email      // passed to email service inside confirmBooking
    );

    res.status(201).json({
      message      : 'Booking confirmed!',
      booking_ref  : booking.booking_ref,
      total_amount : booking.total_amount,
      seats        : booking.seats,
      qr_code      : booking.qrDataUrl,
    });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// GET /api/bookings/my
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await BookingModel.getBookingsByCustomer(req.user.id);
    res.json(bookings);
  } catch (err) {
    console.error('[getMyBookings]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/bookings/:id
export const getBooking = async (req, res) => {
  try {
    const booking = await BookingModel.getBookingWithSeats(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (req.user.role === 'customer' && booking.customer_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden.' });
    }
    res.json(booking);
  } catch (err) {
    console.error('[getBooking]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/bookings/:id/cancel  — customer only
// Releases seats back to 'available' then triggers waitlist assignNextInLine per freed seat.
export const cancelBooking = async (req, res) => {
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    const booking = await BookingModel.getBookingById(req.params.id);
    if (!booking)                          return res.status(404).json({ message: 'Booking not found.' });
    if (booking.customer_id !== req.user.id) return res.status(403).json({ message: 'Forbidden.' });
    if (booking.status === 'cancelled')    return res.status(409).json({ message: 'Already cancelled.' });

    // Get all booked seats with their category info
    const { rows: seatRows } = await dbClient.query(
      `SELECT bs.show_seat_id, ss.show_id, sl.category
       FROM booking_seats bs
       JOIN show_seats   ss ON ss.id = bs.show_seat_id
       JOIN seat_layouts sl ON sl.id = ss.seat_layout_id
       WHERE bs.booking_id = $1`,
      [booking.id]
    );

    // Release every seat
    if (seatRows.length) {
      const ids = seatRows.map(r => r.show_seat_id);
      await dbClient.query(
        `UPDATE show_seats
         SET status = 'available', held_by = NULL, held_until = NULL
         WHERE id = ANY($1::bigint[])`,
        [ids]
      );
    }

    await BookingModel.updateBookingStatus(booking.id, 'cancelled', dbClient);
    await dbClient.query('COMMIT');

    // After commit — offer freed seats to next person in waitlist (per seat)
    for (const seat of seatRows) {
      assignNextInLine(seat.show_id, seat.category, seat.show_seat_id)
        .catch(err => console.error('[cancel] waitlist assign failed:', err.message));
    }

    res.json({ message: 'Booking cancelled. Seats returned to pool.' });
  } catch (err) {
    await dbClient.query('ROLLBACK');
    console.error('[cancelBooking]', err);
    res.status(500).json({ message: 'Internal server error.' });
  } finally {
    dbClient.release();
  }
};

// POST /api/waitlist/join  — customer only
// Body: { show_id, category }
export const joinWaitlistHandler = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const result = await joinWaitlist(req.user.id, req.body.show_id, req.body.category);
    const status = result.alreadyJoined ? 200 : 201;
    res.status(status).json(result);
  } catch (err) {
    console.error('[joinWaitlist]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/bookings/waitlist/my
export const getMyWaitlist = async (req, res) => {
  try {
    const entries = await WaitlistModel.getWaitlistByCustomer(req.user.id);
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/events/:id/revenue  — organiser only
export const getRevenue = async (req, res) => {
  try {
    const rows = await getEventRevenue(req.params.id, req.user.id);
    if (!rows.length) {
      return res.status(404).json({ message: 'Event not found or not yours.' });
    }
    const total = rows.reduce((acc, r) => ({
      total_bookings   : acc.total_bookings   + Number(r.total_bookings),
      total_seats_sold : acc.total_seats_sold + Number(r.total_seats_sold),
      total_revenue    : acc.total_revenue    + Number(r.total_revenue),
    }), { total_bookings: 0, total_seats_sold: 0, total_revenue: 0 });

    res.json({
      event_id    : rows[0].event_id,
      event_title : rows[0].event_title,
      summary     : total,
      shows       : rows.map(r => ({
        show_id      : r.show_id,
        venue_name   : r.venue_name,
        date         : r.show_date,
        time         : r.show_time,
        bookings     : Number(r.total_bookings),
        seats_sold   : Number(r.total_seats_sold),
        revenue      : Number(r.total_revenue),
      })),
    });
  } catch (err) {
    console.error('[getRevenue]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
