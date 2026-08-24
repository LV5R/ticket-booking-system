import { Queue, Worker } from 'bullmq';
import pool from '../config/db.js';
import { releaseSeat } from '../services/seatHold.service.js';

const connection = { url: process.env.REDIS_URL || 'redis://localhost:6379' };

export const seatExpiryQueue = new Queue('seat-expiry', { connection });

// ── Stub: waitlist auto-assignment ────────────────────────────────────────────
// Assign next person in the waitlist for this show + category when a seat drops.
const assignNextInLine = async (showId, category) => {
  // Delegate to waitlist service if available, otherwise no-op stub
  try {
    const { offerNextInWaitlist } = await import('../services/waitlist.service.js');
    await offerNextInWaitlist(showId, category);
  } catch {
    console.log(`[seatExpiry] Waitlist stub: would assign next for show ${showId} category ${category}`);
  }
};

// ── Repeating job: every 30 seconds ──────────────────────────────────────────
seatExpiryQueue.add(
  'sweep-expired-holds',
  {},
  {
    repeat: { every: 30_000 },   // 30 seconds
    jobId: 'seat-expiry-repeating',
  }
).catch(err => console.error('[seatExpiry] Failed to add repeating job:', err.message));

const worker = new Worker(
  'seat-expiry',
  async (job) => {
    if (job.name !== 'sweep-expired-holds') return;

    // Find all seats that are 'held' but whose hold window has passed
    const { rows: expired } = await pool.query(
      `SELECT ss.id AS show_seat_id, ss.show_id, sl.category
       FROM show_seats ss
       JOIN seat_layouts sl ON sl.id = ss.seat_layout_id
       WHERE ss.status = 'held' AND ss.held_until < NOW()`
    );

    if (!expired.length) return;

    console.log(`[seatExpiry] Releasing ${expired.length} expired hold(s)...`);

    for (const seat of expired) {
      try {
        await releaseSeat(seat.show_seat_id);
        await assignNextInLine(seat.show_id, seat.category);
      } catch (err) {
        console.error(`[seatExpiry] Failed to release seat ${seat.show_seat_id}:`, err.message);
      }
    }

    console.log(`[seatExpiry] Done releasing ${expired.length} seat(s).`);
  },
  { connection }
);

worker.on('completed', job =>
  console.log(`[seatExpiry] Sweep ${job.id} done.`)
);
worker.on('failed', (job, err) =>
  console.error(`[seatExpiry] Sweep ${job?.id} failed:`, err.message)
);

export default worker;
