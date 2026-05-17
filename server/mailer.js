const { Resend } = require('resend');
const QRCode = require('qrcode');

// ── Resend API client (uses HTTPS — works on all cloud hosts) ─────
function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set in environment variables.');
  }
  return new Resend(process.env.RESEND_API_KEY);
}

// ── Welcome Email ─────────────────────────────────────────────────
async function sendWelcomeEmail(opts) {
  const {
    toEmail,
    studentName,
    username,
    password,
    portalUrl = process.env.PORTAL_URL || 'https://amsam-jo9k.onrender.com/index.html',
  } = opts;

  const resend = getResendClient();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    .container { font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
    .header { background: #1a237e; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; line-height: 1.6; color: #333; }
    .creds { background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #1a237e; }
    .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    .button { display: inline-block; padding: 12px 24px; background: #1a237e; color: white !important; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Welcome to AMSAM</h1></div>
    <div class="content">
      <p>Hello <strong>${studentName}</strong>,</p>
      <p>Your account for the AMSAM Membership Portal has been created. You can now log in to register for events and manage your profile.</p>
      <div class="creds">
        <strong>Login Details:</strong><br>
        Username: <code>${username}</code><br>
        Password: <code>${password}</code>
      </div>
      <p>Please change your password after your first login for security.</p>
      <a href="${portalUrl}" class="button">Log In to Portal</a>
    </div>
    <div class="footer">
      Association of Medical Students of AIIMS Mangalagiri<br>
      This is an automated message, please do not reply.
    </div>
  </div>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: 'AMSAM Portal <onboarding@resend.dev>',
    to: [toEmail],
    subject: '🎉 Welcome to AMSAM Portal – Your Login Credentials',
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }
}

// ── Receipt Email with QR Code ────────────────────────────────────
async function sendReceiptEmail(opts) {
  const {
    toEmail,
    studentName,
    eventTitle,
    eventDate,
    eventVenue,
    amountPaid,
    paymentId,
    qrCode,
  } = opts;

  const resend = getResendClient();
  const qrDataUrl = await QRCode.toDataURL(qrCode);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    .container { font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
    .header { background: #2e7d32; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; line-height: 1.6; color: #333; }
    .qr-box { text-align: center; margin: 30px 0; padding: 20px; border: 2px dashed #ccc; }
    .details { background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h2>Registration Confirmed ✅</h2></div>
    <div class="content">
      <p>Dear <strong>${studentName}</strong>,</p>
      <p>Thank you for registering for <strong>${eventTitle}</strong>. Your payment was successful.</p>
      <div class="details">
        <strong>Event Details:</strong><br>
        📅 Date: ${eventDate}<br>
        📍 Venue: ${eventVenue}<br>
        💰 Amount Paid: ₹${amountPaid}<br>
        🆔 Payment ID: ${paymentId}
      </div>
      <div class="qr-box">
        <p><strong>Your Entry Ticket (QR Code)</strong></p>
        <img src="${qrDataUrl}" width="200" alt="QR Code">
        <p><small>Present this QR code at the venue for check-in.</small></p>
      </div>
    </div>
    <div class="footer">AMSAM Portal – AIIMS Mangalagiri</div>
  </div>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: 'AMSAM Portal <onboarding@resend.dev>',
    to: [toEmail],
    subject: `✅ Payment Receipt – ${eventTitle}`,
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }
}

module.exports = { sendReceiptEmail, sendWelcomeEmail };
