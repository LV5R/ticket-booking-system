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

const brandHeader = `
  <div style="background-color: #111827; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #4f46e5; margin: 0; font-family: sans-serif; letter-spacing: 1px;">TicketFlow</h1>
  </div>
`;

const footer = `
  <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #6b7280; font-family: sans-serif;">
    <p>See you there!</p>
    <p>© ${new Date().getFullYear()} TicketFlow. All rights reserved.</p>
  </div>
`;

// ── sendBookingConfirmation ───────────────────────────────────────────────────
export const sendBookingConfirmation = async (email, bookingRef, qrDataUrl, eventDetails = {}) => {
  if (!isConfigured()) return;

  const { eventTitle = '', venueName = '', date = '', time = '', seats = [], totalAmount = 0 } = eventDetails;

  const seatRows = seats
    .map(s => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 8px; color: #4b5563;">${s.category}</td>
        <td style="padding: 12px 8px; color: #111827; font-weight: bold;">Row ${s.row_label}, Seat ${s.seat_number}</td>
        <td style="padding: 12px 8px; color: #111827;">₹${s.price}</td>
      </tr>
    `).join('');

  // Convert base64 data URL to buffer for inline attachment
  const attachments = [];
  let qrImgHtml = '';
  
  if (qrDataUrl) {
    const base64Data = qrDataUrl.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    attachments.push({
      filename: 'ticket-qr.png',
      content: buffer,
      cid: 'qr-code-image' // same cid value as in the html img src
    });
    qrImgHtml = `
      <div style="text-align: center; margin-top: 24px; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
        <p style="margin-bottom: 12px; color: #4b5563; font-weight: bold; font-family: sans-serif;">Your Entry Ticket</p>
        <img src="cid:qr-code-image" width="200" alt="QR Code" style="display: block; margin: 0 auto; border-radius: 8px;"/>
        <p style="font-size: 12px; color: #6b7280; margin-top: 12px; font-family: sans-serif;">Please scan this QR at the venue entrance.</p>
      </div>
    `;
  }

  const formattedDate = new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  try {
    await getTransporter().sendMail({
      from: `"TicketFlow" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: `✅ Booking Confirmed — ${eventTitle} [${bookingRef}]`,
      attachments,
      html: `
        <div style="max-w-2xl mx-auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; font-family: sans-serif; overflow: hidden; max-width: 600px; margin: 0 auto;">
          ${brandHeader}
          <div style="padding: 30px;">
            <h2 style="color: #111827; margin-top: 0; font-size: 24px;">Booking Confirmed!</h2>
            <p style="color: #4b5563; line-height: 1.6;">Your tickets for <strong>${eventTitle}</strong> have been successfully booked. Save this email for your records.</p>
            
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 24px 0;">
              <p style="margin: 0 0 8px 0; color: #4b5563;"><strong>Booking Ref:</strong> <span style="color: #4f46e5; font-family: monospace; font-size: 16px;">${bookingRef}</span></p>
              <p style="margin: 0 0 8px 0; color: #4b5563;"><strong>Date & Time:</strong> ${formattedDate} at ${time}</p>
              <p style="margin: 0; color: #4b5563;"><strong>Venue:</strong> ${venueName}</p>
            </div>

            <h3 style="color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Order Details</h3>
            <table width="100%" cellspacing="0" cellpadding="0" style="margin-top: 16px; text-align: left;">
              <thead>
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 12px 8px; color: #6b7280; font-size: 14px;">Category</th>
                  <th style="padding: 12px 8px; color: #6b7280; font-size: 14px;">Seat</th>
                  <th style="padding: 12px 8px; color: #6b7280; font-size: 14px;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${seatRows}
              </tbody>
            </table>
            
            <div style="text-align: right; margin-top: 16px; font-size: 18px;">
              <strong style="color: #111827;">Total Paid: <span style="color: #4f46e5;">₹${totalAmount}</span></strong>
            </div>

            ${qrImgHtml}
            ${footer}
          </div>
        </div>
      `,
    });
    console.log(`[email.service] Confirmation sent to ${email} [${bookingRef}]`);
  } catch (err) {
    console.error('[email.service] Error sending confirmation:', err.message);
  }
};

// ── sendBookingCancellation ───────────────────────────────────────────────────
export const sendBookingCancellation = async (email, bookingRef, eventDetails = {}) => {
  if (!isConfigured()) return;

  const { eventTitle = '', totalAmount = 0 } = eventDetails;

  try {
    await getTransporter().sendMail({
      from: `"TicketFlow" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: `❌ Booking Cancelled — ${bookingRef}`,
      html: `
        <div style="max-w-2xl mx-auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; font-family: sans-serif; overflow: hidden; max-width: 600px; margin: 0 auto;">
          ${brandHeader}
          <div style="padding: 30px;">
            <h2 style="color: #dc2626; margin-top: 0; font-size: 24px;">Booking Cancelled</h2>
            <p style="color: #4b5563; line-height: 1.6;">Your booking for <strong>${eventTitle}</strong> (Ref: <code>${bookingRef}</code>) has been successfully cancelled.</p>
            <p style="color: #4b5563; line-height: 1.6;">A refund of <strong>₹${totalAmount}</strong> has been initiated and will reflect in your original payment method according to standard processing times.</p>
            ${footer}
          </div>
        </div>
      `,
    });
    console.log(`[email.service] Cancellation sent to ${email} [${bookingRef}]`);
  } catch (err) {
    console.error('[email.service] Error sending cancellation:', err.message);
  }
};

// ── sendWaitlistOffer ─────────────────────────────────────────────────────────
export const sendWaitlistOffer = async (email, showId, category, confirmationLink, expiresInMinutes = 15) => {
  if (!isConfigured()) return;

  try {
    await getTransporter().sendMail({
      from: `"TicketFlow" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: `🎟️ Seat Available — Waitlist Offer (${category})`,
      html: `
        <div style="max-w-2xl mx-auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; font-family: sans-serif; overflow: hidden; max-width: 600px; margin: 0 auto;">
          ${brandHeader}
          <div style="padding: 30px;">
            <h2 style="color: #111827; margin-top: 0; font-size: 24px;">Great news! A seat is available.</h2>
            <p style="color: #4b5563; line-height: 1.6;">A <strong>${category}</strong> seat for the event you were waitlisted on has just become available.</p>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0;">
              <p style="margin: 0; color: #991b1b; font-weight: bold;">Action Required</p>
              <p style="margin: 8px 0 0 0; color: #991b1b;">This exclusive offer expires in exactly <strong>${expiresInMinutes} minutes</strong>.</p>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${confirmationLink}"
                 style="display: inline-block; padding: 14px 28px; background-color: #4f46e5; color: #ffffff;
                        border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                Secure My Seat Now
              </a>
            </div>
            
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">
              If you did not join this waitlist or no longer wish to attend, you can safely ignore this email.
            </p>
            ${footer}
          </div>
        </div>
      `,
    });
    console.log(`[email.service] Waitlist offer sent to ${email} (show ${showId}, ${category})`);
  } catch (err) {
    console.error('[email.service] Error sending waitlist offer:', err.message);
  }
};
