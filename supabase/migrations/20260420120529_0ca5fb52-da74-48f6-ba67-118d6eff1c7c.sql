ALTER TABLE public.telegram_chat_bindings
ADD COLUMN IF NOT EXISTS first_chat_hint_shown_at timestamptz;