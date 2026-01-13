-- ============================================
-- Living System Upgrade: Add columns for full document parsing
-- ============================================

-- Add new columns to industry_knowledge_nodes for storing full parsed content
ALTER TABLE industry_knowledge_nodes
ADD COLUMN IF NOT EXISTS full_text TEXT,
ADD COLUMN IF NOT EXISTS extracted_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS document_url TEXT,
ADD COLUMN IF NOT EXISTS document_type TEXT,
ADD COLUMN IF NOT EXISTS effective_date DATE,
ADD COLUMN IF NOT EXISTS parse_status TEXT DEFAULT 'pending' CHECK (parse_status IN ('pending', 'parsing', 'parsed', 'failed', 'skipped'));

-- Add new columns to regulation_propagation_log for admin review workflow
ALTER TABLE regulation_propagation_log
ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'needs_revision')),
ADD COLUMN IF NOT EXISTS reviewed_by UUID,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS review_notes TEXT,
ADD COLUMN IF NOT EXISTS document_diff JSONB,
ADD COLUMN IF NOT EXISTS ai_confidence_score NUMERIC(3,2);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_parse_status 
ON industry_knowledge_nodes(parse_status) 
WHERE parse_status != 'parsed';

CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_effective_date 
ON industry_knowledge_nodes(effective_date) 
WHERE effective_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_propagation_review_status 
ON regulation_propagation_log(review_status) 
WHERE review_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_document_type 
ON industry_knowledge_nodes(document_type) 
WHERE document_type IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN industry_knowledge_nodes.full_text IS 'Full extracted text content from parsed PDF/DOCX document';
COMMENT ON COLUMN industry_knowledge_nodes.extracted_data IS 'AI-extracted structured data: summary, key_changes, claim_restrictions, etc.';
COMMENT ON COLUMN industry_knowledge_nodes.document_url IS 'Direct download URL for the source PDF/DOCX file';
COMMENT ON COLUMN industry_knowledge_nodes.document_type IS 'File type: pdf, docx, html';
COMMENT ON COLUMN industry_knowledge_nodes.effective_date IS 'Legal effective date extracted from document';
COMMENT ON COLUMN industry_knowledge_nodes.parse_status IS 'Document parsing status: pending, parsing, parsed, failed, skipped';

COMMENT ON COLUMN regulation_propagation_log.review_status IS 'Admin review status: pending, approved, rejected, needs_revision';
COMMENT ON COLUMN regulation_propagation_log.reviewed_by IS 'UUID of admin who reviewed this propagation';
COMMENT ON COLUMN regulation_propagation_log.reviewed_at IS 'Timestamp when review was completed';
COMMENT ON COLUMN regulation_propagation_log.review_notes IS 'Notes from admin during review process';
COMMENT ON COLUMN regulation_propagation_log.document_diff IS 'JSON diff between old and new document content';
COMMENT ON COLUMN regulation_propagation_log.ai_confidence_score IS 'AI confidence score for extracted data (0.00-1.00)';