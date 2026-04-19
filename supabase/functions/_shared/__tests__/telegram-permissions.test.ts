import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => {
  (globalThis as any).Deno = {
    env: {
      get: () => undefined,
    },
  };
});

async function loadModule() {
  return await import('../telegram-client.ts');
}

// Minimal fake supabase client
function makeFakeSupabase(options: {
  permission: any;
  pipelines?: any[];
}) {
  const { permission, pipelines = [] } = options;
  return {
    from(table: string) {
      if (table === 'agent_team_permissions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: permission, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'agent_pipelines') {
        return {
          select: () => ({
            eq: () => ({
              gte: async () => ({ data: pipelines, error: null }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };
}

describe('assertCanCreateGoal', () => {
  it('rejects when no permission row exists', async () => {
    const { assertCanCreateGoal } = await loadModule();
    const supabase = makeFakeSupabase({ permission: null });
    const result = await assertCanCreateGoal(supabase, 'org', 'user');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('no_permission');
  });

  it('rejects when permission is inactive', async () => {
    const { assertCanCreateGoal } = await loadModule();
    const supabase = makeFakeSupabase({
      permission: { is_active: false, can_create_goals: true, max_autonomy_level: 'human_in_loop', monthly_pipeline_limit: null },
    });
    const result = await assertCanCreateGoal(supabase, 'org', 'user');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('not_active');
  });

  it('rejects when can_create_goals is false', async () => {
    const { assertCanCreateGoal } = await loadModule();
    const supabase = makeFakeSupabase({
      permission: { is_active: true, can_create_goals: false, max_autonomy_level: 'human_in_loop', monthly_pipeline_limit: null },
    });
    const result = await assertCanCreateGoal(supabase, 'org', 'user');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('cannot_create');
  });

  it('allows when no monthly limit is set', async () => {
    const { assertCanCreateGoal } = await loadModule();
    const supabase = makeFakeSupabase({
      permission: { is_active: true, can_create_goals: true, max_autonomy_level: 'human_on_loop', monthly_pipeline_limit: null },
    });
    const result = await assertCanCreateGoal(supabase, 'org', 'user');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.maxAutonomyLevel).toBe('human_on_loop');
      expect(result.monthlyLimit).toBeNull();
    }
  });

  it('rejects when at monthly limit', async () => {
    const { assertCanCreateGoal } = await loadModule();
    const supabase = makeFakeSupabase({
      permission: { is_active: true, can_create_goals: true, max_autonomy_level: 'human_in_loop', monthly_pipeline_limit: 2 },
      pipelines: [
        { id: 'p1', goal_id: 'g1', agent_goals: { created_by: 'user' } },
        { id: 'p2', goal_id: 'g2', agent_goals: { created_by: 'user' } },
      ],
    });
    const result = await assertCanCreateGoal(supabase, 'org', 'user');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('quota_exceeded');
  });

  it('does not count pipelines from other users toward quota', async () => {
    const { assertCanCreateGoal } = await loadModule();
    const supabase = makeFakeSupabase({
      permission: { is_active: true, can_create_goals: true, max_autonomy_level: 'human_in_loop', monthly_pipeline_limit: 1 },
      pipelines: [
        { id: 'p1', goal_id: 'g1', agent_goals: { created_by: 'other-user' } },
      ],
    });
    const result = await assertCanCreateGoal(supabase, 'org', 'user');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.pipelinesUsed).toBe(0);
  });

  it('allows when under limit', async () => {
    const { assertCanCreateGoal } = await loadModule();
    const supabase = makeFakeSupabase({
      permission: { is_active: true, can_create_goals: true, max_autonomy_level: 'full_auto', monthly_pipeline_limit: 5 },
      pipelines: [
        { id: 'p1', goal_id: 'g1', agent_goals: { created_by: 'user' } },
      ],
    });
    const result = await assertCanCreateGoal(supabase, 'org', 'user');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.pipelinesUsed).toBe(1);
  });
});
