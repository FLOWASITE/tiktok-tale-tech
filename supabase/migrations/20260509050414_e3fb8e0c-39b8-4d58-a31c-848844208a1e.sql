UPDATE public.ai_function_configs
SET model_override = 'geminigen/nano-banana-pro',
    updated_at = now()
WHERE function_name = 'generate-carousel-image'
  AND organization_id IS NULL;