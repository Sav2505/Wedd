// src/services/mailer.service.ts
import { sendMail } from './email.service';

interface SendEmailParams {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

export interface SendEmailResult {
    messageId: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<SendEmailResult> {
    return sendMail({
        to,
        subject,
        html,
        text: text ?? '',
    });
}