import { describe, it, expect, beforeAll } from 'vitest';

// Stub Deno.env before importing the module under test
beforeAll(() => {
  (globalThis as any).Deno = {
    env: {
      get: (key: string) => {
        if (key === 'TELEGRAM_LINK_SECRET') return 'test-secret-at-least-32-bytes-long!';
        return undefined;
      },
    },
  };
});

// Dynamically import so the Deno stub is in place
async function loadModule() {
  return await import('../telegram-client.ts');
}

describe('telegram-client link token', () => {
  const uid = 'c618b2dc-6970-4c62-836e-db33e9bfd24c';
  const org = 'bccfec38-2d27-4992-9420-023409184491';

  it('signs and verifies a valid token', async () => {
    const mod = await loadModule();
    const token = await mod.signLinkToken({ uid, org, ttlSeconds: 60 });
    const payload = await mod.verifyLinkToken(token);
    expect(payload.uid).toBe(uid);
    expect(payload.org).toBe(org);
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('rejects a tampered signature', async () => {
    const mod = await loadModule();
    const token = await mod.signLinkToken({ uid, org, ttlSeconds: 60 });
    const tampered = token.slice(0, -2) + 'xx';
    await expect(mod.verifyLinkToken(tampered)).rejects.toThrow(/signature|Invalid/i);
  });

  it('rejects an expired token', async () => {
    const mod = await loadModule();
    const token = await mod.signLinkToken({ uid, org, ttlSeconds: -10 });
    await expect(mod.verifyLinkToken(token)).rejects.toThrow(/expired/i);
  });

  it('rejects malformed token', async () => {
    const mod = await loadModule();
    await expect(mod.verifyLinkToken('only.two')).rejects.toThrow(/Malformed/i);
  });

  it('rejects token signed with a different secret', async () => {
    const mod = await loadModule();
    const token = await mod.signLinkToken({ uid, org, ttlSeconds: 60 });
    // Swap secret
    (globalThis as any).Deno.env.get = (k: string) =>
      k === 'TELEGRAM_LINK_SECRET' ? 'different-secret-of-reasonable-length!' : undefined;
    await expect(mod.verifyLinkToken(token)).rejects.toThrow(/signature|Invalid/i);
    // Restore
    (globalThis as any).Deno.env.get = (k: string) =>
      k === 'TELEGRAM_LINK_SECRET' ? 'test-secret-at-least-32-bytes-long!' : undefined;
  });
});
