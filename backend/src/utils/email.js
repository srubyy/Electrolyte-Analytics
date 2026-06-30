import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Resend client only if API key is present
export const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const sendEmail = async ({ to, subject, html, cc = [] }) => {
  if (!resend) {
    console.warn(`⚠️ Resend API Key is missing. Simulation: Email with subject "${subject}" would have been sent to ${to}.`);
    return { success: true, simulated: true };
  }

  const payload = {
    from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
    to,
    subject,
    html
  };

  if (cc && cc.length > 0) {
    payload.cc = cc;
  }

  return resend.emails.send(payload);
};
