-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('user', 'pro', 'admin');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table (SEPARATE from profiles to prevent privilege escalation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Enable RLS on new tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Trigger function to create profile and assign default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles (users can only view their own roles)
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Add user_id to existing tables
ALTER TABLE public.scripts ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.carousels ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.multi_channel_contents ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.brand_templates ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing permissive policies on scripts
DROP POLICY IF EXISTS "Anyone can create scripts" ON public.scripts;
DROP POLICY IF EXISTS "Anyone can delete scripts" ON public.scripts;
DROP POLICY IF EXISTS "Anyone can update scripts" ON public.scripts;
DROP POLICY IF EXISTS "Anyone can view scripts" ON public.scripts;

-- Drop existing permissive policies on carousels
DROP POLICY IF EXISTS "Anyone can create carousels" ON public.carousels;
DROP POLICY IF EXISTS "Anyone can delete carousels" ON public.carousels;
DROP POLICY IF EXISTS "Anyone can update carousels" ON public.carousels;
DROP POLICY IF EXISTS "Anyone can view carousels" ON public.carousels;

-- Drop existing permissive policies on multi_channel_contents
DROP POLICY IF EXISTS "Anyone can create multi_channel_contents" ON public.multi_channel_contents;
DROP POLICY IF EXISTS "Anyone can delete multi_channel_contents" ON public.multi_channel_contents;
DROP POLICY IF EXISTS "Anyone can update multi_channel_contents" ON public.multi_channel_contents;
DROP POLICY IF EXISTS "Anyone can view multi_channel_contents" ON public.multi_channel_contents;

-- Drop existing permissive policies on brand_templates
DROP POLICY IF EXISTS "Anyone can create brand_templates" ON public.brand_templates;
DROP POLICY IF EXISTS "Anyone can delete brand_templates" ON public.brand_templates;
DROP POLICY IF EXISTS "Anyone can update brand_templates" ON public.brand_templates;
DROP POLICY IF EXISTS "Anyone can view brand_templates" ON public.brand_templates;

-- Create user-scoped RLS policies for scripts
CREATE POLICY "Users can view own scripts" ON public.scripts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scripts" ON public.scripts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scripts" ON public.scripts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own scripts" ON public.scripts
  FOR DELETE USING (auth.uid() = user_id);

-- Create user-scoped RLS policies for carousels
CREATE POLICY "Users can view own carousels" ON public.carousels
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own carousels" ON public.carousels
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own carousels" ON public.carousels
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own carousels" ON public.carousels
  FOR DELETE USING (auth.uid() = user_id);

-- Create user-scoped RLS policies for multi_channel_contents
CREATE POLICY "Users can view own multi_channel_contents" ON public.multi_channel_contents
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own multi_channel_contents" ON public.multi_channel_contents
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own multi_channel_contents" ON public.multi_channel_contents
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own multi_channel_contents" ON public.multi_channel_contents
  FOR DELETE USING (auth.uid() = user_id);

-- Create user-scoped RLS policies for brand_templates
CREATE POLICY "Users can view own brand_templates" ON public.brand_templates
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own brand_templates" ON public.brand_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own brand_templates" ON public.brand_templates
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own brand_templates" ON public.brand_templates
  FOR DELETE USING (auth.uid() = user_id);