import crypto from 'node:crypto';

export interface MailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface MailResult {
  messageId: string;
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
