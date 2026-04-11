const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

const sendMail = async ({ to, subject, html }) => {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || 'noreply@example.com';

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[Email] SMTP credentials not configured, skipping email.');
    return;
  }

  await transporter.sendMail({ from, to, subject, html });
  console.log(`[Email] ✅ Sent to ${to}: ${subject}`);
};

module.exports = { sendMail };
