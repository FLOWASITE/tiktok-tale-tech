-- Bug #2: cho phép content_schedules.content_id NULL (lịch tạo trước, content gắn sau ở stage create)
ALTER TABLE public.content_schedules ALTER COLUMN content_id DROP NOT NULL;

-- Bug #1 (defensive): force PostgREST reload schema cache để pick up stage_claim_token/at columns
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';