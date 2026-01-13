-- Change vector dimension from 1536 to 768 for Gemini text-embedding-004 compatibility
ALTER TABLE public.industry_knowledge_nodes 
  ALTER COLUMN embedding TYPE extensions.vector(768);