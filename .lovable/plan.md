

# Sprint 9: Security Hardening Phase 2 — Critical Data Exposure Fixes

Sprint 8 addressed specific security issues. The latest security scan reveals **7 new ERROR-level findings** where sensitive tables are publicly readable, plus **3 WARN-level** findings for anonymous write access. This sprint fixes all critical data exposure issues.

---

## Current Security Scan Results

### ERROR (Must Fix)

| # | Table | Issue |
|---|-------|-------|
| 1 | `profiles` | User emails/names readable by anyone (no public-read RLS restriction) |
| 2 | `agent_blackboard` | AI session data (221 rows) publicly readable — `USING(true)` for ALL |
| 3 | `agent_execution_logs` | AI model names, tokens, errors (128 rows) publicly readable — `USING(true)` for ALL |
| 4 | `prompt_analytics` | Execution times, model perf (219 rows) — service-role policy `USING(true)` for ALL |
| 5 | `ai_response_cache` | Cached AI content (5 rows) — admin policy `USING(true)` for ALL |
| 6 | `campaign_notification_logs` | Campaign patterns (16 rows) — service-role policy `USING(true)` for ALL |
| 7 | `regulation_crawl_history` | Regulatory sources (32 rows) — no RLS policies at all |

### WARN (Should Fix)

| # | Table | Issue |
|---|-------|-------|
| 8 | `blog_reactions` | Anonymous INSERT/DELETE — bot manipulation risk |
| 9 | `sales_chat_analytics` | Anonymous INSERT/UPDATE — data poisoning risk |
| 10 | `sales_chat_leads` | Anonymous INSERT/UPDATE — fake lead injection risk |
| 11 | - | Leaked password protection disabled |

---

## Implementation Plan

### Task 38: Fix Service-Role Tables (agent_blackboard, agent_execution_logs, campaign_notification_logs)

These tables use `USING(true)` FOR ALL policies intended for service-role only, but this also grants access to anon/authenticated roles.

**Fix:** Drop the permissive ALL policies and replace with role-specific policies:
- Service role: ALL access (via `auth.role() = 'service_role'` or simply restricting to authenticated + org check)
- Authenticated users: SELECT only, scoped to their organization
- No anon access

### Task 39: Fix prompt_analytics and ai_response_cache

Both already have org-scoped SELECT policies, but also have permissive ALL policies that override them.

**Fix:** Drop the `USING(true)` ALL policies and replace with service-role-only INSERT/UPDATE/DELETE policies.

### Task 40: Fix profiles table public read

The `profiles` table has proper per-user policies but the "Org members can view profiles of other members" policy may be too broad.

**Fix:** Verify the org-member policy is properly scoped. Add explicit denial for anon access if missing.

### Task 41: Fix regulation_crawl_history (no RLS)

**Fix:** Enable RLS and add policies:
- Authenticated users: SELECT only
- Service role: ALL (for crawl edge functions)

### Task 42: Harden anonymous-write tables

For `blog_reactions`, `sales_chat_analytics`, `sales_chat_leads`:

**Fix:** Add validation constraints to anonymous write policies:
- `blog_reactions`: Require `post_id IS NOT NULL`, limit to INSERT only (remove DELETE for anon)
- `sales_chat_analytics`: Require `session_id IS NOT NULL`
- `sales_chat_leads`: Require `session_id IS NOT NULL AND email IS NOT NULL`

### Task 43: Enable leaked password protection

Use auth configuration to enable leaked password protection.

### Task 44: Update documentation

Update `.lovable/plan.md` to v2.6 reflecting Sprint 9 completions and updated security posture.

---

## Execution Order

| Step | Task | Priority | Impact |
|------|------|----------|--------|
| 1 | Task 38 (service-role tables) | P0 | Fix 3 ERROR findings |
| 2 | Task 39 (analytics/cache) | P0 | Fix 2 ERROR findings |
| 3 | Task 40 (profiles) | P0 | Fix 1 ERROR finding |
| 4 | Task 41 (regulation_crawl) | P0 | Fix 1 ERROR finding |
| 5 | Task 42 (anon-write hardening) | P1 | Fix 3 WARN findings |
| 6 | Task 43 (leaked password) | P1 | Fix 1 WARN finding |
| 7 | Task 44 (documentation) | P0 | Accuracy |

---

## Technical Details

### Task 38 — Service-Role Table RLS Pattern

```sql
-- Drop permissive ALL policy
DROP POLICY IF EXISTS "Service role access for agent_blackboard" ON public.agent_blackboard;

-- Service role write access (edge functions use service role key)
-- No explicit policy needed — service role bypasses RLS by default

-- Authenticated users: read-only, scoped to org
CREATE POLICY "Authenticated users can read own session data"
ON public.agent_blackboard FOR SELECT TO authenticated
USING (
  session_id IN (
    SELECT id FROM public.agent_sessions
    WHERE user_id = auth.uid()
  )
);
```

If `agent_sessions` table doesn't exist, fall back to `user_id` column check or restrict to service-role only (no authenticated SELECT).

### Task 40 — Profiles Verification

The existing policies are:
- "Users can view own profile" — `auth.uid() = id`
- "Org members can view profiles of other members" — org membership check
- "Admins can view all profiles"

These should be sufficient. The security scan may flag this because anon role has no explicit deny. Since RLS is enabled, anon gets no access by default (no policy = deny). Need to verify no `USING(true)` SELECT policy exists.

### Task 42 — Anonymous Write Validation Pattern

```sql
-- Replace permissive insert with validated insert
DROP POLICY IF EXISTS "Allow anonymous insert on sales_chat_analytics"
  ON public.sales_chat_analytics;

CREATE POLICY "Validated anonymous insert on sales_chat_analytics"
ON public.sales_chat_analytics FOR INSERT
WITH CHECK (session_id IS NOT NULL);
```

