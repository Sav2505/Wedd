import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTemplateComponents } from './whatsapp.service';

const templateInput = {
  templateName: 'wedding_custom_message' as const,
  guestFullName: 'רוני כהן',
  guestFirstName: 'רוני',
  weddingDisplayName: 'רונה ויואב',
  weddingDate: '2027-06-14',
  weddingTime: '19:30',
  weddingCanpoyTime: '20:30',
  venueName: 'גן האירועים',
  venueAddress: 'תל אביב',
  guestUrl: '',
};

test('custom WhatsApp template sends first name, couple name, and message in order', () => {
  const components = buildTemplateComponents({ ...templateInput, customMessage: 'נשמח לראותכם בקבלת הפנים' }) as Array<{
    type: string;
    parameters: Array<{ type: string; text: string }>;
  }>;

  assert.equal(components.length, 1);
  assert.equal(components[0].type, 'body');
  assert.deepEqual(components[0].parameters.map((parameter) => parameter.text), [
    'רוני',
    'רונה ויואב',
    'נשמח לראותכם בקבלת הפנים',
  ]);
});

test('custom WhatsApp template rejects an empty message body', () => {
  assert.throws(
    () => buildTemplateComponents({ ...templateInput, customMessage: '   ' }),
    /requires a message body/,
  );
});