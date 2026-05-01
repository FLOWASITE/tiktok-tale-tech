-- 1. Pending OAuth states for Bluesky (and future atproto-style flows)
CREATE TABLE IF NOT EXISTS public.oauth_pending_states (
  state text PRIMARY KEY,
  user_id uuid NOT NULL,
  platform text NOT NULL,
  brand_template_id uuid,
  organization_id uuid,
  pkce_verifier text NOT NULL,
  dpop_private_jwk jsonb NOT NULL,
  pds_url text NOT NULL,
  authz_issuer text NOT NULL,
  token_endpoint text NOT NULL,
  par_endpoint text,
  authorization_endpoint text,
  handle text,
  did text,
  dpop_nonce text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oauth_pending_states_user ON public.oauth_pending_states(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_pending_states_expires ON public.oauth_pending_states(expires_at);

ALTER TABLE public.oauth_pending_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own oauth pending states" ON public.oauth_pending_states;
CREATE POLICY "Users can view their own oauth pending states"
  ON public.oauth_pending_states FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own oauth pending states" ON public.oauth_pending_states;
CREATE POLICY "Users can insert their own oauth pending states"
  ON public.oauth_pending_states FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own oauth pending states" ON public.oauth_pending_states;
CREATE POLICY "Users can delete their own oauth pending states"
  ON public.oauth_pending_states FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Cleanup function for expired pending states
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_pending_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.oauth_pending_states WHERE expires_at < now();
END;
$$;

-- 3. Schedule cleanup every hour (idempotent — drop existing job first)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('cleanup-oauth-pending-states') WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'cleanup-oauth-pending-states'
    );
    PERFORM cron.schedule(
      'cleanup-oauth-pending-states',
      '0 * * * *',
      $cron$SELECT public.cleanup_expired_oauth_pending_states();$cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- pg_cron not available; ignore
  NULL;
END;
$$;

-- 4. Deactivate legacy Bluesky App Password connections (force re-connect via OAuth)
UPDATE public.social_connections
SET is_active = false,
    last_error = 'Bluesky đã chuyển sang OAuth 2.0. Vui lòng kết nối lại.'
WHERE platform = 'bluesky' AND is_active = true;