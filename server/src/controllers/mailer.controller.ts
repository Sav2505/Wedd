// src/controllers/mailer.controller.ts
import { Request, Response } from 'express';
import { resend } from '../services/resend.service';

export async function sendEmailController(req: Request, res: Response) {
  const { to, subject, message } = req.body;

  if (!to || !subject || !message) {
    return res.status(400).json({ success: false, error: 'חסרים שדות' });
  }

  try {
    await resend.emails.send({
      from: process.env.EMAIL_ADMIN ?? "weddflowapp@gmail.com",
      to: to,
      subject: subject,
      html: `<p>${message}</p>`,
    });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}