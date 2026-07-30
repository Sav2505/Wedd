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

function getSmtpConfig() {
  const isProd = process.env.IS_PROD === 'true';

  return {
    isProd,
    host: isProd
      ? process.env.SMTP_HOST_BREVO
      : process.env.SMTP_HOST,

    user: isProd
      ? process.env.EMAIL_ADMIN
      : process.env.EMAIL_ADMIN,

    pass: isProd
      ? process.env.SMTP_PASS
      : process.env.EMAIL_CODE,
  };
}

function isSmtpConfigured(): boolean {
  const config = getSmtpConfig();

  return Boolean(
    config.host &&
    config.user &&
    config.pass &&
    process.env.EMAIL_ADMIN,
  );
}

export async function sendMail(input: MailInput): Promise<MailResult> {
  const config = getSmtpConfig();

  console.log('SMTP CONFIG', {
    mode: config.isProd ? 'BREVO' : 'GMAIL',
    host: config.host,
    user: config.user,
    hasPassword: Boolean(config.pass),
  });

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
    host: config.host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: String(process.env.SMTP_SECURE ?? 'false').toLowerCase() === 'true',
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  try {
    await transporter.verify();

    console.log('SMTP READY');

    const result = await transporter.sendMail({
      from: process.env.EMAIL_ADMIN!,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    console.log('MAIL SENT', result.messageId);

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