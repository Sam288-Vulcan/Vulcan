import { test } from 'node:test';
import assert from 'node:assert';
import { formatSyncTimestamp } from './googleDrive.ts';

test('formatSyncTimestamp: null returns "Not synced yet"', () => {
  assert.strictEqual(formatSyncTimestamp(null), 'Not synced yet');
});

test('formatSyncTimestamp: today returns "Today at ..."', () => {
  const now = Date.now();
  const formatted = formatSyncTimestamp(now);
  assert.ok(formatted.startsWith('Today at '), `Expected format starting with "Today at ", got ${formatted}`);
});

test('formatSyncTimestamp: yesterday returns "Yesterday at ..."', () => {
  const yesterday = Date.now() - 24 * 60 * 60 * 1000;
  const formatted = formatSyncTimestamp(yesterday);
  assert.ok(formatted.startsWith('Yesterday at '), `Expected format starting with "Yesterday at ", got ${formatted}`);
});

test('formatSyncTimestamp: older date includes month name', () => {
  const oldDate = new Date('2026-05-15T10:00:00Z').getTime();
  const formatted = formatSyncTimestamp(oldDate);
  assert.ok(formatted.includes('May 15'), `Expected format containing "May 15", got ${formatted}`);
});
