# System Design: High-Concurrency Ticket Booking System

Building a ticket booking system presents unique distributed systems challenges, particularly regarding inventory management. When a highly anticipated event goes on sale, hundreds or thousands of users may attempt to purchase the same seat simultaneously. If the system's concurrency controls are inadequate, it can lead to double-booking—a catastrophic failure in a ticketing domain. 

Furthermore, users often select seats but abandon their carts during the checkout phase. Without an automated mechanism to return these seats to the available pool, inventory becomes permanently locked, causing revenue loss for the organiser and frustration for the customers. 

This document outlines the architectural decisions, concurrency control mechanisms, and automated queuing systems implemented to solve these challenges robustly.

---

## 1. Seat Hold and TTL Mechanism

To address the cart abandonment problem, the system implements a strict Time-To-Live (TTL) seat hold mechanism. When a user selects a seat on the frontend map, the system temporarily reserves the seat for a fixed window—typically 10 minutes. 

During this window, the seat is removed from the `available` pool. The frontend visually indicates to all other connected clients (via real-time Socket.IO broadcasts) that the seat is `held`, preventing them from even attempting to select it. 

The state of this hold is managed dually:
1. **PostgreSQL Persistence:** The `show_seats` table updates the specific seat's row, setting the `status` to `held`, recording the `held_by` user ID, and setting a `held_until` timestamp.
2. **Redis Ephemeral Storage:** A key is created in Redis representing the hold, configured to expire exactly when the hold window closes.

To enforce the expiration, the system utilizes **BullMQ**, a Redis-based job queue. At the exact moment the hold is granted, a scheduled job is pushed to the `seat-expiry` queue with a delay matching the TTL (e.g., 600,000 milliseconds). When the delay elapses, the BullMQ worker wakes up, verifies if the seat is still marked as `held` in PostgreSQL, and if so, safely executes a release operation, returning it to the `available` pool and notifying frontend clients.

---

## 2. Concurrency Prevention using Redis NX

The most critical point of failure in ticketing is the exact moment a user attempts to hold a seat. If two users click the same "available" seat at the exact same millisecond, two identical HTTP requests reach the backend API. 

If the backend relied solely on standard SQL `UPDATE` statements, there is a risk of database contention or race conditions depending on the transaction isolation level. While a PostgreSQL `SELECT ... FOR UPDATE` could lock the row, doing this under massive load can exhaust database connection pools and severely degrade performance.

To achieve lightning-fast, high-throughput concurrency control, this system implements a **Distributed Mutex using Redis**.

When a request arrives to hold a seat, the system executes the following Redis command:
`SET seat:hold:{showSeatId} {customerId} NX EX 600`

The `NX` (Not eXists) flag is the secret to this architecture. Redis operates on a single-threaded event loop, guaranteeing that operations are strictly atomic. When two concurrent requests attempt to `SET` the exact same key with the `NX` flag:
- The **first** request successfully writes the key, applies the 600-second expiration, and receives a positive acknowledgment.
- The **second** request (even if processed just one microsecond later) detects the key already exists. Redis instantly rejects the `SET` operation, returning `null`.

The backend immediately aborts the transaction for the second user, returning a `409 Conflict` error, completely shielding the PostgreSQL database from the race condition. 

Only the victorious request is allowed to proceed to the database layer to update the `show_seats` table. As a secondary safeguard, the SQL update includes a conditional clause (`WHERE status = 'available'`). This two-tier guard ensures that double-booking is mathematically impossible under any concurrent load.

---

## 3. Waitlist Auto-Assignment Flow

When an event sells out, demand often remains high. Rather than forcing users to manually refresh the page hoping for a cancellation, the system provides an automated Waitlist. 

Users can join the waitlist for a specific ticket category (e.g., "VIP" or "General Admission"). The system utilizes a PostgreSQL Common Table Expression (CTE) to atomically calculate the next available queue position and insert the user into the `waitlist` table.

The waitlist acts as a passive queue until an inventory event occurs. Inventory events happen in two scenarios:
1. A user's 10-minute hold TTL expires, and the BullMQ worker releases the seat.
2. A user explicitly cancels a previously confirmed booking, returning the seats to the pool.

When either of these events triggers, the system intercepts the released seat and bypasses the public pool. Instead, it queries the `waitlist` table for the oldest entry (`ORDER BY position ASC LIMIT 1`). To prevent race conditions during assignment, this query utilizes `FOR UPDATE SKIP LOCKED`, ensuring that if multiple seats are released simultaneously, background workers won't attempt to assign them to the same waiting user.

---

## 4. Time-Limited Offer Handling

Once a waitlisted user is selected for an available seat, the system generates a **Time-Limited Offer**. 

The seat is placed into a specialized hold state, locked to the waitlisted user. The system generates a secure JSON Web Token (JWT) embedding the user's ID, the seat ID, and an expiration timestamp (e.g., 15 minutes). This JWT is injected into a confirmation link and emailed to the user via Nodemailer.

Simultaneously, a new job is dispatched to the `waitlist-offer` BullMQ queue, scheduled to execute in 15 minutes. 

If the user clicks the link and completes the checkout, the booking is confirmed, and the waitlist entry is marked as `fulfilled`. However, if the user ignores the email and the 15-minute window expires, the BullMQ worker activates. It invalidates the offer, marks the waitlist entry as `expired`, and immediately recursively invokes the assignment logic to offer the seat to the *next* person in the queue. 

This automated, self-healing pipeline ensures that highly sought-after inventory is continuously pushed toward paying customers without manual intervention from the event organisers.
