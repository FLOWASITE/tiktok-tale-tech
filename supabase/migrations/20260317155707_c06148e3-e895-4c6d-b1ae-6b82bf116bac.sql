
-- Add monthly_brands column to plan_limits
ALTER TABLE public.plan_limits ADD COLUMN monthly_brands INTEGER NOT NULL DEFAULT 1;

-- Update can_use_feature to handle ai_edit as always allowed
CREATE OR REPLACE FUNCTION public.can_use_feature(_user_id uuid, _usage_type usage_type)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _plan_type plan_type;
  _limit integer;
  _current_usage integer;
BEGIN
  -- ai_edit is always allowed (unlimited)
  IF _usage_type = 'ai_edit' THEN
    RETURN true;
  END IF;

  -- Get user's plan
  SELECT plan_type INTO _plan_type
  FROM public.subscriptions
  WHERE user_id = _user_id AND status = 'active';
  
  IF _plan_type IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get limit for this plan/usage type
  SELECT 
    CASE _usage_type
      WHEN 'script' THEN monthly_scripts
      WHEN 'carousel' THEN monthly_carousels
      WHEN 'multichannel' THEN monthly_multichannel
      WHEN 'image_generation' THEN monthly_images
    END INTO _limit
  FROM public.plan_limits
  WHERE plan_type = _plan_type;
  
  -- -1 means unlimited
  IF _limit = -1 THEN
    RETURN true;
  END IF;
  
  -- Get current usage
  _current_usage := public.get_user_usage(_user_id, _usage_type);
  
  RETURN _current_usage < _limit;
END;
$function$;
