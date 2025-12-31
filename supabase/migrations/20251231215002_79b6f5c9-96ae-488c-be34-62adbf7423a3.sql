-- =============================================
-- Phase 1: Conversation Embeddings Schema
-- =============================================

-- Create conversation_embeddings table for semantic search over chat history
CREATE TABLE public.conversation_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.chat_conversation_messages(id) ON DELETE CASCADE,
  embedding_type TEXT NOT NULL CHECK (embedding_type IN ('summary', 'message', 'exchange', 'key_insight')),
  content_text TEXT NOT NULL,
  embedding vector(768),
  user_id UUID NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_template_id UUID REFERENCES public.brand_templates(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add comment
COMMENT ON TABLE public.conversation_embeddings IS 'Stores embeddings for conversation history semantic search';

-- Create indexes for efficient querying
CREATE INDEX idx_conversation_embeddings_user ON public.conversation_embeddings(user_id);
CREATE INDEX idx_conversation_embeddings_org ON public.conversation_embeddings(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_conversation_embeddings_brand ON public.conversation_embeddings(brand_template_id) WHERE brand_template_id IS NOT NULL;
CREATE INDEX idx_conversation_embeddings_conversation ON public.conversation_embeddings(conversation_id);
CREATE INDEX idx_conversation_embeddings_type ON public.conversation_embeddings(embedding_type);
CREATE INDEX idx_conversation_embeddings_created ON public.conversation_embeddings(created_at DESC);

-- Create HNSW index for fast vector similarity search
CREATE INDEX idx_conversation_embeddings_vector ON public.conversation_embeddings 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- Enable RLS
ALTER TABLE public.conversation_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own conversation embeddings
CREATE POLICY "Users can view own conversation embeddings"
  ON public.conversation_embeddings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversation embeddings"
  ON public.conversation_embeddings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversation embeddings"
  ON public.conversation_embeddings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversation embeddings"
  ON public.conversation_embeddings FOR DELETE
  USING (auth.uid() = user_id);

-- Service role policy for edge functions
CREATE POLICY "Service role has full access to conversation embeddings"
  ON public.conversation_embeddings FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Org members can view org conversation embeddings (for team features)
CREATE POLICY "Org members can view org conversation embeddings"
  ON public.conversation_embeddings FOR SELECT
  USING (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));

-- =============================================
-- Semantic Search Function
-- =============================================
CREATE OR REPLACE FUNCTION public.search_conversation_embeddings(
  query_embedding vector(768),
  match_user_id UUID,
  match_organization_id UUID DEFAULT NULL,
  match_brand_template_id UUID DEFAULT NULL,
  match_types TEXT[] DEFAULT NULL,
  exclude_conversation_id UUID DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  message_id UUID,
  embedding_type TEXT,
  content_text TEXT,
  similarity FLOAT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id,
    ce.conversation_id,
    ce.message_id,
    ce.embedding_type,
    ce.content_text,
    1 - (ce.embedding <=> query_embedding) AS similarity,
    ce.metadata,
    ce.created_at
  FROM conversation_embeddings ce
  WHERE 
    ce.user_id = match_user_id
    AND (match_organization_id IS NULL OR ce.organization_id = match_organization_id)
    AND (match_brand_template_id IS NULL OR ce.brand_template_id = match_brand_template_id)
    AND (match_types IS NULL OR ce.embedding_type = ANY(match_types))
    AND (exclude_conversation_id IS NULL OR ce.conversation_id != exclude_conversation_id)
    AND ce.embedding IS NOT NULL
    AND 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Add column to track if conversation has been indexed
ALTER TABLE public.chat_conversations 
ADD COLUMN IF NOT EXISTS embeddings_indexed_at TIMESTAMPTZ DEFAULT NULL;

-- Create trigger for updated_at
CREATE TRIGGER update_conversation_embeddings_updated_at
  BEFORE UPDATE ON public.conversation_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();