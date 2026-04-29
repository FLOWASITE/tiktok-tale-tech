-- Add Pinterest content columns to multi_channel_contents
ALTER TABLE public.multi_channel_contents
  ADD COLUMN IF NOT EXISTS pinterest_content TEXT,
  ADD COLUMN IF NOT EXISTS pinterest_title TEXT;

-- Create pinterest_boards cache (refreshed periodically from Pinterest API)
CREATE TABLE IF NOT EXISTS public.pinterest_boards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID NOT NULL REFERENCES public.social_connections(id) ON DELETE CASCADE,
  organization_id UUID,
  board_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  privacy TEXT,
  pin_count INTEGER DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  cover_image_url TEXT,
  is_default BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (connection_id, board_id)
);

CREATE INDEX IF NOT EXISTS idx_pinterest_boards_connection ON public.pinterest_boards(connection_id);
CREATE INDEX IF NOT EXISTS idx_pinterest_boards_org ON public.pinterest_boards(organization_id);

ALTER TABLE public.pinterest_boards ENABLE ROW LEVEL SECURITY;

-- Owner of the connection can view/manage their boards
CREATE POLICY "Users can view their own pinterest boards"
  ON public.pinterest_boards FOR SELECT
  USING (
    connection_id IN (
      SELECT id FROM public.social_connections WHERE user_id = auth.uid()
    )
    OR organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own pinterest boards"
  ON public.pinterest_boards FOR INSERT
  WITH CHECK (
    connection_id IN (
      SELECT id FROM public.social_connections WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own pinterest boards"
  ON public.pinterest_boards FOR UPDATE
  USING (
    connection_id IN (
      SELECT id FROM public.social_connections WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own pinterest boards"
  ON public.pinterest_boards FOR DELETE
  USING (
    connection_id IN (
      SELECT id FROM public.social_connections WHERE user_id = auth.uid()
    )
  );

-- Trigger updated_at
CREATE TRIGGER pinterest_boards_updated_at
  BEFORE UPDATE ON public.pinterest_boards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();