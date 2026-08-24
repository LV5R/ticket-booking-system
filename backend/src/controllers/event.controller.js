import { validationResult } from 'express-validator';
import * as EventModel   from '../models/event.model.js';
import * as ShowModel    from '../models/show.model.js';
import * as ShowSeatModel from '../models/showSeat.model.js';
import * as SeatLayoutModel from '../models/seatLayout.model.js';
import * as VenueModel   from '../models/venue.model.js';

// GET /api/events?type=concert&date=2025-12-25
export const getEvents = async (req, res) => {
  try {
    const { type, date } = req.query;
    const events = await EventModel.getAllEvents({ type, date });
    res.json(events);
  } catch (err) {
    console.error('[getEvents]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/events/:id
export const getEvent = async (req, res) => {
  try {
    const event = await EventModel.getEventById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    res.json(event);
  } catch (err) {
    console.error('[getEvent]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/events  — organiser only
export const createEvent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const event = await EventModel.createEvent({
      organiserId: req.user.id,
      title: req.body.title,
      type: req.body.type,
      description: req.body.description,
    });
    res.status(201).json(event);
  } catch (err) {
    console.error('[createEvent]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// PUT /api/events/:id  — organiser (own event) only
export const updateEvent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const existing = await EventModel.getEventById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Event not found.' });

    if (existing.organiser_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: not your event.' });
    }

    const updated = await EventModel.updateEvent(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    console.error('[updateEvent]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// DELETE /api/events/:id  — organiser (own event) only
export const deleteEvent = async (req, res) => {
  try {
    const existing = await EventModel.getEventById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Event not found.' });

    if (existing.organiser_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: not your event.' });
    }

    const deleted = await EventModel.deleteEvent(req.params.id);
    res.json({ message: 'Event deleted.', event: deleted });
  } catch (err) {
    console.error('[deleteEvent]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/events/:id/shows  — organiser (own event) only
// Body: { venue_id, date, time, prices: { "Premium": 500, "Standard": 300 } }
export const createShow = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const eventId = req.params.id;
  const { venue_id, date, time, prices = {} } = req.body;

  try {
    // Verify the event exists and belongs to this organiser
    const event = await EventModel.getEventById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    if (event.organiser_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: not your event.' });
    }

    // Verify venue exists
    const venue = await VenueModel.getVenueById(venue_id);
    if (!venue) return res.status(404).json({ message: 'Venue not found.' });

    // Fetch all seat_layouts for the venue
    const seatLayouts = await SeatLayoutModel.getSeatLayoutsByVenue(venue_id);
    if (!seatLayouts.length) {
      return res.status(422).json({
        message: 'Venue has no seat layouts. Add seats to the venue first.',
      });
    }

    // Create the show record
    const show = await ShowModel.createShow({ eventId, venueId: venue_id, date, time });

    // Auto-generate show_seats — one per seat_layout row, priced by category
    const showSeats = await ShowSeatModel.bulkCreateShowSeats(show.id, seatLayouts, prices);

    res.status(201).json({
      show,
      seats_created: showSeats.length,
      pricing: prices,
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        message: 'A show already exists for this event / venue / date / time.',
      });
    }
    console.error('[createShow]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
