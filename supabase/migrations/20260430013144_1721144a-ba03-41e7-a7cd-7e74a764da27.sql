UPDATE public.video_generations
SET status = 'processing',
    poll_attempts = 0,
    error_message = NULL,
    completed_at = NULL,
    last_polled_at = NULL,
    progress = 90
WHERE provider = 'geminigen'
  AND status = 'failed'
  AND error_message ILIKE '%no video URL%'
  AND created_at > now() - interval '6 hour';