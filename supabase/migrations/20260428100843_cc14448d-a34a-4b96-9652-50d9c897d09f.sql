-- 1. Table for temporary OAuth sessions (page picker)
CREATE TABLE IF NOT EXISTS public.facebook_oauth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid,
  brand_template_id uuid,
  encrypted_user_token text NOT NULL,
  pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.facebook_oauth_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own facebook oauth sessions" ON public.facebook_oauth_sessions;
CREATE POLICY "Users manage own facebook oauth sessions"
  ON public.facebook_oauth_sessions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_fb_oauth_sessions_expires_at ON public.facebook_oauth_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_fb_oauth_sessions_user_id ON public.facebook_oauth_sessions (user_id);

-- 2. Cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_expired_facebook_oauth_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.facebook_oauth_sessions WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;