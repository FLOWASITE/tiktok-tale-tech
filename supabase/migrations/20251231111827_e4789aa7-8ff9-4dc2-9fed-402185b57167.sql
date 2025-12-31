-- Phase 2.1: Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Phase 2.2: Create content_embeddings table for RAG system
CREATE TABLE public.content_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content reference
  content_type TEXT NOT NULL, -- 'topic', 'script', 'carousel', 'multichannel'
  content_id UUID NOT NULL,
  chunk_index INTEGER DEFAULT 0, -- For long content split into chunks
  
  -- Embedding data
  content_text TEXT NOT NULL, -- Original text that was embedded
  embedding extensions.vector(768), -- Using 768 dimensions for text-embedding-004
  
  -- Organization context
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_template_id UUID REFERENCES public.brand_templates(id) ON DELETE SET NULL,
  
  -- Metadata for filtering
  metadata JSONB DEFAULT '{}', -- category, pillar, format, performance_score, etc.
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint to prevent duplicate embeddings
  UNIQUE(content_type, content_id, chunk_index)
);

-- Create HNSW index for fast approximate nearest neighbor search
CREATE INDEX content_embeddings_embedding_idx 
ON public.content_embeddings 
USING hnsw (embedding extensions.vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Additional indexes for filtering
CREATE INDEX content_embeddings_org_idx ON public.content_embeddings(organization_id);
CREATE INDEX content_embeddings_brand_idx ON public.content_embeddings(brand_template_id);
CREATE INDEX content_embeddings_type_idx ON public.content_embeddings(content_type);
CREATE INDEX content_embeddings_content_idx ON public.content_embeddings(content_type, content_id);

-- Enable RLS
ALTER TABLE public.content_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view org embeddings"
  ON public.content_embeddings FOR SELECT
  USING (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can insert org embeddings"
  ON public.content_embeddings FOR INSERT
  WITH CHECK (organization_id IS NULL OR is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can update embeddings"
  ON public.content_embeddings FOR UPDATE
  USING (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete embeddings"
  ON public.content_embeddings FOR DELETE
  USING (organization_id IS NOT NULL AND is_org_admin(auth.uid(), organization_id));

-- Trigger for updated_at
CREATE TRIGGER update_content_embeddings_updated_at
  BEFORE UPDATE ON public.content_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create search function for vector similarity
CREATE OR REPLACE FUNCTION public.search_embeddings(
  query_embedding extensions.vector(768),
  match_organization_id UUID,
  match_brand_template_id UUID DEFAULT NULL,
  match_content_types TEXT[] DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content_type TEXT,
  content_id UUID,
  content_text TEXT,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id,
    ce.content_type,
    ce.content_id,
    ce.content_text,
    (1 - (ce.embedding <=> query_embedding))::FLOAT as similarity,
    ce.metadata
  FROM public.content_embeddings ce
  WHERE ce.organization_id = match_organization_id
    AND (match_brand_template_id IS NULL OR ce.brand_template_id = match_brand_template_id)
    AND (match_content_types IS NULL OR ce.content_type = ANY(match_content_types))
    AND (1 - (ce.embedding <=> query_embedding)) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;