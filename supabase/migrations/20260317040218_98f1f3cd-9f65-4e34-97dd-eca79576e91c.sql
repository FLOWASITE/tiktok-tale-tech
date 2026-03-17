
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id UUID;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Auto assign admin role for specific email, otherwise user role
  IF NEW.email = 'flowasite@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
  END IF;
  
  -- Create subscription
  INSERT INTO public.subscriptions (user_id, plan_type, status)
  VALUES (NEW.id, 'free', 'active');
  
  -- Only create default organization if skip_default_org flag is NOT set
  IF NOT COALESCE((NEW.raw_user_meta_data->>'skip_default_org')::boolean, false) THEN
    -- Create default organization for new user
    INSERT INTO public.organizations (name, slug, owner_id)
    VALUES (
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)) || '''s Workspace',
      NEW.id::text,
      NEW.id
    )
    RETURNING id INTO new_org_id;
    
    -- Add user as owner of the organization
    INSERT INTO public.organization_members (organization_id, user_id, role, joined_at)
    VALUES (new_org_id, NEW.id, 'owner', now());
  END IF;
  
  RETURN NEW;
END;
$function$;
