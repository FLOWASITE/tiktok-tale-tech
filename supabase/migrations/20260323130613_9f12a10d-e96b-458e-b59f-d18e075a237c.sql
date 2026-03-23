
-- Calendar day notes - general notes on specific dates, not tied to schedules
CREATE TABLE public.calendar_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  note_date DATE NOT NULL,
  content TEXT NOT NULL,
  color TEXT DEFAULT 'default',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by org + date
CREATE INDEX idx_calendar_notes_org_date ON public.calendar_notes(organization_id, note_date);

-- Enable RLS
ALTER TABLE public.calendar_notes ENABLE ROW LEVEL SECURITY;

-- Org members can view notes
CREATE POLICY "Org members can view calendar notes"
  ON public.calendar_notes FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Org members can create notes
CREATE POLICY "Org members can create calendar notes"
  ON public.calendar_notes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Org members can update notes
CREATE POLICY "Org members can update calendar notes"
  ON public.calendar_notes FOR UPDATE
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Org members can delete notes
CREATE POLICY "Org members can delete calendar notes"
  ON public.calendar_notes FOR DELETE
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_notes;
