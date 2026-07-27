import crypto from 'node:crypto';
import nodemailer from 'nodemailer';

export interface MailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface MailResult {
  messageId: string;
}

function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendMailMock(input: MailInput): Promise<MailResult> {
  const messageId = `MAIL_MOCK_${crypto.randomUUID()}`;

  console.log(
    JSON.stringify(
      {
        kind: 'MAIL_MOCK',
        messageId,
        to: input.to,
        subject: input.subject,
        textPreview: input.text.slice(0, 220),
      },
      null,
      2,
    ),
  );

  return { messageId };
}

export async function sendMail(input: MailInput): Promise<MailResult> {
  if (!isSmtpConfigured()) {
    return sendMailMock(input);
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: String(process.env.SMTP_SECURE ?? 'false').toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const fromAddress = process.env.SOFTWARE_EMAIL ?? process.env.SMTP_USER ?? 'no-reply@localhost';

  const result = await transporter.sendMail({
    from: fromAddress,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  return {
    messageId: result.messageId,
  };
}
