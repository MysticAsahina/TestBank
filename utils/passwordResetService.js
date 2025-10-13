import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send reset password link
export async function sendPasswordResetEmail(email, token) {
  const resetLink = `http://localhost:8000/reset-password/${token}`;
  const mailOptions = {
    from: `"QuizBank Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Password Reset Request",
    html: `
      <p>Hello,</p>
      <p>You requested to reset your password. Click below to reset it:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>This link will expire in 15 minutes.</p>
    `,
  };
  await transporter.sendMail(mailOptions);
  console.log(`📧 Password reset link sent to ${email}`);
}

// Send initial setup link (for newly created accounts)
export async function sendPasswordSetupEmail(email, userId) {
  const setupLink = `http://localhost:8000/setup-password/${userId}`;
  const mailOptions = {
    from: `"QuizBank Admin" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Set Up Your QuizBank Account Password",
    html: `
      <p>Hello,</p>
      <p>Your QuizBank account has been created. Click below to set your password:</p>
      <a href="${setupLink}">${setupLink}</a>
      <p>This link will expire in 15 minutes.</p>
    `,
  };
  await transporter.sendMail(mailOptions);
  console.log(`📧 Setup email sent to ${email}`);
}
