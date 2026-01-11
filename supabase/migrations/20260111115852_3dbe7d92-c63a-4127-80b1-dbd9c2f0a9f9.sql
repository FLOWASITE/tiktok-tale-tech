-- Seed category_id for existing prompts based on function_name

-- Content category (generate-*)
UPDATE ai_prompts SET category_id = (
  SELECT id FROM ai_function_categories WHERE slug = 'content' LIMIT 1
)
WHERE function_name IN (
  'generate-core-content', 'generate-multichannel', 'generate-script', 
  'generate-storyboard', 'generate-carousel', 'generate-hooks', 'generate-ad-copy',
  'generate-topic-suggestions', 'generate-content-angles'
) AND category_id IS NULL;

-- Chat category
UPDATE ai_prompts SET category_id = (
  SELECT id FROM ai_function_categories WHERE slug = 'chat' LIMIT 1
)
WHERE function_name IN ('chat-topics', 'help-chatbot', 'sales-chatbot')
AND category_id IS NULL;

-- Analysis category
UPDATE ai_prompts SET category_id = (
  SELECT id FROM ai_function_categories WHERE slug = 'analysis' LIMIT 1
)
WHERE function_name IN (
  'analyze-script', 'analyze-dashboard-insights', 'quality-gate', 
  'self-critique', 'kpi-ai', 'score-ad-creative', 'predict-ad-performance',
  'analyze-content', 'analyze-performance'
) AND category_id IS NULL;

-- Brand category
UPDATE ai_prompts SET category_id = (
  SELECT id FROM ai_function_categories WHERE slug = 'brand' LIMIT 1
)
WHERE function_name IN ('generate-brand-voice', 'generate-brand-guideline', 'brand-voice')
AND category_id IS NULL;

-- Ideation category
UPDATE ai_prompts SET category_id = (
  SELECT id FROM ai_function_categories WHERE slug = 'ideation' LIMIT 1
)
WHERE function_name IN ('topic-ai', 'generate-journey-messaging', 'brainstorm', 'ideation')
AND category_id IS NULL;

-- Research category
UPDATE ai_prompts SET category_id = (
  SELECT id FROM ai_function_categories WHERE slug = 'research' LIMIT 1
)
WHERE function_name IN ('research-topic', 'competitor-analysis', 'market-research')
AND category_id IS NULL;

-- Image category
UPDATE ai_prompts SET category_id = (
  SELECT id FROM ai_function_categories WHERE slug = 'image' LIMIT 1
)
WHERE function_name IN ('generate-image-prompt', 'image-analysis', 'visual-content')
AND category_id IS NULL;

-- Other category (catch-all for remaining)
UPDATE ai_prompts SET category_id = (
  SELECT id FROM ai_function_categories WHERE slug = 'other' LIMIT 1
)
WHERE category_id IS NULL;