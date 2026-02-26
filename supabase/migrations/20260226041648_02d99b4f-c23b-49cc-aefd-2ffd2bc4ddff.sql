-- Fix overly permissive RLS policies

-- 1. duplicate_ignore_list: scope to the user who ignored it
DROP POLICY IF EXISTS "Allow all access to duplicate_ignore_list" ON public.duplicate_ignore_list;
CREATE POLICY "Users can manage their own ignore list" ON public.duplicate_ignore_list
  FOR ALL USING (ignored_by = auth.uid())
  WITH CHECK (ignored_by = auth.uid());

-- 2. industry_personas_v2: these are global system data, restrict write to admins
DROP POLICY IF EXISTS "Authenticated users can manage industry personas" ON public.industry_personas_v2;
CREATE POLICY "Authenticated users can read industry personas" ON public.industry_personas_v2
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage industry personas" ON public.industry_personas_v2
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. industry_persona_translations_v2: same pattern
DROP POLICY IF EXISTS "Authenticated users can manage persona translations" ON public.industry_persona_translations_v2;
CREATE POLICY "Authenticated users can read persona translations" ON public.industry_persona_translations_v2
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage persona translations" ON public.industry_persona_translations_v2
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));