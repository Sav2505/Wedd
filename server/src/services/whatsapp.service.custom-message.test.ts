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

test('day-before WhatsApp template uses the calculated relative-day label as {{2}}', () => {
  const components = buildTemplateComponents({
    ...templateInput,
    templateName: 'wedding_day_before',
    whenLabel: 'מחרתיים',
  }) as Array<{ type: string; parameters: Array<{ text: string }> }>;

  assert.equal(components[0].parameters[1].text, 'מחרתיים');
});

test('reminder template keeps event date, reception, canopy, and couple name in order', () => {
  const components = buildTemplateComponents({ ...templateInput, templateName: 'wedding_reminder' }) as Array<{
    type: string;
    parameters: Array<{ text: string }>;
  }>;

  const body = components.find((component) => component.type === 'body');
  assert.ok(body);
  assert.equal(body.parameters[0].text, 'רוני');
  assert.match(body.parameters[1].text, /2027/);
  assert.deepEqual(body.parameters.slice(2).map((parameter) => parameter.text), [
    '19:30', '20:30', 'רונה ויואב',
  ]);
});

test('day-before template keeps all seven body parameters in template order', () => {
  const components = buildTemplateComponents({
    ...templateInput,
    templateName: 'wedding_day_before',
    whenLabel: 'בעוד שלושה ימים',
  }) as Array<{ type: string; parameters: Array<{ text: string }> }>;

  const body = components.find((component) => component.type === 'body');
  assert.ok(body);
  assert.deepEqual(body.parameters.map((parameter) => parameter.text), [
    'רוני', 'בעוד שלושה ימים', 'רונה ויואב', 'גן האירועים',
    '19:30', '20:30', 'רונה ויואב',
  ]);
});

test('post-thanks template keeps guest first name and couple name in order', () => {
  const components = buildTemplateComponents({ ...templateInput, templateName: 'wedding_post_thanks' }) as Array<{
    type: string;
    parameters: Array<{ text: string }>;
  }>;

  const body = components.find((component) => component.type === 'body');
  assert.ok(body);
  assert.deepEqual(body.parameters.map((parameter) => parameter.text), ['רוני', 'רונה ויואב']);
});