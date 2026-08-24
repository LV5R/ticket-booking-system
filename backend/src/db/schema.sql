-- =============================================================
--  Ticket Booking System — Database Schema
--  File: src/db/schema.sql
-- =============================================================

-- ─────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- for gen_random_uuid()

-- ─────────────────────────────────────────
-- ENUM TYPES
-- ─────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role        AS ENUM ('customer', 'organiser', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE seat_status      AS ENUM ('available', 'held', 'booked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_status   AS ENUM ('pending', 'confirmed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE waitlist_status  AS ENUM ('waiting', 'offered', 'expired', 'fulfilled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ─────────────────────────────────────────
-- TABLE: users
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL       PRIMARY KEY,
  name          VARCHAR(150)    NOT NULL,
  email         VARCHAR(255)    NOT NULL,
  password_hash TEXT            NOT NULL,
  role          user_role       NOT NULL DEFAULT 'customer',
  created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users (role);


-- ─────────────────────────────────────────
-- TABLE: venues
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS venues (
  id          BIGSERIAL     PRIMARY KEY,
  name        VARCHAR(255)  NOT NULL,
  address     TEXT          NOT NULL,
  created_by  BIGINT        NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venues_created_by ON venues (created_by);


-- ─────────────────────────────────────────
-- TABLE: seat_layouts
-- Defines the physical seat map for a venue.
-- One row per individual seat.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seat_layouts (
  id           BIGSERIAL     PRIMARY KEY,
  venue_id     BIGINT        NOT NULL REFERENCES venues (id) ON DELETE CASCADE,
  category     VARCHAR(100)  NOT NULL,           -- e.g. 'VIP', 'General', 'Balcony'
  row_label    VARCHAR(10)   NOT NULL,            -- e.g. 'A', 'B', 'C'
  seat_number  INT           NOT NULL,            -- e.g. 1, 2, 3 ...
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_seat_layout_seat UNIQUE (venue_id, category, row_label, seat_number)
);

CREATE INDEX IF NOT EXISTS idx_seat_layouts_venue_id ON seat_layouts (venue_id);
CREATE INDEX IF NOT EXISTS idx_seat_layouts_category ON seat_layouts (venue_id, category);


-- ─────────────────────────────────────────
-- TABLE: events
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id           BIGSERIAL     PRIMARY KEY,
  organiser_id BIGINT        NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  title        VARCHAR(255)  NOT NULL,
  type         VARCHAR(100)  NOT NULL,            -- e.g. 'concert', 'sports', 'theatre'
  description  TEXT,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_organiser_id ON events (organiser_id);
CREATE INDEX IF NOT EXISTS idx_events_type         ON events (type);


-- ─────────────────────────────────────────
-- TABLE: shows
-- A specific date+time instance of an event at a venue.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shows (
  id          BIGSERIAL   PRIMARY KEY,
  event_id    BIGINT      NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  venue_id    BIGINT      NOT NULL REFERENCES venues (id) ON DELETE RESTRICT,
  date        DATE        NOT NULL,
  time        TIME        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_show_slot UNIQUE (event_id, venue_id, date, time)
);

CREATE INDEX IF NOT EXISTS idx_shows_event_id  ON shows (event_id);
CREATE INDEX IF NOT EXISTS idx_shows_venue_id  ON shows (venue_id);
CREATE INDEX IF NOT EXISTS idx_shows_date      ON shows (date);


-- ─────────────────────────────────────────
-- TABLE: show_seats
-- One row per seat per show — tracks availability.
-- held_by / held_until support the temporary seat-hold mechanism.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS show_seats (
  id              BIGSERIAL     PRIMARY KEY,
  show_id         BIGINT        NOT NULL REFERENCES shows (id) ON DELETE CASCADE,
  seat_layout_id  BIGINT        NOT NULL REFERENCES seat_layouts (id) ON DELETE RESTRICT,
  status          seat_status   NOT NULL DEFAULT 'available',
  price           NUMERIC(10,2) NOT NULL,
  held_by         BIGINT        REFERENCES users (id) ON DELETE SET NULL,
  held_until      TIMESTAMPTZ,

  CONSTRAINT uq_show_seat UNIQUE (show_id, seat_layout_id)
);

CREATE INDEX IF NOT EXISTS idx_show_seats_show_id    ON show_seats (show_id);
CREATE INDEX IF NOT EXISTS idx_show_seats_status     ON show_seats (show_id, status);
CREATE INDEX IF NOT EXISTS idx_show_seats_held_until ON show_seats (held_until)
  WHERE held_until IS NOT NULL;                  -- partial index — only held rows


-- ─────────────────────────────────────────
-- TABLE: bookings
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id            BIGSERIAL       PRIMARY KEY,
  customer_id   BIGINT          NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  show_id       BIGINT          NOT NULL REFERENCES shows (id) ON DELETE RESTRICT,
  booking_ref   VARCHAR(64)     NOT NULL,
  qr_payload    TEXT,
  status        booking_status  NOT NULL DEFAULT 'pending',
  total_amount  NUMERIC(10,2)   NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_booking_ref UNIQUE (booking_ref)
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings (customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_show_id     ON bookings (show_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_ref ON bookings (booking_ref);
CREATE INDEX IF NOT EXISTS idx_bookings_status      ON bookings (status);


-- ─────────────────────────────────────────
-- TABLE: booking_seats
-- Junction table — which show_seats belong to a booking.
-- The UNIQUE on show_seat_id is the critical constraint that
-- prevents the same physical seat being booked more than once.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_seats (
  booking_id    BIGINT  NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  show_seat_id  BIGINT  NOT NULL REFERENCES show_seats (id) ON DELETE RESTRICT,

  PRIMARY KEY (booking_id, show_seat_id),

  -- Enforce one booking per seat per show
  CONSTRAINT uq_one_booking_per_seat UNIQUE (show_seat_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_seats_booking_id   ON booking_seats (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_seats_show_seat_id ON booking_seats (show_seat_id);


-- ─────────────────────────────────────────
-- TABLE: waitlist
-- Ordered queue per show+category.
-- position is maintained by the application layer.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waitlist (
  id           BIGSERIAL        PRIMARY KEY,
  customer_id  BIGINT           NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  show_id      BIGINT           NOT NULL REFERENCES shows (id) ON DELETE CASCADE,
  category     VARCHAR(100)     NOT NULL,
  position     INT              NOT NULL,
  status       waitlist_status  NOT NULL DEFAULT 'waiting',
  created_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

  -- A customer can only appear once per show+category on the waitlist
  CONSTRAINT uq_waitlist_entry UNIQUE (customer_id, show_id, category)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_show_category ON waitlist (show_id, category, position);
CREATE INDEX IF NOT EXISTS idx_waitlist_customer_id   ON waitlist (customer_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status        ON waitlist (status);
