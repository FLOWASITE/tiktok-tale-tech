-- Update the content_count when content is created with a variant
CREATE OR REPLACE FUNCTION public.update_variant_content_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' AND NEW.brand_voice_variant_id IS NOT NULL THEN
    UPDATE public.brand_voice_variants 
    SET content_count = content_count + 1, updated_at = now()
    WHERE id = NEW.brand_voice_variant_id;
  END IF;
  
  -- Handle UPDATE (variant changed)
  IF TG_OP = 'UPDATE' THEN
    -- Decrement old variant count
    IF OLD.brand_voice_variant_id IS NOT NULL AND 
       (NEW.brand_voice_variant_id IS NULL OR OLD.brand_voice_variant_id <> NEW.brand_voice_variant_id) THEN
      UPDATE public.brand_voice_variants 
      SET content_count = GREATEST(0, content_count - 1), updated_at = now()
      WHERE id = OLD.brand_voice_variant_id;
    END IF;
    
    -- Increment new variant count
    IF NEW.brand_voice_variant_id IS NOT NULL AND 
       (OLD.brand_voice_variant_id IS NULL OR OLD.brand_voice_variant_id <> NEW.brand_voice_variant_id) THEN
      UPDATE public.brand_voice_variants 
      SET content_count = content_count + 1, updated_at = now()
      WHERE id = NEW.brand_voice_variant_id;
    END IF;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' AND OLD.brand_voice_variant_id IS NOT NULL THEN
    UPDATE public.brand_voice_variants 
    SET content_count = GREATEST(0, content_count - 1), updated_at = now()
    WHERE id = OLD.brand_voice_variant_id;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop triggers if they exist and recreate
DROP TRIGGER IF EXISTS update_multichannel_variant_count ON public.multi_channel_contents;
DROP TRIGGER IF EXISTS update_scripts_variant_count ON public.scripts;

-- Create triggers for multi_channel_contents
CREATE TRIGGER update_multichannel_variant_count
AFTER INSERT OR UPDATE OF brand_voice_variant_id OR DELETE ON public.multi_channel_contents
FOR EACH ROW EXECUTE FUNCTION public.update_variant_content_count();

-- Create triggers for scripts
CREATE TRIGGER update_scripts_variant_count
AFTER INSERT OR UPDATE OF brand_voice_variant_id OR DELETE ON public.scripts
FOR EACH ROW EXECUTE FUNCTION public.update_variant_content_count();