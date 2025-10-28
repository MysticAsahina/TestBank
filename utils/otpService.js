// utils/otpService.js
import crypto from "crypto";
import { sendOTPEmail } from "./emailService.js";

const otpStore = new Map(); // temp in-memory storage (email → { otp, expiresAt })

export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
}

export async function sendUserOTP(email) {
  const otp = generateOTP();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  otpStore.set(email, { otp, expiresAt });

  try {
    await sendOTPEmail(email, otp);
    console.log(`✅ OTP sent to ${email}: ${otp}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to send OTP to ${email}:`, err.message);
    throw err;
  }
}

export function verifyUserOTP(email, userInput) {
  const record = otpStore.get(email);
  if (!record) return { valid: false, reason: "No OTP found" };
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return { valid: false, reason: "OTP expired" };
  }
  if (record.otp !== userInput) return { valid: false, reason: "Incorrect OTP" };
  otpStore.delete(email); // one-time use
  return { valid: true };
}
