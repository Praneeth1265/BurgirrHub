import nodemailer from "nodemailer";
import MailComposer from "nodemailer/lib/mail-composer/index.js";
import { OAuth2Client } from "google-auth-library";

let transporterPromise = null;
let gmailOAuthClient = null;

function getGmailOAuthClient() {
  if (!gmailOAuthClient) {
    gmailOAuthClient = new OAuth2Client(
      process.env.GMAIL_OAUTH_CLIENT_ID,
      process.env.GMAIL_OAUTH_CLIENT_SECRET
    );
    gmailOAuthClient.setCredentials({ refresh_token: process.env.GMAIL_OAUTH_REFRESH_TOKEN });
  }
  return gmailOAuthClient;
}

// Gmail's SMTP endpoint only accepts XOAUTH2 tokens minted with the full
// https://mail.google.com/ scope (full mailbox access), even for sending
// only. To keep the token actually scoped to send-only (gmail.send), this
// calls the Gmail REST API directly instead of going through SMTP --
// nodemailer is still used only as a MIME message builder (buildMailComposer),
// not as the transport.
async function sendViaGmailApi({ to, subject, html }) {
  const client = getGmailOAuthClient();
  const { token: accessToken } = await client.getAccessToken();

  const from = `"BurgirrHub" <${process.env.GMAIL_USER}>`;
  const compiled = new MailComposer({ from, to, subject, html }).compile();
  const built = await new Promise((resolve, reject) => {
    compiled.build((err, message) => (err ? reject(err) : resolve(message)));
  });
  const raw = built
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gmail API send failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return { messageId: data.id, previewUrl: null };
}

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      if (process.env.SMTP_HOST) {
        // Real SMTP provider, if configured.
        return nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
      }

      // No real SMTP configured: auto-provision a free Ethereal test
      // inbox. No signup, no credentials to manage, and every "sent"
      // email gets a public preview URL you can open in a browser to see
      // exactly what would have gone out -- the standard way to test
      // email sending without a throwaway real mailbox.
      const testAccount = await nodemailer.createTestAccount();
      console.log("No SMTP_HOST configured -- using an Ethereal test inbox:", testAccount.user);
      return nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
    })();
  }
  return transporterPromise;
}

export async function sendEmail({ to, subject, html }) {
  if (process.env.GMAIL_OAUTH_CLIENT_ID) {
    return sendViaGmailApi({ to, subject, html });
  }

  const transporter = await getTransporter();
  const info = await transporter.sendMail({ from: '"BurgirrHub" <no-reply@burgirrhub.test>', to, subject, html });
  return { messageId: info.messageId, previewUrl: nodemailer.getTestMessageUrl(info) || null };
}
