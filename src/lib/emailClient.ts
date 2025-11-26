import { Resend } from "resend";

export const resendClient = new Resend(process.env.RESEND_API_KEY);

// Helper function to send reset password email
export async function sendResetEmail(email: string, resetLink: string) {
  await resendClient.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: "Reset your password - BharatCart",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password.</p>
        <p>Click the button below to set a new password:</p>
        <a href="${resetLink}" 
           style="display:inline-block; padding:10px 20px; background:#007bff; color:white; text-decoration:none; border-radius:5px;">
          Reset Password
        </a>
        <p>If you did not request this, ignore this email.</p>
        <p>Link expires in 1 hour.</p>
      </div>
    `,
  });
}
