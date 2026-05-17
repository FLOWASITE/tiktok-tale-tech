
ALTER TABLE public.agent_goals
  ADD COLUMN IF NOT EXISTS period_type text NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS period_label text,
  ADD COLUMN IF NOT EXISTS parent_goal_id uuid;

ALTER TABLE public.agent_goals
  DROP CONSTRAINT IF EXISTS agent_goals_period_type_check;
ALTER TABLE public.agent_goals
  ADD CONSTRAINT agent_goals_period_type_check
  CHECK (period_type IN ('month','quarter','year','custom'));

ALTER TABLE public.agent_goals
  DROP CONSTRAINT IF EXISTS agent_goals_parent_goal_fk;
ALTER TABLE public.agent_goals
  ADD CONSTRAINT agent_goals_parent_goal_fk
  FOREIGN KEY (parent_goal_id) REFERENCES public.agent_goals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agent_goals_parent ON public.agent_goals(parent_goal_id);
CREATE INDEX IF NOT EXISTS idx_agent_goals_period ON public.agent_goals(organization_id, period_type) WHERE period_type <> 'custom';

-- Trigger: parent phải cùng organization_id
CREATE OR REPLACE FUNCTION public.validate_agent_goal_parent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_org uuid;
BEGIN
  IF NEW.parent_goal_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.parent_goal_id = NEW.id THEN
    RAISE EXCEPTION 'Campaign không thể là cha của chính nó';
  END IF;
  SELECT organization_id INTO parent_org FROM public.agent_goals WHERE id = NEW.parent_goal_id;
  IF parent_org IS NULL OR parent_org <> NEW.organization_id THEN
    RAISE EXCEPTION 'Campaign cha phải cùng workspace';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_agent_goal_parent ON public.agent_goals;
CREATE TRIGGER trg_validate_agent_goal_parent
  BEFORE INSERT OR UPDATE OF parent_goal_id ON public.agent_goals
  FOR EACH ROW EXECUTE FUNCTION public.validate_agent_goal_parent();
