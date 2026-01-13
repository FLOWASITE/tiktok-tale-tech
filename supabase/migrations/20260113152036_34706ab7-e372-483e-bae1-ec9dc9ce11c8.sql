-- Add parsed_structure column for structured legal document metadata
ALTER TABLE public.industry_knowledge_nodes 
ADD COLUMN IF NOT EXISTS parsed_structure JSONB;

-- Create index for document type lookups
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_doc_type 
ON public.industry_knowledge_nodes ((parsed_structure->>'document_type'));

-- Add comment for documentation
COMMENT ON COLUMN public.industry_knowledge_nodes.parsed_structure IS 'Structured legal document metadata: document_type, document_number, issuing_authority, effective_date, chapters, articles, signatories';