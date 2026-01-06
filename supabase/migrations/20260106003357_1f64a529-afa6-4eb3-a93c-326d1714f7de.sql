-- Bảng tracking insight interactions
CREATE TABLE public.insight_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID REFERENCES public.organizations(id),
  insight_id TEXT NOT NULL,
  insight_type TEXT NOT NULL,
  action_type TEXT NOT NULL,
  time_spent_ms INTEGER,
  action_href TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_insight_analytics_user ON public.insight_analytics(user_id, created_at);
CREATE INDEX idx_insight_analytics_type ON public.insight_analytics(insight_type, action_type);

-- RLS
ALTER TABLE public.insight_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own analytics" ON public.insight_analytics 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own analytics" ON public.insight_analytics 
  FOR SELECT USING (auth.uid() = user_id);