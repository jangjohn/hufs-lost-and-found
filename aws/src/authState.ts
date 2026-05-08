const refreshEvents = new Set(['signedIn', 'signedOut', 'tokenRefresh', 'tokenRefresh_failure']);

export function shouldRefreshAuthUser(event?: string) {
  return Boolean(event && refreshEvents.has(event));
}

export async function resolveAuthUser<T>(
  loadUser: () => Promise<T>,
  timeoutMs = 4_000,
): Promise<T | null> {
  try {
    return await Promise.race([
      loadUser(),
      new Promise<null>((resolve) => {
        globalThis.setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } catch {
    return null;
  }
}
