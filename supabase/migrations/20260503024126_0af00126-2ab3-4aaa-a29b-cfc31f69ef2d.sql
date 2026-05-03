INSERT INTO public.ai_function_categories (organization_id, slug, label, icon, color, sort_order, is_system)
VALUES (NULL, 'seo', 'SEO', 'search', '#10b981', 7, true)
ON CONFLICT (slug) WHERE organization_id IS NULL DO NOTHING;