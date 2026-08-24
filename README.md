# 🎟️ TicketFlow: Full-Stack Ticket Booking System

A modern, high-performance ticket booking platform built with **React**, **Node.js**, **PostgreSQL**, and **Redis**. TicketFlow handles real-time concurrency for seat selections, dynamic pricing, and role-based access for customers and event organisers.

---

## ✨ Key Features

### 🏢 Role-Based Access Control (RBAC)
- **Customers:** Browse events, view interactive seat maps, place real-time seat holds, and manage bookings.
- **Organisers:** Access a dedicated Organiser Dashboard to seamlessly create events, schedule shows, and manage venues.

### 🎭 Interactive Seat Map & Dynamic Pricing
- **Real-Time Map:** Visual grid layout mapped strictly by rows and seat numbers, preventing UI warping on all devices.
- **Tiered Pricing Categories:** Dynamically color-coded seats based on pricing tiers (e.g., VIP, Premium, Standard).
- **Live Checkout Summary:** See exactly what you're paying for with a detailed category breakdown before purchase.

### ⏱️ Concurrency & Live Countdown Timers
- **Distributed Locks (Redis):** Seats are held atomically using Redis `SET NX EX` to guarantee that double-booking is impossible even under massive traffic.
- **Live Sync (WebSockets):** The seat map updates in real-time for all viewing users the millisecond a seat is held, booked, or released.
- **Smart Countdown:** Once a seat is held, a precise countdown timer securely synchronized with the database dictates the TTL (Time-To-Live). If it expires, the seat automatically releases.

### 🌓 Modern UI/UX (Tailwind v4)
- **Dark & Light Mode:** System-respecting dark mode seamlessly integrated across every component.
- **My Bookings:** Detailed dashboard for customers showing past/upcoming tickets, live QR codes for entry, per-seat pricing breakdowns, and an elegant cancellation flow.

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React + Vite
- **Styling:** Tailwind CSS v4
- **Routing:** React Router DOM
- **Real-time:** Socket.io-client
- **Icons:** Lucide React

### Backend
- **Server:** Node.js + Express
- **Database:** PostgreSQL (pg)
- **Caching & Locks:** Redis (ioredis)
- **Background Jobs:** BullMQ
- **Real-time:** Socket.io
- **Auth:** JWT (JSON Web Tokens) & bcrypt

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)
- Redis Server (Native or via WSL on Windows)

### 1. Clone the repository
```bash
git clone https://github.com/LV5R/ticket-booking-system.git
cd ticket-booking-system
```

### 2. Backend Setup
```bash
cd backend
npm install
```
- Create a `.env` file in the `backend` directory based on the database configuration needed.
- Seed the database:
```bash
npm run seed
```
- Start the backend and Redis server:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```
- Navigate to `http://localhost:5173` to view the app!

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome. Feel free to check issues page.
