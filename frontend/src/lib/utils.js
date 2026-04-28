import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function maskEmail(email) {
  if (!email || email === 'N/A') return email;
  const [user, domain] = email.split('@');
  if (!domain) return email;
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user[0]}***${user[user.length - 1]}@${domain}`;
}

export function maskPhone(phone) {
  if (!phone || phone === 'N/A') return phone;
  const cleaned = phone.toString().trim();
  if (cleaned.length < 4) return '***';
  return `${cleaned.slice(0, -4).replace(/\d/g, '*').replace(/[^\*]/g, slice => slice)}${cleaned.slice(-4)}`;
}
// For phone, a simpler version that keeps formatting but masks digits:
export function maskPhoneNumber(phone) {
    if (!phone || phone === 'N/A') return phone;
    // Replace all but last 4 digits with *
    return phone.replace(/\d(?=\d{4})/g, "*");
}
