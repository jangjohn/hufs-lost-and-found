import { describe, expect, test } from 'vitest';
import { authenticatorOptions } from './AuthPanel';

describe('AuthPanel configuration', () => {
  test('offers Google sign-in through Cognito Hosted UI', () => {
    expect(authenticatorOptions.loginMechanisms).toEqual(['email']);
    expect(authenticatorOptions.socialProviders).toEqual(['google']);
  });
});
