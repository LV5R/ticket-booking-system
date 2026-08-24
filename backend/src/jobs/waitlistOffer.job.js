import { Queue, Worker } from 'bullmq';
import pool        from '../config/db.js';
import redisClient from '../config/redis.js';
import { assignNextInLine } from '../services/waitlist.service.js';

const connection = { url: process.env.REDIS_URL || 'redis://localhost:6379' };

// Export queue so waitlist.service can enqueue jobs
export const waitlistOfferQueue = new Queue('waitlist-offer', { connection });

const worker = new Worker(
  'waitlist-offer',
  async (job) => {
    const { waitlistId, showId, category, freedShowSeatId, customerId } = job.data;
    console.log(`[waitlistOffer] Checking expiry for waitlist offer #${waitlistId}`);

    // Check if offer was already fulfilled (entry no longer 'offered')
    const { rows } = await pool.query(
      `SELECT status FROM waitlist WHERE id = $1`, [waitlistId]
    );
    if (!rows.length || rows[0].status !== 'offered') {
      console.log(`[waitlistOffer] Offer #${waitlistId} already fulfilled or not found — skipping.`);
      return;
    }

    // Offer expired — mark as expired
    await pool.query(
      `UPDATE waitlist SET status = 'expired' WHERE id = $1`, [waitlistId]
    );

    // Release the Redis hold
    await redisClient.del(`seat:hold:${freedShowSeatId}`);

    // Reset the seat back to available
    await pool.query(
      `UPDATE show_seats
       SET status = 'available', held_by = NULL, held_until = NULL
       WHERE id = $1 AND held_by = $2 AND status = 'held'`,
      [freedShowSeatId, customerId]
    );

    console.log(`[waitlistOffer] Offer #${waitlistId} expired — reassigning seat ${freedShowSeatId}`);

    // Try the next person in line
    await assignNextInLine(showId, category, freedShowSeatId);
  },
  { connection }
);

worker.on('completed', job => console.log(`[waitlistOffer] Job ${job.id} done.`));
worker.on('failed', (job, err) => console.error(`[waitlistOffer] Job ${job?.id} failed:`, err.message));

export default worker;
