-- Change vector dimension from 768 to 384 for gte-small model compatibility
ALTER TABLE public.industry_knowledge_nodes 
  ALTER COLUMN embedding TYPE extensions.vector(384);