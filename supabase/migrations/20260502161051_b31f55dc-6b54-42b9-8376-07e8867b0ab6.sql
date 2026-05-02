ALTER TABLE public.multi_channel_contents
  ADD COLUMN IF NOT EXISTS cluster_id uuid REFERENCES public.seo_clusters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mcc_cluster_id ON public.multi_channel_contents(cluster_id);