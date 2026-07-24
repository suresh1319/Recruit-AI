import nodemailer from 'nodemailer';

// Reuse a pooled transporter instance for performance
let _transporter = null;
const getTransporter = () => {
    if (!_transporter) {
        _transporter = nodemailer.createTransport({
            service: 'gmail',
            pool: true,            // Reuse SMTP connections instead of a new handshake per email
            maxConnections: 5,     // Allow up to 5 concurrent SMTP connections
            maxMessages: 100,      // Max messages per connection before cycling
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            connectionTimeout: 5000,   // 5s to establish connection (was 10s)
            socketTimeout: 10000,      // 10s socket inactivity timeout (was 15s)
        });
    }
    return _transporter;
};

/**
 * Send an email using Nodemailer
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} html - HTML body (optional)
 */
export const sendEmail = async (to, subject, text, html) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn('EMAIL_USER or EMAIL_PASS missing in environment variables. Email sending skipped.');
            return false;
        }

        const transporter = getTransporter();

        const mailOptions = {
            from: `"RecruitAI" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        return true;
    } catch (error) {
        console.error('Error sending email (check credentials / Gmail App password):', error.message);
        // Reset transporter so next call gets a fresh one (handles auth token expiry)
        _transporter = null;
        return false;
    }
};
