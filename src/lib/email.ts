
import { SendMailClient } from "zeptomail";

const SEND_MAIL_TOKEN = process.env.ZOHO_SEND_MAIL_TOKEN;
const FROM_EMAIL = process.env.ZOHO_FROM_EMAIL;

if (!SEND_MAIL_TOKEN || !FROM_EMAIL) {
  console.warn("ZeptoMail credentials are not fully configured in environment variables. Email functionality will be simulated.");
}

const client = SEND_MAIL_TOKEN ? new SendMailClient({
  token: SEND_MAIL_TOKEN,
  url: "api.zeptomail.com/",
}) : null;

export async function sendEmail(to: string, subject: string, htmlBody: string, replyTo?: string) {
  if (!client || !FROM_EMAIL) {
    console.log(`
      --- EMAIL SIMULATION ---
      To: ${to}
      From: ${FROM_EMAIL || 'not-configured@example.com'}
      Reply-To: ${replyTo || '(none)'}
      Subject: ${subject}
      Body: ${htmlBody.substring(0, 100)}...
      --- END SIMULATION ---
    `);
    // Return success to allow the app to function without real email sending.
    return { success: true };
  }

  try {
    const mailOptions: Record<string, unknown> = {
      from: {
        address: FROM_EMAIL,
        name: "ALPFA Convention Portal",
      },
      to: [
        {
          email_address: {
            address: to,
          },
        },
      ],
      subject,
      htmlbody: htmlBody,
    };

    if (replyTo) {
      mailOptions.reply_to = { address: replyTo };
    }

    await client.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Error sending email via ZeptoMail:", error);
    return { success: false, error: "Could not send email." };
  }
}
