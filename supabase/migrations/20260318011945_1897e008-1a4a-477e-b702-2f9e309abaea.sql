
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id UUID;
  user_full_name TEXT;
BEGIN
  -- Get full_name with fallback for Google OAuth (name field)
  user_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name'
  );

  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  
  IF NEW.email = 'flowasite@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  
  IF NOT COALESCE((NEW.raw_user_meta_data->>'skip_default_org')::boolean, false) THEN
    INSERT INTO public.organizations (name, slug, owner_id)
    VALUES (
      COALESCE(user_full_name, split_part(NEW.email, '@', 1)) || '''s Workspace',
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
