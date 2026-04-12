ALTER TABLE public.social_connections DROP CONSTRAINT IF EXISTS social_connections_platform_check;
ALTER TABLE public.social_connections ADD CONSTRAINT social_connections_platform_check 
  CHECK (platform = ANY (ARRAY['twitter','facebook','instagram','linkedin','tiktok','threads','youtube','zalo_oa','google_business','website']));