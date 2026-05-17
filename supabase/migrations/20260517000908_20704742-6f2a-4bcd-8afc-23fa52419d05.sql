ALTER TABLE public.agent_pipelines
  DROP CONSTRAINT IF EXISTS agent_pipelines_campaign_plan_id_fkey;

ALTER TABLE public.agent_pipelines
  ADD CONSTRAINT agent_pipelines_campaign_plan_id_fkey
  FOREIGN KEY (campaign_plan_id)
  REFERENCES public.campaign_content_plans(id)
  ON DELETE SET NULL;