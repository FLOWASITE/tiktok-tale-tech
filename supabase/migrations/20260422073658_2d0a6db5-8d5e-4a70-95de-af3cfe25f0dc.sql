-- Enforce: each user can have at most ONE active private telegram binding per workspace.
-- This prevents stale duplicate bindings that cause "UI says connected, bot says not connected" mismatches.
-- Group bindings (user_id IS NULL) and inactive rows are unaffected.

-- Step 1: deactivate any existing duplicate active private bindings, keeping only the most recent per (org, user).
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id, user_id
      ORDER BY linked_at DESC, id DESC
    ) AS rn
  FROM public.telegram_chat_bindings
  WHERE chat_type = 'private'
    AND user_id IS NOT NULL
    AND is_active = true
)
UPDATE public.telegram_chat_bindings t
SET is_active = false
FROM ranked r
WHERE t.id = r.id AND r.rn > 1;

-- Step 2: partial unique index enforcing the invariant going forward.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tg_bindings_active_private_org_user
  ON public.telegram_chat_bindings (organization_id, user_id)
  WHERE chat_type = 'private' AND user_id IS NOT NULL AND is_active = true;