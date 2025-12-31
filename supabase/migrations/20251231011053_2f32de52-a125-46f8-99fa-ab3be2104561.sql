-- Create journey_stage_messaging table for storing messaging sets per journey stage
CREATE TABLE public.journey_stage_messaging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to product_persona_mappings
  mapping_id UUID NOT NULL REFERENCES public.product_persona_mappings(id) ON DELETE CASCADE,
  
  -- Journey stage
  journey_stage TEXT NOT NULL CHECK (journey_stage IN ('awareness', 'consideration', 'decision', 'loyalty')),
  
  -- Core Messaging Content
  headline TEXT,
  hook TEXT,
  key_message TEXT,
  
  -- Pain Points & Benefits Focus
  pain_points_focus TEXT[] DEFAULT '{}',
  benefits_highlight TEXT[] DEFAULT '{}',
  
  -- CTA & Emotional Tone
  cta_template TEXT,
  emotional_tone TEXT CHECK (emotional_tone IS NULL OR emotional_tone IN ('curiosity', 'urgency', 'trust', 'delight', 'empathy', 'authority')),
  
  -- Objection Handling
  objection_response TEXT,
  
  -- Content Hints
  content_types TEXT[] DEFAULT '{}',
  avoid_messages TEXT[] DEFAULT '{}',
  
  -- Ownership
  organization_id UUID,
  user_id UUID,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique stage per mapping
  UNIQUE(mapping_id, journey_stage)
);

-- Indexes for performance
CREATE INDEX idx_journey_stage_messaging_mapping_id 
  ON public.journey_stage_messaging(mapping_id);

CREATE INDEX idx_journey_stage_messaging_org_id 
  ON public.journey_stage_messaging(organization_id) 
  WHERE organization_id IS NOT NULL;

CREATE INDEX idx_journey_stage_messaging_mapping_stage 
  ON public.journey_stage_messaging(mapping_id, journey_stage);

-- Auto-update updated_at trigger
CREATE TRIGGER set_journey_stage_messaging_updated_at
  BEFORE UPDATE ON public.journey_stage_messaging
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- Enable RLS
ALTER TABLE public.journey_stage_messaging ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view journey_stage_messaging"
  ON public.journey_stage_messaging
  FOR SELECT
  USING (
    (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id))
    OR (user_id = auth.uid())
  );

CREATE POLICY "Org members can insert journey_stage_messaging"
  ON public.journey_stage_messaging
  FOR INSERT
  WITH CHECK (
    (organization_id IS NULL AND user_id = auth.uid())
    OR (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id))
  );

CREATE POLICY "Org members can update journey_stage_messaging"
  ON public.journey_stage_messaging
  FOR UPDATE
  USING (
    (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id))
    OR (user_id = auth.uid())
  );

CREATE POLICY "Org admins can delete journey_stage_messaging"
  ON public.journey_stage_messaging
  FOR DELETE
  USING (
    (organization_id IS NOT NULL AND is_org_admin(auth.uid(), organization_id))
    OR (user_id = auth.uid())
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.journey_stage_messaging;