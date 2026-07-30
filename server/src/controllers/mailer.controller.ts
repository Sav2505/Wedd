// src/controllers/mailer.controller.ts
import { Request, Response } from 'express';
import { sendMail } from '../services/email.service';

export async function sendEmailController(req: Request, res: Response) {
  const { to, subject, message } = req.body;

  if (!to || !subject || !message) {
    return res.status(400).json({ success: false, error: 'חסרים שדות' });
  }

  try {
    sendMail({
      to: to,
      subject: subject,
      html: `<p>${message}</p>`,
      text: message,
    });

    res.status(200).json({ success: true, message: 'המייל נשלח בהצלחה' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
}