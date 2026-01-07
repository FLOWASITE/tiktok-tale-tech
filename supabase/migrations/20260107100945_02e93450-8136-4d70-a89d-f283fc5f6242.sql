-- Table for Sales Chat Analytics
CREATE TABLE public.sales_chat_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  visitor_id TEXT, -- anonymous visitor tracking
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  message_count INTEGER DEFAULT 0,
  user_message_count INTEGER DEFAULT 0,
  assistant_message_count INTEGER DEFAULT 0,
  
  -- Intent tracking
  detected_intent TEXT, -- discovery, comparing, ready_to_buy, support
  intent_confidence NUMERIC(3,2),
  
  -- Conversion tracking
  cta_clicked TEXT[], -- array of CTA actions clicked
  converted BOOLEAN DEFAULT false,
  conversion_action TEXT, -- REGISTER, PRICING, DEMO, CONTACT
  
  -- Sentiment analysis
  overall_sentiment TEXT, -- positive, neutral, negative
  sentiment_score NUMERIC(3,2), -- -1 to 1
  
  -- Popular questions tracking
  questions_asked TEXT[],
  topics_discussed TEXT[],
  
  -- Objections encountered
  objections TEXT[], -- expensive, will_consider, not_now, competitor
  objections_handled BOOLEAN DEFAULT false,
  
  -- User reactions
  thumbs_up_count INTEGER DEFAULT 0,
  thumbs_down_count INTEGER DEFAULT 0,
  
  -- Metadata
  user_agent TEXT,
  referrer TEXT,
  page_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (public write for anonymous visitors)
ALTER TABLE public.sales_chat_analytics ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for tracking)
CREATE POLICY "Allow anonymous insert on sales_chat_analytics"
ON public.sales_chat_analytics
FOR INSERT
WITH CHECK (true);

-- Allow anonymous updates (for updating session data)
CREATE POLICY "Allow anonymous update on sales_chat_analytics"
ON public.sales_chat_analytics
FOR UPDATE
USING (true);

-- Allow authenticated read for admins
CREATE POLICY "Allow authenticated read on sales_chat_analytics"
ON public.sales_chat_analytics
FOR SELECT
USING (auth.role() = 'authenticated');

-- Create index for querying
CREATE INDEX idx_sales_chat_analytics_session ON public.sales_chat_analytics(session_id);
CREATE INDEX idx_sales_chat_analytics_created ON public.sales_chat_analytics(created_at DESC);
CREATE INDEX idx_sales_chat_analytics_intent ON public.sales_chat_analytics(detected_intent);
CREATE INDEX idx_sales_chat_analytics_converted ON public.sales_chat_analytics(converted);

-- Table for individual message tracking (for popular questions analysis)
CREATE TABLE public.sales_chat_messages_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL, -- user, assistant
  content TEXT NOT NULL,
  
  -- Analysis
  intent_category TEXT, -- question, objection, interest, greeting, other
  topic TEXT, -- pricing, features, industry, integration, support
  sentiment TEXT, -- positive, neutral, negative
  
  -- Reactions
  reactions TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales_chat_messages_log ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts
CREATE POLICY "Allow anonymous insert on sales_chat_messages_log"
ON public.sales_chat_messages_log
FOR INSERT
WITH CHECK (true);

-- Allow authenticated read for admins
CREATE POLICY "Allow authenticated read on sales_chat_messages_log"
ON public.sales_chat_messages_log
FOR SELECT
USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX idx_sales_chat_messages_session ON public.sales_chat_messages_log(session_id);
CREATE INDEX idx_sales_chat_messages_created ON public.sales_chat_messages_log(created_at DESC);
CREATE INDEX idx_sales_chat_messages_topic ON public.sales_chat_messages_log(topic);

-- Updated at trigger
CREATE TRIGGER update_sales_chat_analytics_updated_at
BEFORE UPDATE ON public.sales_chat_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();