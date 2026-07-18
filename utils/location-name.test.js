import test from 'node:test';
import assert from 'node:assert/strict';
import { assertLocationName, validateLocationName } from './location-name.js';

test('accepts and trims normal location names', () => {
  assert.equal(assertLocationName('  Dr. B. R. Ambedkar Konaseema  '), 'Dr. B. R. Ambedkar Konaseema');
  assert.equal(validateLocationName("Mandal's Area").valid, true);
});

test('rejects non-string location values', () => {
  assert.throws(() => assertLocationName({ id: '1', name: 'Kurnool' }), /plain text/);
  assert.throws(() => assertLocationName(['Kurnool']), /plain text/);
});

test('rejects object-like strings', () => {
  assert.equal(validateLocationName('{id: 123, name: Kurnool}').valid, false);
  assert.equal(validateLocationName('{"id":"123","name":"Kurnool"}').valid, false);
  assert.equal(validateLocationName('["Kurnool"]').valid, false);
});
