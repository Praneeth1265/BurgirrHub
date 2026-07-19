import nodemailer from "nodemailer";

let transporterPromise = null;

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
  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: '"BurgirrHub" <no-reply@burgirrhub.test>',
    to,
    subject,
    html,
  });
  return { messageId: info.messageId, previewUrl: nodemailer.getTestMessageUrl(info) || null };
}
