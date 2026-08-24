import { validationResult } from 'express-validator';
import * as ShowModel     from '../models/show.model.js';
import * as ShowSeatModel from '../models/showSeat.model.js';
import { holdSeat, releaseSeat } from '../services/seatHold.service.js';

// GET /api/shows
export const getAllShows = async (_req, res) => {
  try {
    const shows = await ShowModel.getAllShows();
    res.json(shows);
  } catch (err) {
    console.error('[getAllShows]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/shows/:id
export const getShow = async (req, res) => {
  try {
    const show = await ShowModel.getShowById(req.params.id);
    if (!show) return res.status(404).json({ message: 'Show not found.' });
    const seatSummary = await ShowSeatModel.getShowSeatSummary(show.id);
    res.json({ ...show, seatSummary });
  } catch (err) {
    console.error('[getShow]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/shows/:id/seats
export const getShowSeats = async (req, res) => {
  try {
    const show = await ShowModel.getShowById(req.params.id);
    if (!show) return res.status(404).json({ message: 'Show not found.' });
    const seats = await ShowSeatModel.getShowSeatsByShow(req.params.id);
    res.json({
      show_id: show.id,
      event: show.event_title,
      venue: show.venue_name,
      date: show.date,
      time: show.time,
      seats,
    });
  } catch (err) {
    console.error('[getShowSeats]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/shows/:id/hold  — customer only
// Body: { showSeatIds: [1, 2, 3] }
export const holdSeats = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const showId      = req.params.id;
  const customerId  = req.user.id;
  const { showSeatIds } = req.body;

  const held = [];
  let heldUntil = null;
  try {
    // Sequential so a failure mid-way lets us rollback only what we held
    for (const seatId of showSeatIds) {
      const holdRes = await holdSeat(seatId, customerId);
      held.push(seatId);
      if (!heldUntil) heldUntil = holdRes.heldUntil;
    }

    res.json({
      message: `${held.length} seat(s) held for 10 minutes.`,
      held_seat_ids: held,
      expires_in_seconds: 600,
      held_until: heldUntil,
    });
  } catch (err) {
    // Rollback any seats we already held before the failure
    for (const seatId of held) {
      await releaseSeat(seatId).catch(() => {});
    }
    res.status(err.status || 500).json({ message: err.message });
  }
};

// POST /api/shows/:id/release  — customer or organiser
// Body: { showSeatIds: [1, 2] }
export const releaseSeats = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { showSeatIds } = req.body;
  const results = [];

  for (const seatId of showSeatIds) {
    try {
      await releaseSeat(seatId);
      results.push({ seatId, released: true });
    } catch (err) {
      results.push({ seatId, released: false, error: err.message });
    }
  }

  res.json({ message: 'Release processed.', results });
};

// GET /api/shows/event/:eventId
export const getShowsForEvent = async (req, res) => {
  try {
    const shows = await ShowModel.getShowsByEvent(req.params.eventId);
    res.json(shows);
  } catch (err) {
    console.error('[getShowsForEvent]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};


