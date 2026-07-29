// src/controllers/mailer.controller.ts
import { Request, Response } from 'express';
import { sendEmail } from '../services/mailer.service';

export async function sendEmailController(req: Request, res: Response) {
  const { to, subject, message } = req.body;

  if (!to || !subject || !message) {
    return res.status(400).json({ success: false, error: 'חסרים שדות' });
  }

  try {
    await sendEmail({ to, subject, html: `<p>${message}</p>` });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}