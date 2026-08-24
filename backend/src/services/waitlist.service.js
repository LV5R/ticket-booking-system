import jwt         from 'jsonwebtoken';
import pool        from '../config/db.js';
import redisClient from '../config/redis.js';
import { sendWaitlistOffer } from './email.service.js';

const OFFER_TTL_SECONDS = 900; // 15 minutes

// ── joinWaitlist ──────────────────────────────────────────────────────────────
export const joinWaitlist = async (customerId, showId, category) => {
  // Get next position atomically inside a CTE
  const { rows } = await pool.query(
    `WITH next_pos AS (
       SELECT COALESCE(MAX(position), 0) + 1 AS pos
       FROM waitlist
       WHERE show_id = $1 AND category = $2
     )
     INSERT INTO waitlist (customer_id, show_id, category, position, status)
     SELECT $3, $1, $2, pos, 'waiting' FROM next_pos
     ON CONFLICT (customer_id, show_id, category) DO NOTHING
     RETURNING *`,
    [showId, category, customerId]
  );

  if (!rows.length) {
    return { alreadyJoined: true, message: 'You are already on the waitlist for this category.' };
  }
  return rows[0];
};

// ── assignNextInLine ──────────────────────────────────────────────────────────
// Called after a seat is freed (expiry or cancellation).
// Offers the seat to the next 'waiting' person with a 15-min time-limited link.
export const assignNextInLine = async (showId, category, freedShowSeatId) => {
  // Find oldest waiting entry (lowest position = first in)
  const { rows } = await pool.query(
    `SELECT w.id, w.customer_id, u.email, u.name
     FROM waitlist w
     JOIN users u ON u.id = w.customer_id
     WHERE w.show_id = $1 AND w.category = $2 AND w.status = 'waiting'
     ORDER BY w.position ASC
     LIMIT 1
     FOR UPDATE SKIP LOCKED`,
    [showId, category]
  );

  // Nobody waiting — leave the seat as available
  if (!rows.length) return null;

  const entry      = rows[0];
  const customerId = entry.customer_id;

  // Mark waitlist entry as 'offered'
  await pool.query(
    `UPDATE waitlist SET status = 'offered' WHERE id = $1`,
    [entry.id]
  );

  // Hold the seat for this person (15-min TTL)
  await redisClient.set(
    `seat:hold:${freedShowSeatId}`,
    String(customerId),
    { NX: true, EX: OFFER_TTL_SECONDS }
  );

  await pool.query(
    `UPDATE show_seats
     SET status     = 'held',
         held_by    = $2,
         held_until = NOW() + INTERVAL '15 minutes'
     WHERE id = $1 AND status = 'available'`,
    [freedShowSeatId, customerId]
  );

  // Build a signed confirmation link (JWT embeds all the info needed)
  const token = jwt.sign(
    { waitlistId: entry.id, showId, category, freedShowSeatId, customerId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  const confirmationLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/waitlist/confirm?token=${token}`;

  // Fire-and-forget email
  sendWaitlistOffer(entry.email, showId, category, confirmationLink, 15)
    .catch(err => console.error('[waitlist.service] Email failed:', err.message));

  // Queue a BullMQ job to expire the offer after 15 min
  const { waitlistOfferQueue } = await import('../jobs/waitlistOffer.job.js');
  await waitlistOfferQueue.add(
    'expire-offer',
    { waitlistId: entry.id, showId, category, freedShowSeatId, customerId },
    {
      delay    : OFFER_TTL_SECONDS * 1000,
      jobId    : `wl-offer-${entry.id}-${freedShowSeatId}`,
      attempts : 2,
    }
  );

  console.log(`[waitlist.service] Offered seat ${freedShowSeatId} to user ${customerId} (waitlist #${entry.id})`);
  return entry;
};
