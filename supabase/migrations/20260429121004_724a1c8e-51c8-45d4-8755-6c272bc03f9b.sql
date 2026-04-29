-- Schedule Pinterest token auto-refresh every 30 minutes
-- Uses the project anon key (publishable) which is safe to embed
SELECT cron.schedule(
  'refresh-pinterest-tokens-every-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rllyipiyuptkibqinotz.supabase.co/functions/v1/refresh-all-pinterest-tokens',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsbHlpcGl5dXB0a2licWlub3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNzE2NjMsImV4cCI6MjA4MTg0NzY2M30.mxEDfftc7aKZxQv63L4kLQpOtyyjtHaV18WEMWTp7-w"}'::jsonb,
    body := '{"trigger": "cron"}'::jsonb
  );
  $$
);