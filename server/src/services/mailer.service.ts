// src/services/mailer.service.ts
import nodemailer, { Transporter } from 'nodemailer';

const transporter: Transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_ADMIN,
        pass: process.env.EMAIL_CODE,
    },
});

transporter.verify((error) => {
    if (error) {
        console.error('❌ שגיאה בהתחברות למייל:', error);
    } else {
        console.log('✅ מוכן לשלוח מיילים');
    }
});

interface SendEmailParams {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

interface SendEmailResult {
    messageId: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<SendEmailResult> {
    const info = await transporter.sendMail({
        from: `"WedFlow - החתונה שלכם" <${process.env.EMAIL_ADMIN}>`,
        to,
        subject,
        html,
        text,
    });

    return { messageId: info.messageId };
}