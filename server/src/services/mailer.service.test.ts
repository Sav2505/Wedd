import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';

test('legacy mail sender uses Brevo in production without connecting to SMTP', async () => {
  const originalEnv = {
    IS_PROD: process.env.IS_PROD,
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    EMAIL_ADMIN: process.env.EMAIL_ADMIN,
  };
  process.env.IS_PROD = 'true';
  process.env.BREVO_API_KEY = 'test-key';
  process.env.EMAIL_ADMIN = 'sender@example.com';

  const smtpMock = mock.method(nodemailer, 'createTransport', () => {
    throw new Error('SMTP must not be used in production');
  });
  const fetchMock = mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    assert.equal(url, 'https://api.brevo.com/v3/smtp/email');
    assert.equal(init.method, 'POST');
    assert.equal((init.headers as Record<string, string>)['api-key'], 'test-key');
    assert.deepEqual(JSON.parse(init.body as string), {
      sender: { name: 'WedFlow', email: 'sender@example.com' },
      to: [{ email: 'recipient@example.com' }],
      subject: 'Test subject',
      htmlContent: '<p>Test message</p>',
      textContent: '',
    });
    return new Response(JSON.stringify({ messageId: 'brevo-message-id' }), { status: 201 });
  });

  try {
    const { sendEmail } = await import('./mailer.service.js');
    assert.deepEqual(await sendEmail({
      to: 'recipient@example.com',
      subject: 'Test subject',
      html: '<p>Test message</p>',
    }), { messageId: 'brevo-message-id' });
    assert.equal(fetchMock.mock.callCount(), 1);
    assert.equal(smtpMock.mock.callCount(), 0);
  } finally {
    fetchMock.mock.restore();
    smtpMock.mock.restore();
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});