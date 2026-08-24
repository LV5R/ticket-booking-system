import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

// Module-level singleton — set once by initSockets, read anywhere via getIO()
let _io = null;

export const initSockets = (httpServer) => {
  _io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || '*', credentials: true },
  });

  // ── JWT auth middleware ─────────────────────────────────────────────────────
  _io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required.'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token.'));
    }
  });

  _io.on('connection', (socket) => {
    console.log(`[socket] User ${socket.user.id} connected (${socket.id})`);

    // Client calls this right after connecting to receive seat updates for a show
    socket.on('join-show', (showId) => {
      socket.join(`show:${showId}`);
      console.log(`[socket] User ${socket.user.id} joined show:${showId}`);
    });

    socket.on('leave-show', (showId) => {
      socket.leave(`show:${showId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[socket] User ${socket.user.id} disconnected`);
    });
  });

  return _io;
};

// Safe accessor — services import this so they don't need a direct ref to the server
export const getIO = () => _io;
