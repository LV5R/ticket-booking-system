import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';

// ── Route imports ─────────────────────────────────────────────────────────────
import authRoutes    from './routes/auth.routes.js';
import venueRoutes   from './routes/venue.routes.js';
import eventRoutes   from './routes/event.routes.js';
import showRoutes    from './routes/show.routes.js';
import bookingRoutes from './routes/booking.routes.js';

// ── Socket.IO ─────────────────────────────────────────────────────────────────
import { initSockets } from './sockets/index.js';

// ── BullMQ Workers (import to register them) ──────────────────────────────────
import './jobs/seatExpiry.job.js';
import './jobs/waitlistOffer.job.js';

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 5000;

// ── Init Socket.IO ────────────────────────────────────────────────────────────
const io = initSockets(server);
app.set('io', io); // accessible in controllers via req.app.get('io')

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/venues',   venueRoutes);
app.use('/api/events',   eventRoutes);
app.use('/api/shows',    showRoutes);
app.use('/api/bookings', bookingRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ message: `Cannot ${req.method} ${req.path}` })
);

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[unhandled error]', err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error.' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
server.listen(PORT, () =>
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`)
);

export default app;
