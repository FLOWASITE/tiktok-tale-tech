import { describe, it, expect, beforeAll, vi } from 'vitest';

// Stub Deno.env before importing the module under test (resolveBotConfig uses
// _shared/crypto.ts which reads AI_ENCRYPTION_KEY to decrypt bot_token).
beforeAll(() => {
  (globalThis as any).Deno = {
    env: {
      get: (key: string) => {
        if (key === 'AI_ENCRYPTION_KEY') return 'test-encryption-key-at-least-32-by';
        if (key === 'TELEGRAM_LINK_SECRET') return 'test-link-secret-at-least-32-bytes';
        return undefined;
      },
    },
  };
});

async function loadModule() {
  return await import('../telegram-client.ts');
}

function buildSupabaseStub(row: Record<string, unknown> | null) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
  };
  return {
    from: vi.fn().mockReturnValue(chain),
  };
}

// Mock crypto.decryptCredential — resolveBotConfig always calls it. We don't
// care about the real bytes, only that organizationId routing works.
vi.mock('../crypto.ts', () => ({
  decryptCredential: vi.fn(async () => 'decrypted-token'),
  encrypt: vi.fn(async () => 'encrypted'),
}));

describe('resolveBotConfig hybrid bot routing', () => {
  it('returns organizationId from BYOB row when org is set', async () => {
    const mod = await loadModule();
    const supabase = buildSupabaseStub({
      id: 'cfg-1',
      organization_id: 'org-123',
      bot_username: 'org_bot',
      bot_token_encrypted: 'enc',
      default_autonomy_level: 'human_in_loop',
      is_active: true,
      is_default: false,
    });

    const resolved = await mod.resolveBotConfig(supabase as any, 'secret-byob');

    expect(resolved).not.toBeNull();
    expect(resolved!.organizationId).toBe('org-123');
    expect(resolved!.isDefault).toBe(false);
    expect(resolved!.botUsername).toBe('org_bot');
  });

  it('returns null organizationId for the default-bot sentinel row', async () => {
    const mod = await loadModule();
    const supabase = buildSupabaseStub({
      id: 'cfg-sentinel',
      organization_id: null,
      bot_username: 'flowa_agent_bot',
      bot_token_encrypted: 'enc',
      default_autonomy_level: 'human_in_loop',
      is_active: true,
      is_default: true,
    });

    const resolved = await mod.resolveBotConfig(supabase as any, 'secret-default');

    expect(resolved).not.toBeNull();
    expect(resolved!.organizationId).toBeNull();
    expect(resolved!.isDefault).toBe(true);
    expect(resolved!.botUsername).toBe('flowa_agent_bot');
  });

  it('returns null when no bot matches the path secret', async () => {
    const mod = await loadModule();
    const supabase = buildSupabaseStub(null);

    const resolved = await mod.resolveBotConfig(supabase as any, 'unknown-secret');

    expect(resolved).toBeNull();
  });
});
