-- Fix search_path for check_parent_is_core function (Phase 1 security fix)
CREATE OR REPLACE FUNCTION public.check_parent_is_core()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_pack_id IS NOT NULL THEN
    -- Check that parent exists and is a core industry
    IF NOT EXISTS (
      SELECT 1 FROM public.industry_global_packs 
      WHERE id = NEW.parent_pack_id 
      AND industry_level = 'core'
    ) THEN
      RAISE EXCEPTION 'Parent pack must be a core industry';
    END IF;
    -- Force sub level when parent is set
    NEW.industry_level := 'sub';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;