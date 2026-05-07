import { describe, expect, it } from 'vitest';
import { shouldRefreshAuthUser } from './authState';

describe('auth state helpers', () => {
  it('refreshes the current user after auth state changes', () => {
    expect(shouldRefreshAuthUser('signedIn')).toBe(true);
    expect(shouldRefreshAuthUser('signedOut')).toBe(true);
    expect(shouldRefreshAuthUser('tokenRefresh')).toBe(true);
    expect(shouldRefreshAuthUser('tokenRefresh_failure')).toBe(true);
  });

  it('ignores unrelated hub events', () => {
    expect(shouldRefreshAuthUser('configured')).toBe(false);
    expect(shouldRefreshAuthUser(undefined)).toBe(false);
  });
});
