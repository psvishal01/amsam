const nodemailer = require('nodemailer');
const QRCode = require('qrcode');

// ── Send via Gmail OAuth2 (Works on all cloud hosts via HTTPS) ────
function getTransporter() {
  const { MAIL_USER, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } = process.env;
  
  if (!MAIL_USER || !GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    throw new Error('Gmail OAuth2 credentials missing. Check GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN.');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: MAIL_USER,
      clientId: GMAIL_CLIENT_ID,
      clientSecret: GMAIL_CLIENT_SECRET,
      refreshToken: GMAIL_REFRESH_TOKEN,
    },
  });
}

/**
 * Sends a styled payment receipt email after a successful event registration.
 * @param {object} opts - { toEmail, studentName, eventTitle, eventDate, eventVenue, amountPaid, paymentId, qrCode }
 */
async function sendReceiptEmail(opts) {
  const { toEmail, studentName, eventTitle, eventDate, eventVenue, amountPaid, paymentId, qrCode } = opts;

  const formattedDate = eventDate
    ? new Date(eventDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'TBD';

  const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amountPaid);

  // Generate QR code as a PNG buffer — use CID attachment (works in all email clients incl. Gmail)
  const qrBuffer = await QRCode.toBuffer(qrCode, {
    width: 200,
    margin: 2,
    color: { dark: '#1A2040', light: '#FFFFFF' }
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Payment Receipt - AMSAM</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1A2040 0%,#009688 100%);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:1px;">AMSAM</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px;letter-spacing:2px;text-transform:uppercase;">AIIMS Mangalagiri Student Association of Medicine</p>
            </td>
          </tr>

          <!-- Success Badge -->
          <tr>
            <td style="padding:32px 40px 0;text-align:center;">
              <div style="display:inline-block;background:#e6f7f5;border:2px solid #009688;border-radius:50px;padding:10px 24px;">
                <span style="color:#009688;font-weight:700;font-size:15px;">✅ Payment Successful</span>
              </div>
              <h2 style="margin:20px 0 4px;color:#1A2040;font-size:22px;">Your Registration is Confirmed!</h2>
              <p style="margin:0;color:#64748b;font-size:14px;">Hi <strong>${studentName}</strong>, here is your receipt for the event below.</p>
            </td>
          </tr>

          <!-- Event Card -->
          <tr>
            <td style="padding:28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
                <tr>
                  <td style="background:#1A2040;padding:14px 20px;">
                    <p style="margin:0;color:#ffffff;font-weight:700;font-size:16px;">${eventTitle}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px;">
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color:#64748b;font-size:13px;width:40%;">📅 Date</td>
                        <td style="color:#1A2040;font-size:13px;font-weight:600;">${formattedDate}</td>
                      </tr>
                      <tr>
                        <td style="color:#64748b;font-size:13px;">📍 Venue</td>
                        <td style="color:#1A2040;font-size:13px;font-weight:600;">${eventVenue || 'To be announced'}</td>
                      </tr>
                      <tr>
                        <td style="color:#64748b;font-size:13px;">💳 Amount Paid</td>
                        <td style="color:#009688;font-size:15px;font-weight:700;">${formattedAmount}</td>
                      </tr>
                      <tr>
                        <td style="color:#64748b;font-size:13px;">🔖 Payment ID</td>
                        <td style="color:#1A2040;font-size:12px;font-family:monospace;">${paymentId}</td>
                      </tr>
                    </table>

                    <!-- QR Code Image (CID inline attachment) -->
                    <div style="text-align:center;margin-top:20px;padding-top:20px;border-top:1px solid #e2e8f0;">
                      <p style="margin:0 0 12px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">🎫 Entry QR Code</p>
                      <img src="cid:event_qr_code" alt="Entry QR Code" width="160" height="160" style="border-radius:8px;border:3px solid #1A2040;display:block;margin:0 auto;"/>
                      <p style="margin:10px 0 0;color:#94a3b8;font-size:11px;font-family:monospace;">${qrCode}</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Info Note -->
          <tr>
            <td style="padding:0 40px 28px;">
              <div style="background:#fffbeb;border:1px solid #f59e0b;border-radius:8px;padding:14px 18px;">
                <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
                  <strong>📌 Important:</strong> Please show the QR Code from your AMSAM portal profile at the event entrance for admission. Keep this email as proof of registration.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">This is an automated receipt from the AMSAM Portal.<br/>Please do not reply to this email.</p>
              <p style="margin:8px 0 0;color:#009688;font-size:12px;font-weight:600;">AIIMS Mangalagiri · AMSAM Club</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"AMSAM Portal" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: `✅ Payment Receipt – ${eventTitle}`,
    html,
    attachments: [
      {
        filename: 'qr_code.png',
        content: qrBuffer,
        cid: 'event_qr_code',
      }
    ]
  });
}

/**
 * Sends a welcome email to a newly imported student with their login credentials.
 * @param {object} opts - { toEmail, studentName, username, password, portalUrl }
 */
async function sendWelcomeEmail(opts) {
  const { toEmail, studentName, username, password, portalUrl = 'https://amsam-production.up.railway.app/index.html' } = opts;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to AMSAM Portal</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1A2040 0%,#009688 100%);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:1px;">AMSAM</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px;letter-spacing:2px;text-transform:uppercase;">AIIMS Mangalagiri Student Association of Medicine</p>
            </td>
          </tr>

          <!-- Welcome Banner -->
          <tr>
            <td style="padding:32px 40px 0;text-align:center;">
              <div style="display:inline-block;background:#e6f7f5;border:2px solid #009688;border-radius:50px;padding:10px 24px;">
                <span style="color:#009688;font-weight:700;font-size:15px;">🎉 Welcome to the Portal!</span>
              </div>
              <h2 style="margin:20px 0 4px;color:#1A2040;font-size:22px;">Hi ${studentName}, your account is ready</h2>
              <p style="margin:0;color:#64748b;font-size:14px;line-height:1.6;">Your AMSAM member account has been created by the admin.<br/>Use the credentials below to log in for the first time.</p>
            </td>
          </tr>

          <!-- Credentials Card -->
          <tr>
            <td style="padding:28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
                <tr>
                  <td style="background:#1A2040;padding:14px 20px;">
                    <p style="margin:0;color:#ffffff;font-weight:700;font-size:15px;">🔐 Your Login Credentials</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px;">
                    <table width="100%" cellpadding="10" cellspacing="0">
                      <tr>
                        <td style="color:#64748b;font-size:13px;width:40%;">
                          📧 Username / Email
                        </td>
                        <td style="background:#eef2ff;border-radius:6px;padding:10px 14px;font-family:monospace;font-size:14px;color:#1A2040;font-weight:600;">
                          ${username}
                        </td>
                      </tr>
                      <tr><td colspan="2" style="padding:4px 0;"></td></tr>
                      <tr>
                        <td style="color:#64748b;font-size:13px;">
                          🔑 Temporary Password
                        </td>
                        <td style="background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:10px 14px;font-family:monospace;font-size:16px;color:#c2410c;font-weight:700;letter-spacing:1px;">
                          ${password}
                        </td>
                      </tr>
                    </table>

                    <!-- CTA Button -->
                    <div style="text-align:center;margin-top:28px;">
                      <a href="${portalUrl}" style="display:inline-block;background:linear-gradient(135deg,#1A2040,#009688);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.5px;">Login to AMSAM Portal →</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Security Note -->
          <tr>
            <td style="padding:0 40px 28px;">
              <div style="background:#fffbeb;border:1px solid #f59e0b;border-radius:8px;padding:14px 18px;">
                <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
                  <strong>📌 Important:</strong> Please change your password immediately after your first login for security. Keep your credentials private and do not share them with anyone.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">This is an automated email from the AMSAM Portal.<br/>Please do not reply to this email.</p>
              <p style="margin:8px 0 0;color:#009688;font-size:12px;font-weight:600;">AIIMS Mangalagiri · AMSAM Club</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"AMSAM Portal" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: `🎉 Welcome to AMSAM Portal – Your Login Credentials`,
    html,
  });
}

module.exports = { sendReceiptEmail, sendWelcomeEmail };

