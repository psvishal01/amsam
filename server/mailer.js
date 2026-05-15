const { google } = require('googleapis');
const QRCode = require('qrcode');

/**
 * Creates an authorized Gmail API client.
 */
function getGmailClient() {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } = process.env;
  
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    throw new Error('Gmail API credentials missing.');
  }

  const oauth2Client = new google.auth.OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );

  oauth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * Helper to encode MIME messages for Gmail API.
 */
function encodeMessage(message) {
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Sends a welcome email with login credentials.
 */
async function sendWelcomeEmail(opts) {
  const { toEmail, studentName, username, password, portalUrl = 'https://amsam-jo9k.onrender.com/index.html' } = opts;
  const gmail = getGmailClient();

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
</html>
  `.trim();

  const str = [
    `Content-Type: text/html; charset="UTF-8"\n`,
    `MIME-Version: 1.0\n`,
    `Content-Transfer-Encoding: 7bit\n`,
    `to: ${toEmail}\n`,
    `from: "AMSAM Portal" <${process.env.MAIL_USER}>\n`,
    `subject: 🎉 Welcome to AMSAM Portal – Your Login Credentials\n\n`,
    html
  ].join('');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodeMessage(str) }
  });
}

/**
 * Sends a payment receipt with a QR code.
 */
async function sendReceiptEmail(opts) {
  const { toEmail, studentName, eventTitle, eventDate, eventVenue, amountPaid, paymentId, qrCode } = opts;
  const gmail = getGmailClient();
  const qrBuffer = await QRCode.toBuffer(qrCode);
  const boundary = "__BOUNDARY__";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    .container { font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
    .header { background: #2e7d32; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; line-height: 1.6; color: #333; }
    .qr-box { text-align: center; margin: 30px 0; padding: 20px; border: 2px dashed #ccc; background: #fff; }
    .details { background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h2>Registration Confirmed</h2></div>
    <div class="content">
      <p>Dear ${studentName},</p>
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
        <img src="cid:event_qr_code" width="200" alt="QR Code">
        <p><small>Please present this QR code at the venue for check-in.</small></p>
      </div>
    </div>
    <div class="footer">
      AMSAM Portal - AIIMS Mangalagiri
    </div>
  </div>
</body>
</html>
  `.trim();

  const message = [
    `Content-Type: multipart/related; boundary="${boundary}"\n`,
    `MIME-Version: 1.0\n`,
    `to: ${toEmail}\n`,
    `from: "AMSAM Portal" <${process.env.MAIL_USER}>\n`,
    `subject: ✅ Payment Receipt – ${eventTitle}\n\n`,

    `--${boundary}\n`,
    `Content-Type: text/html; charset="UTF-8"\n`,
    `Content-Transfer-Encoding: 7bit\n\n`,
    html + '\n\n',

    `--${boundary}\n`,
    `Content-Type: image/png\n`,
    `Content-Transfer-Encoding: base64\n`,
    `Content-ID: <event_qr_code>\n`,
    `Content-Disposition: inline; filename="qr.png"\n\n`,
    qrBuffer.toString('base64') + '\n',
    `--${boundary}--`
  ].join('');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodeMessage(message) }
  });
}

module.exports = { sendReceiptEmail, sendWelcomeEmail };
