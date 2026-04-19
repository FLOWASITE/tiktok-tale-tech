-- Seed 'video' and 'audio' system categories in ai_function_categories
-- so the Admin AI Management > Functions page groups generate-video and
-- generate-music under proper headers (otherwise they fall into "Other").
-- Idempotent via WHERE NOT EXISTS (system rows have organization_id = NULL).

INSERT INTO public.ai_function_categories (slug, label, icon, color, is_system, sort_order)
SELECT 'video', 'Video', 'video', '#a855f7', true, 8
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_function_categories
  WHERE organization_id IS NULL AND slug = 'video'
);

INSERT INTO public.ai_function_categories (slug, label, icon, color, is_system, sort_order)
SELECT 'audio', 'Audio', 'music', '#f97316', true, 9
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_function_categories
  WHERE organization_id IS NULL AND slug = 'audio'
);
