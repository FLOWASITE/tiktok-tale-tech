-- Phase 1: Database Schema Extension for External Crawl & Auto-Update

-- 1.1 Create regulation_sources table to manage crawl sources
CREATE TABLE public.regulation_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  category TEXT NOT NULL,
  search_query TEXT,
  crawl_frequency TEXT DEFAULT 'weekly' CHECK (crawl_frequency IN ('daily', 'weekly', 'monthly')),
  last_crawled_at TIMESTAMPTZ,
  next_crawl_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.2 Create regulation_crawl_history table to track crawl history
CREATE TABLE public.regulation_crawl_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES public.regulation_sources(id) ON DELETE CASCADE,
  crawl_started_at TIMESTAMPTZ DEFAULT now(),
  crawl_completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  results_count INT DEFAULT 0,
  changes_detected INT DEFAULT 0,
  new_regulations INT DEFAULT 0,
  updated_regulations INT DEFAULT 0,
  error_message TEXT,
  crawl_data JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1.3 Add columns to industry_knowledge_nodes for source tracking
ALTER TABLE public.industry_knowledge_nodes 
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES public.regulation_sources(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- 1.4 Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_regulation_sources_active ON public.regulation_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_regulation_sources_jurisdiction ON public.regulation_sources(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_regulation_sources_next_crawl ON public.regulation_sources(next_crawl_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_crawl_history_source ON public.regulation_crawl_history(source_id);
CREATE INDEX IF NOT EXISTS idx_crawl_history_status ON public.regulation_crawl_history(status);
CREATE INDEX IF NOT EXISTS idx_nodes_source ON public.industry_knowledge_nodes(source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nodes_content_hash ON public.industry_knowledge_nodes(content_hash) WHERE content_hash IS NOT NULL;

-- 1.5 Enable RLS
ALTER TABLE public.regulation_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulation_crawl_history ENABLE ROW LEVEL SECURITY;

-- 1.6 RLS Policies for regulation_sources (admin access)
CREATE POLICY "Allow read access to regulation_sources" 
ON public.regulation_sources FOR SELECT 
USING (true);

CREATE POLICY "Allow insert for authenticated users" 
ON public.regulation_sources FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow update for authenticated users" 
ON public.regulation_sources FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow delete for authenticated users" 
ON public.regulation_sources FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- 1.7 RLS Policies for regulation_crawl_history
CREATE POLICY "Allow read access to crawl_history" 
ON public.regulation_crawl_history FOR SELECT 
USING (true);

CREATE POLICY "Allow insert for authenticated users" 
ON public.regulation_crawl_history FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow update for authenticated users" 
ON public.regulation_crawl_history FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- 1.8 Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_regulation_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1.9 Create trigger for updated_at
CREATE TRIGGER update_regulation_sources_timestamp
BEFORE UPDATE ON public.regulation_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_regulation_sources_updated_at();

-- 1.10 Create function to calculate next_crawl_at
CREATE OR REPLACE FUNCTION public.calculate_next_crawl_at(
  frequency TEXT,
  last_crawled TIMESTAMPTZ DEFAULT now()
)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  CASE frequency
    WHEN 'daily' THEN RETURN last_crawled + INTERVAL '1 day';
    WHEN 'weekly' THEN RETURN last_crawled + INTERVAL '1 week';
    WHEN 'monthly' THEN RETURN last_crawled + INTERVAL '1 month';
    ELSE RETURN last_crawled + INTERVAL '1 week';
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- 1.11 Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.regulation_sources;
ALTER PUBLICATION supabase_realtime ADD TABLE public.regulation_crawl_history;