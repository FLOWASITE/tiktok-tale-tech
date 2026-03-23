
ALTER TABLE public.agent_goals ADD COLUMN campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;
ALTER TABLE public.agent_pipelines ADD COLUMN campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;
