-- 1) Extend telegram_chat_bindings with onboarding tracking
ALTER TABLE public.telegram_chat_bindings
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz,
  ADD COLUMN IF NOT EXISTS tutorial_step smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tutorial_completed_at timestamptz;

-- 2) telegram_user_preferences
CREATE TABLE IF NOT EXISTS public.telegram_user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  daily_digest boolean NOT NULL DEFAULT true,
  weekly_digest boolean NOT NULL DEFAULT false,
  language text NOT NULL DEFAULT 'vi',
  default_brand_id uuid REFERENCES public.brand_templates(id) ON DELETE SET NULL,
  verbose_mode boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_tg_user_prefs_user ON public.telegram_user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_tg_user_prefs_org ON public.telegram_user_preferences(organization_id);
CREATE INDEX IF NOT EXISTS idx_tg_user_prefs_digest ON public.telegram_user_preferences(daily_digest) WHERE daily_digest = true;

ALTER TABLE public.telegram_user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own tg prefs" ON public.telegram_user_preferences;
CREATE POLICY "Users read own tg prefs"
  ON public.telegram_user_preferences FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own tg prefs" ON public.telegram_user_preferences;
CREATE POLICY "Users insert own tg prefs"
  ON public.telegram_user_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Users update own tg prefs" ON public.telegram_user_preferences;
CREATE POLICY "Users update own tg prefs"
  ON public.telegram_user_preferences FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own tg prefs" ON public.telegram_user_preferences;
CREATE POLICY "Users delete own tg prefs"
  ON public.telegram_user_preferences FOR DELETE
  USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_tg_user_prefs_updated_at ON public.telegram_user_preferences;
CREATE TRIGGER trg_tg_user_prefs_updated_at
  BEFORE UPDATE ON public.telegram_user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) telegram_example_prompts
CREATE TABLE IF NOT EXISTS public.telegram_example_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  prompt_text text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  language text NOT NULL DEFAULT 'vi',
  sort_order smallint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tg_examples_active ON public.telegram_example_prompts(is_active, sort_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tg_examples_lang ON public.telegram_example_prompts(language);

ALTER TABLE public.telegram_example_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read examples" ON public.telegram_example_prompts;
CREATE POLICY "Authenticated read examples"
  ON public.telegram_example_prompts FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins manage examples" ON public.telegram_example_prompts;
CREATE POLICY "Admins manage examples"
  ON public.telegram_example_prompts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_tg_examples_updated_at ON public.telegram_example_prompts;
CREATE TRIGGER trg_tg_examples_updated_at
  BEFORE UPDATE ON public.telegram_example_prompts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Seed 7 starter examples (idempotent via title check)
INSERT INTO public.telegram_example_prompts (title, prompt_text, category, sort_order)
SELECT * FROM (VALUES
  ('🛍️ Campaign Black Friday', 'Tạo campaign Black Friday cho thẩm mỹ viện, ưu đãi 30%, kéo dài 5 ngày', 'campaign', 1),
  ('📝 Caption Facebook', 'Viết 3 caption Facebook giới thiệu liệu trình trẻ hoá da, tone chuyên gia thân thiện', 'content', 2),
  ('📊 Phân tích campaign', 'Phân tích hiệu quả campaign tuần này, gợi ý điều chỉnh', 'analytics', 3),
  ('🎯 Idea content tháng', 'Gợi ý 10 idea content tháng cho spa làm đẹp, đa dạng định dạng', 'ideation', 4),
  ('🎬 Script TikTok 30s', 'Viết script TikTok 30s về xu hướng skincare 2026, hook mạnh', 'video', 5),
  ('💬 Trả lời comment', 'Soạn template trả lời 5 loại comment thường gặp về dịch vụ tiêm filler', 'engagement', 6),
  ('📧 Email re-engage', 'Viết email re-engage khách hàng cũ chưa đến trong 3 tháng, ưu đãi cá nhân hoá', 'email', 7)
) AS v(title, prompt_text, category, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.telegram_example_prompts WHERE telegram_example_prompts.title = v.title);