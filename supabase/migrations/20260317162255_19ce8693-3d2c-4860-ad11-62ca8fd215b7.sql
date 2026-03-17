
-- Step 1: Delete orphan subscription (user without org ownership)
DELETE FROM public.subscriptions WHERE user_id = '03dba0e0-d0c5-4df5-b20c-7eb7b14c780b';

-- Step 2: Drop old unique constraint on user_id
ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_user_id_key;

-- Step 3: Make organization_id NOT NULL
ALTER TABLE public.subscriptions 
  ALTER COLUMN organization_id SET NOT NULL;

-- Step 4: Add unique constraint on organization_id  
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_organization_id_key UNIQUE (organization_id);

-- Step 5: Make user_id nullable
ALTER TABLE public.subscriptions
  ALTER COLUMN user_id DROP NOT NULL;

-- Step 6: Add organization_id to usage_logs
ALTER TABLE public.usage_logs
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Step 7: Update handle_new_user()
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id UUID;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  IF NEW.email = 'flowasite@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  
  IF NOT COALESCE((NEW.raw_user_meta_data->>'skip_default_org')::boolean, false) THEN
    INSERT INTO public.organizations (name, slug, owner_id)
    VALUES (
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)) || '''s Workspace',
      NEW.id::text, NEW.id
    ) RETURNING id INTO new_org_id;
    
    INSERT INTO public.organization_members (organization_id, user_id, role, joined_at)
    VALUES (new_org_id, NEW.id, 'owner', now());
    
    INSERT INTO public.subscriptions (user_id, organization_id, plan_type, status)
    VALUES (NEW.id, new_org_id, 'free', 'active');
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Step 8: Create get_org_usage function
CREATE OR REPLACE FUNCTION public.get_org_usage(_org_id uuid, _usage_type usage_type)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::integer
  FROM public.usage_logs ul
  JOIN public.subscriptions s ON s.organization_id = ul.organization_id
  WHERE ul.organization_id = _org_id
    AND ul.usage_type = _usage_type
    AND ul.created_at >= s.current_period_start
    AND ul.created_at <= s.current_period_end
$function$;

-- Step 9: Drop old can_use_feature and recreate with org param
DROP FUNCTION IF EXISTS public.can_use_feature(uuid, usage_type);

CREATE FUNCTION public.can_use_feature(_org_id uuid, _usage_type usage_type)
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
  IF _usage_type = 'ai_edit' THEN RETURN true; END IF;

  SELECT plan_type INTO _plan_type
  FROM public.subscriptions
  WHERE organization_id = _org_id AND status = 'active';
  
  IF _plan_type IS NULL THEN RETURN false; END IF;
  
  SELECT 
    CASE _usage_type
      WHEN 'script' THEN monthly_scripts
      WHEN 'carousel' THEN monthly_carousels
      WHEN 'multichannel' THEN monthly_multichannel
      WHEN 'image_generation' THEN monthly_images
    END INTO _limit
  FROM public.plan_limits WHERE plan_type = _plan_type;
  
  IF _limit = -1 THEN RETURN true; END IF;
  
  _current_usage := public.get_org_usage(_org_id, _usage_type);
  RETURN _current_usage < _limit;
END;
$function$;

-- Step 10: Helper to get org plan type
CREATE OR REPLACE FUNCTION public.get_org_plan_type(_org_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT plan_type::text
  FROM public.subscriptions
  WHERE organization_id = _org_id AND status = 'active'
  LIMIT 1
$function$;
