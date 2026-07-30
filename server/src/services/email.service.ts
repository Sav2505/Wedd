import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { sendAdminAlert } from './error.service';

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
  return Boolean(process.env.SMTP_HOST && process.env.EMAIL_ADMIN && process.env.EMAIL_CODE);
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
    const error = new Error('SMTP is not configured.');

    await sendAdminAlert({
      title: 'SMTP is not configured',
      message: `Failed sending mail to ${input.to}`,
      error,
    });

    throw error;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: String(process.env.SMTP_SECURE ?? 'false').toLowerCase() === 'true',
    auth: {
      user: process.env.EMAIL_ADMIN,
      pass: process.env.EMAIL_CODE,
    },
  });

  const fromAddress = process.env.EMAIL_ADMIN!;

  try {
    const result = await transporter.sendMail({
      from: fromAddress,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    console.log('Mail sent:', result);

    return {
      messageId: result.messageId,
    };
  } catch (error) {
    await sendAdminAlert({
      title: 'Mail sending failed',
      message: `Failed sending mail to ${input.to}`,
      error,
    });

    throw error;
  }
}