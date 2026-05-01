UPDATE public.social_connections
SET last_error = NULL
WHERE platform = 'bluesky'
  AND is_active = true
  AND metadata ? 'dpop_jwk_encrypted'
  AND last_error LIKE '%App Password%';