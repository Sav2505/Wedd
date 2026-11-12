import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Request, Response } from 'express';
import { createError, errorHandler } from './errorHandler';

test('error logging identifies the route without logging request data', () => {
  const originalError = console.error;
  const messages: unknown[] = [];
  console.error = (...args: unknown[]) => { messages.push(...args); };
  let status: number | undefined;
  const response = {
    status: (value: number) => { status = value; return response; },
    json: () => response,
  } as unknown as Response;
  const request = {
    method: 'PUT',
    route: { path: '/me/rsvp' },
    originalUrl: '/guests/me/rsvp?n=private',
  } as Request;

  try {
    errorHandler(createError('נדרשת הזדהות', 401), request, response, () => {});
    assert.equal(status, 401);
    assert.match(String(messages[0]), /PUT \/me\/rsvp/);
    assert.doesNotMatch(String(messages[0]), /private/);
  } finally {
    console.error = originalError;
  }
});