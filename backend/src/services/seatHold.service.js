import redisClient from '../config/redis.js';
import pool        from '../config/db.js';
import { getIO }   from '../sockets/index.js';
import crypto      from 'crypto';
import { generateQR }                from './qr.service.js';
import { sendBookingConfirmation }   from './email.service.js';

const HOLD_TTL_SECONDS = 600; // 10 minutes

// ─────────────────────────────────────────────────────────────────────────────
// WHY Redis SET NX prevents the race condition:
//
// Without NX, two concurrent requests for the same seat could both read
// status='available' from Postgres, then both proceed to mark it 'held'.
// One would silently overwrite the other, resulting in double-booking.
//
// SET key value NX (only set if Not eXists) is an atomic Redis operation.
// Redis is single-threaded, so only ONE concurrent request wins the SET;
// the other gets null back and is immediately rejected — before either
// touches Postgres. The Redis key acts as a distributed mutex per seat.
// ─────────────────────────────────────────────────────────────────────────────

// ── holdSeat ─────────────────────────────────────────────────────────────────
export const holdSeat = async (showSeatId, customerId) => {
  const redisKey = `seat:hold:${showSeatId}`;

  const acquired = await redisClient.set(redisKey, String(customerId), {
    NX : true,
    EX : HOLD_TTL_SECONDS,
  });

  if (!acquired) {
    throw Object.assign(new Error('Seat already held by another user.'), { status: 409 });
  }

  try {
    const { rowCount, rows } = await pool.query(
      `UPDATE show_seats
       SET status     = 'held',
           held_by    = $2,
           held_until = NOW() + INTERVAL '10 minutes'
       WHERE id = $1 AND status = 'available'
       RETURNING id, show_id`,
      [showSeatId, customerId]
    );

    if (rowCount === 0) {
      await redisClient.del(redisKey);
      throw Object.assign(new Error('Seat is not available.'), { status: 409 });
    }

    const showId = rows[0].show_id;
    const io = getIO();
    if (io) io.to(`show:${showId}`).emit('seat:held', { showSeatId, customerId });

    return { showSeatId, showId, heldUntil: new Date(Date.now() + HOLD_TTL_SECONDS * 1000) };
  } catch (err) {
    if (!err.status) await redisClient.del(redisKey);
    throw err;
  }
};

// ── releaseSeat ───────────────────────────────────────────────────────────────
export const releaseSeat = async (showSeatId) => {
  await redisClient.del(`seat:hold:${showSeatId}`);

  const { rows } = await pool.query(
    `UPDATE show_seats
     SET status = 'available', held_by = NULL, held_until = NULL
     WHERE id = $1
     RETURNING id, show_id`,
    [showSeatId]
  );

  if (rows.length) {
    const io = getIO();
    if (io) io.to(`show:${rows[0].show_id}`).emit('seat:released', { showSeatId });
  }
};

// ── confirmBooking ────────────────────────────────────────────────────────────
export const confirmBooking = async (showSeatIds, customerId, userEmail) => {
  // 1. Verify every Redis hold belongs to this customer
  for (const seatId of showSeatIds) {
    const holder = await redisClient.get(`seat:hold:${seatId}`);
    if (holder !== String(customerId)) {
      throw Object.assign(
        new Error(`Hold for seat ${seatId} has expired or belongs to another user.`),
        { status: 409 }
      );
    }
  }

  // 2. Generate 10-char alphanumeric booking reference
  const CHARS      = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bookingRef = Array.from(crypto.randomBytes(10))
    .map(b => CHARS[b % CHARS.length])
    .join('');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 3. Fetch seat prices + show_id (WITH lock)
    const { rows: seats } = await client.query(
      `SELECT ss.id, ss.show_id, ss.price, sl.category, sl.row_label, sl.seat_number
       FROM show_seats ss
       JOIN seat_layouts sl ON sl.id = ss.seat_layout_id
       WHERE ss.id = ANY($1::bigint[]) AND ss.held_by = $2 AND ss.status = 'held'
       FOR UPDATE`,
      [showSeatIds, customerId]
    );

    if (seats.length !== showSeatIds.length) {
      throw Object.assign(new Error('One or more seats are no longer held by you.'), { status: 409 });
    }

    const showId      = seats[0].show_id;
    const totalAmount = seats.reduce((sum, s) => sum + Number(s.price), 0);

    // 4. Generate QR and store payload in booking
    const qrDataUrl  = await generateQR(bookingRef);
    const qrPayload  = JSON.stringify({ bookingRef, customerId, showSeatIds });

    // 5. Insert booking record
    const { rows: [booking] } = await client.query(
      `INSERT INTO bookings (customer_id, show_id, booking_ref, qr_payload, status, total_amount)
       VALUES ($1, $2, $3, $4, 'confirmed', $5)
       RETURNING *`,
      [customerId, showId, bookingRef, qrPayload, totalAmount]
    );

    // 6. Insert booking_seats
    const bsValues = showSeatIds.map((_, i) => `($1, $${i + 2})`).join(', ');
    await client.query(
      `INSERT INTO booking_seats (booking_id, show_seat_id) VALUES ${bsValues}`,
      [booking.id, ...showSeatIds]
    );

    // 7. Mark seats as booked
    await client.query(
      `UPDATE show_seats
       SET status = 'booked', held_by = NULL, held_until = NULL
       WHERE id = ANY($1::bigint[])`,
      [showSeatIds]
    );

    await client.query('COMMIT');

    // 8. Delete Redis hold keys (safe post-commit)
    await Promise.all(showSeatIds.map(id => redisClient.del(`seat:hold:${id}`)));

    // 9. Emit socket event
    const io = getIO();
    if (io) io.to(`show:${showId}`).emit('seat:booked', { showSeatIds, bookingRef });

    // 10. Fetch event details for email
    const { rows: [details] } = await pool.query(
      `SELECT e.title AS event_title, v.name AS venue_name, s.date, s.time
       FROM shows s JOIN events e ON e.id = s.event_id JOIN venues v ON v.id = s.venue_id
       WHERE s.id = $1`,
      [showId]
    );

    // 11. Send confirmation email (fire-and-forget)
    if (userEmail) {
      sendBookingConfirmation(userEmail, bookingRef, qrDataUrl, {
        eventTitle  : details?.event_title,
        venueName   : details?.venue_name,
        date        : details?.date,
        time        : details?.time,
        seats,
        totalAmount,
      }).catch(err => console.error('[email] Confirmation failed:', err.message));
    }

    return { ...booking, seats, qrDataUrl };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
