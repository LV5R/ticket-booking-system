# High-Concurrency Ticket Booking System

A full-stack ticketing platform designed to handle high-concurrency seat bookings, featuring real-time seat availability updates, temporary seat holds with TTL, and an automated waitlist assignment system.

## 🚀 Setup Guide

### Prerequisites
- **Node.js** (v18+)
- **PostgreSQL** (v14+)
- **Redis** (v4+)

### 1. Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Create a PostgreSQL database (e.g., `ticket_booking`).
4. Apply the schema: `psql -U postgres -d ticket_booking -f src/db/schema.sql`
5. Create a `.env` file (see reference below) and configure your database and Redis credentials.
6. Start the server: `npm run dev`

### 2. Frontend Setup
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the Vite development server: `npm run dev`

---

## ⚙️ `.env.example` Reference (Backend)

```env
# Application
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=ticket_booking

# Redis & BullMQ
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your_super_secret_jwt_key
SEAT_HOLD_TTL=600

# Email (Nodemailer - SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@ticketbooking.com
```

---

## 📡 API Endpoint Documentation

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/register` | Public | Register a new user (customer/organiser) |
| POST | `/login` | Public | Login and receive JWT |

### Venues (`/api/venues`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Public | List all venues |
| POST | `/` | Admin | Create a new venue |
| POST | `/:id/seats` | Admin | Bulk-generate seat layouts for a venue |

### Events & Shows (`/api/events`, `/api/shows`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/events` | Public | List events (supports `?type=&date=` filters) |
| POST | `/api/events` | Organiser | Create an event |
| POST | `/api/events/:id/shows` | Organiser | Create a show (auto-generates `show_seats`) |
| GET | `/api/shows/:id/seats` | Public | Get full real-time seat map for a show |
| POST | `/api/shows/:id/hold` | Customer | Hold specific seats (10-min TTL) |
| POST | `/api/shows/:id/release`| Customer | Manually release held seats |

### Bookings & Waitlist (`/api/bookings`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/confirm` | Customer | Confirm booking for held seats |
| GET | `/my` | Customer | View your booking history |
| DELETE| `/:id/cancel` | Customer | Cancel booking, release seats to pool/waitlist |
| POST | `/waitlist` | Customer | Join waitlist for a sold-out category |

---

## 🗄️ Database Schema Overview

The system uses PostgreSQL with the following core entities:
- **`users`**: Manages customers, organisers, and admins.
- **`venues` & `seat_layouts`**: Defines physical locations and their specific row/seat topologies.
- **`events` & `shows`**: Events created by organisers, with specific showtimes tied to venues.
- **`show_seats`**: The core inventory table. Auto-generated when a show is created. Tracks real-time status (`available`, `held`, `booked`), lock expirations (`held_until`), and pricing.
- **`bookings` & `booking_seats`**: Records confirmed purchases and the specific seats associated with them. Generates a QR payload.
- **`waitlist`**: Tracks users waiting for specific categories in a show, maintaining their queue `position`.

---

## ⏱️ Seat Hold TTL & Waitlist Logic (Brief)

To prevent cart abandonment from locking up inventory, the system employs a **TTL (Time-To-Live) Seat Hold Mechanism**. When a user selects a seat, it is locked using a Redis `SET NX` command and marked as `held` in PostgreSQL for 10 minutes. If the booking is not confirmed within this window, a BullMQ background job automatically releases the seat back to the pool.

If the show is sold out, users can join a **Waitlist**. When a booked seat is cancelled or a hold expires, the system automatically queries the waitlist, finds the user with the lowest queue position, and sends them a time-limited (15-minute) JWT-secured email offer.

*For an in-depth explanation of the concurrency handling and distributed mutex design, please read `SYSTEM_DESIGN.md`.*
