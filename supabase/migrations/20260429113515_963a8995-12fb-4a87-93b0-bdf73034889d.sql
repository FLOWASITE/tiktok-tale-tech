-- 1) Mở rộng platform CHECK constraint
ALTER TABLE public.social_connections
  DROP CONSTRAINT IF EXISTS social_connections_platform_check;

ALTER TABLE public.social_connections
  ADD CONSTRAINT social_connections_platform_check
  CHECK (platform = ANY (ARRAY[
    'twitter','facebook','instagram','linkedin','tiktok','threads',
    'youtube','zalo_oa','google_business','website',
    'blogger','wordpress','wordpress_com','pinterest'
  ]));

-- 2) Bảng OAuth session tạm cho PKCE flow
CREATE TABLE IF NOT EXISTS public.pinterest_oauth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID,
  brand_template_id UUID,
  state TEXT NOT NULL UNIQUE,
  code_verifier TEXT NOT NULL,
  frontend_origin TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pinterest_oauth_sessions_state_idx
  ON public.pinterest_oauth_sessions(state);
CREATE INDEX IF NOT EXISTS pinterest_oauth_sessions_expires_idx
  ON public.pinterest_oauth_sessions(expires_at);

ALTER TABLE public.pinterest_oauth_sessions ENABLE ROW LEVEL SECURITY;

-- Owner-only RLS (callback dùng service role nên bypass RLS)
CREATE POLICY "users_manage_own_pinterest_oauth_sessions"
  ON public.pinterest_oauth_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);