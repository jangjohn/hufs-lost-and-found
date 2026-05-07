const refreshEvents = new Set(['signedIn', 'signedOut', 'tokenRefresh', 'tokenRefresh_failure']);

export function shouldRefreshAuthUser(event?: string) {
  return Boolean(event && refreshEvents.has(event));
}
