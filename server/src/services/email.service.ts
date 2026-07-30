import nodemailer from 'nodemailer';
import { sendAdminAlert } from './error.service';
import { SendEmailResult } from './mailer.service';

export interface MailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface MailResult {
  messageId: string;
}

async function sendViaGmailSmtp(input: MailInput): Promise<MailResult> {
  if (!process.env.EMAIL_ADMIN || !process.env.EMAIL_CODE) {
    throw new Error('Gmail SMTP credentials are missing');
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_ADMIN,
      pass: process.env.EMAIL_CODE,
    },
  });

  await transporter.verify();

  const result = await transporter.sendMail({
    from: {
      name: 'WedFlow',
      address: process.env.EMAIL_ADMIN,
    },
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  return {
    messageId: result.messageId,
  };
}

async function sendViaBrevoApi(input: MailInput): Promise<MailResult> {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is missing');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: 'WedFlow',
        email: process.env.EMAIL_ADMIN,
      },
      to: [
        {
          email: input.to,
        },
      ],
      subject: input.subject,
      htmlContent: input.html,
      textContent: input.text,
    }),
  });

  const data = (await response.json()) as SendEmailResult;

  if (!response.ok) {
    throw new Error(
      `Brevo API error ${response.status}: ${JSON.stringify(data)}`
    );
  }

  return {
    messageId: data?.messageId ?? 'BREVO_SENT',
  };
}


export async function sendMail(input: MailInput): Promise<MailResult> {
  const isProd = process.env.IS_PROD === 'true';

  try {
    console.log('MAIL MODE:', isProd ? 'BREVO API' : 'GMAIL SMTP');

    if (isProd) {
      return await sendViaBrevoApi(input);
    }

    return await sendViaGmailSmtp(input);

  } catch (error) {
    console.error('MAIL ERROR:', error);

    await sendAdminAlert({
      title: 'Mail sending failed',
      message: `Failed sending mail to ${input.to}`,
      error,
    });

    throw error;
  }
}