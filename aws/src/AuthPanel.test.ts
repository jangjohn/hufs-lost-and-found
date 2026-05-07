import { describe, expect, test } from 'vitest';
import { authenticatorOptions, hasGoogleProvider } from './AuthPanel';

describe('AuthPanel configuration', () => {
  test('defaults to email sign-in when OAuth is not configured', () => {
    expect(authenticatorOptions.loginMechanisms).toEqual(['email']);
    expect(authenticatorOptions.socialProviders).toBeUndefined();
  });

  test('detects Google sign-in when Cognito Hosted UI outputs include Google', () => {
    expect(
      hasGoogleProvider({
        auth: {
          oauth: {
            identity_providers: ['GOOGLE'],
          },
        },
      }),
    ).toBe(true);
  });
});
