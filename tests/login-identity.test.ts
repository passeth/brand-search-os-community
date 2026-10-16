import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveLoginEmail} from '../lib/login-identity';

test('an email keeps its own identity instead of falling back to the administrator', () => {
  assert.equal(resolveLoginEmail(' Person@Example.com '), 'person@example.com');
});

test('unknown usernames and malformed identifiers do not resolve to an account', () => {
  for (const value of ['', ' ', 'someone', 'administrator', 'person@', 'person @example.com']) {
    assert.equal(resolveLoginEmail(value), null);
  }
});
