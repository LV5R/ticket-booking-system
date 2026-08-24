import nodemailer from 'nodemailer';

// ── Guard: skip sending if credentials missing ────────────────────────────────
const isConfigured = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[email.service] EMAIL_USER / EMAIL_PASS not set — skipping send.');
    return false;
  }
  return true;
};

// Lazy transporter — created only if credentials are present
const getTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

// ── sendBookingConfirmation ───────────────────────────────────────────────────
export const sendBookingConfirmation = async (email, bookingRef, qrDataUrl, eventDetails = {}) => {
  if (!isConfigured()) return;

  const { eventTitle = '', venueName = '', date = '', time = '', seats = [], totalAmount = 0 } = eventDetails;

  const seatRows = seats
    .map(s => `<tr>
      <td style="padding:4px 8px">${s.category}</td>
      <td style="padding:4px 8px">Row ${s.row_label}, Seat ${s.seat_number}</td>
      <td style="padding:4px 8px">₹${s.price}</td>
    </tr>`)
    .join('');

  const qrImg = qrDataUrl
    ? `<p><strong>Your entry QR code:</strong></p><img src="${qrDataUrl}" width="200" alt="QR Code"/>`
    : '';

  await getTransporter().sendMail({
    from: `"Ticket Booking" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: email,
    subject: `✅ Booking Confirmed — ${eventTitle} [${bookingRef}]`,
    html: `
      <h2 style="color:#2d6a4f">Booking Confirmed!</h2>
      <p><strong>Booking Ref:</strong> <code>${bookingRef}</code></p>
      <p><strong>Event:</strong> ${eventTitle}</p>
      <p><strong>Venue:</strong> ${venueName}</p>
      <p><strong>Date & Time:</strong> ${date} at ${time}</p>
      <table border="1" cellspacing="0" style="border-collapse:collapse;margin-top:8px">
        <thead><tr>
          <th style="padding:4px 8px">Category</th>
          <th style="padding:4px 8px">Seat</th>
          <th style="padding:4px 8px">Price</th>
        </tr></thead>
        <tbody>${seatRows}</tbody>
      </table>
      <p><strong>Total Amount:</strong> ₹${totalAmount}</p>
      ${qrImg}
      <hr/><p style="font-size:12px;color:#888">Please show this QR at the venue entrance.</p>
    `,
  });

  console.log(`[email.service] Confirmation sent to ${email} [${bookingRef}]`);
};

// ── sendWaitlistOffer ─────────────────────────────────────────────────────────
export const sendWaitlistOffer = async (email, showId, category, confirmationLink, expiresInMinutes = 15) => {
  if (!isConfigured()) return;

  await getTransporter().sendMail({
    from: `"Ticket Booking" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: email,
    subject: `🎟️ Seat Available — Waitlist Offer (${category})`,
    html: `
      <h2 style="color:#1d3557">Good news! A seat is available for you.</h2>
      <p>A <strong>${category}</strong> seat for show #${showId} has just become available.</p>
      <p>This offer expires in <strong>${expiresInMinutes} minutes</strong>.</p>
      <p>
        <a href="${confirmationLink}"
           style="display:inline-block;padding:10px 20px;background:#e63946;color:#fff;
                  border-radius:4px;text-decoration:none;font-weight:bold">
          Confirm My Seat Now
        </a>
      </p>
      <p style="font-size:12px;color:#888">
        If you did not join this waitlist, ignore this email.
      </p>
    `,
  });

  console.log(`[email.service] Waitlist offer sent to ${email} (show ${showId}, ${category})`);
};
