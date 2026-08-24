import { validationResult } from 'express-validator';
import * as VenueModel from '../models/venue.model.js';
import * as SeatLayoutModel from '../models/seatLayout.model.js';

// GET /api/venues  — public
export const getVenues = async (_req, res) => {
  try {
    const venues = await VenueModel.getAllVenues();
    res.json(venues);
  } catch (err) {
    console.error('[getVenues]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/venues/:id  — public
export const getVenue = async (req, res) => {
  try {
    const venue = await VenueModel.getVenueById(req.params.id);
    if (!venue) return res.status(404).json({ message: 'Venue not found.' });
    const seats = await SeatLayoutModel.getSeatLayoutsByVenue(venue.id);
    res.json({ ...venue, seats });
  } catch (err) {
    console.error('[getVenue]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/venues  — admin only
export const createVenue = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const venue = await VenueModel.createVenue({
      name: req.body.name,
      address: req.body.address,
      createdBy: req.user.id,
    });
    res.status(201).json(venue);
  } catch (err) {
    console.error('[createVenue]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// POST /api/venues/:id/seats  — admin only
// Body: { seats: [ { category, row_label, seat_number } ] }
export const addSeats = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const venue = await VenueModel.getVenueById(req.params.id);
    if (!venue) return res.status(404).json({ message: 'Venue not found.' });

    const seats = await SeatLayoutModel.addSeatsToVenue(venue.id, req.body.seats);
    res.status(201).json({ added: seats.length, seats });
  } catch (err) {
    console.error('[addSeats]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// PUT /api/venues/:id  — admin only
export const updateVenue = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const updated = await VenueModel.updateVenue(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: 'Venue not found.' });
    res.json(updated);
  } catch (err) {
    console.error('[updateVenue]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// DELETE /api/venues/:id  — admin only
export const deleteVenue = async (req, res) => {
  try {
    const deleted = await VenueModel.deleteVenue(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Venue not found.' });
    res.json({ message: 'Venue deleted.', venue: deleted });
  } catch (err) {
    console.error('[deleteVenue]', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
