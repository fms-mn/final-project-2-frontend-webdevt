import assert from 'node:assert/strict';
import test from 'node:test';
import { profileErrors, profileInitials } from './profile.js';

test('profile initials use the account name, including whitespace and Unicode', () => {
  assert.equal(profileInitials(' Preview User '), 'PU');
  assert.equal(profileInitials('Alex'), 'A');
  assert.equal(profileInitials('  Ana Maria  Cruz '), 'AC');
  assert.equal(profileInitials('Élodie 王'), 'É王');
  assert.equal(profileInitials(''), 'F');
});

test('name is required and the optional phone accepts common local and international formats', () => {
  for (const phone of ['', '  ', '09171234567', '+63 917 123 4567', '(02) 8123-4567']) {
    assert.deepEqual(profileErrors(' Alex ', phone), {});
  }
  assert.equal(profileErrors(' ', '').name, 'Name is required.');
  for (const phone of ['abc', '123', '1234567890123456', '0917abc4567', '++639171234567']) {
    assert.ok(profileErrors('Alex', phone).phone);
  }
});
