-- Add campaign_id to topic_history table
ALTER TABLE topic_history 
ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

CREATE INDEX idx_topic_history_campaign ON topic_history(campaign_id);

-- Add campaign_id to scripts table
ALTER TABLE scripts 
ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

CREATE INDEX idx_scripts_campaign ON scripts(campaign_id);

-- Add campaign_id to carousels table
ALTER TABLE carousels 
ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

CREATE INDEX idx_carousels_campaign ON carousels(campaign_id);