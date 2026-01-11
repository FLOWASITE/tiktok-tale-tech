-- Create function to automatically log prompt changes to history
CREATE OR REPLACE FUNCTION public.log_prompt_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.ai_prompt_history (
    prompt_id,
    organization_id,
    version,
    content,
    variables,
    change_type,
    change_reason,
    changed_by
  ) VALUES (
    NEW.id,
    NEW.organization_id,
    NEW.version,
    NEW.content,
    NEW.variables,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'created'
      WHEN OLD.content IS DISTINCT FROM NEW.content THEN 'content_update'
      WHEN OLD.is_active IS DISTINCT FROM NEW.is_active THEN 'status_change'
      ELSE 'metadata_update'
    END,
    COALESCE(
      current_setting('app.change_reason', true),
      CASE 
        WHEN TG_OP = 'INSERT' THEN 'Initial creation'
        ELSE 'Auto-logged via trigger'
      END
    ),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on ai_prompts table
DROP TRIGGER IF EXISTS prompt_history_trigger ON public.ai_prompts;

CREATE TRIGGER prompt_history_trigger
AFTER INSERT OR UPDATE ON public.ai_prompts
FOR EACH ROW EXECUTE FUNCTION public.log_prompt_change();