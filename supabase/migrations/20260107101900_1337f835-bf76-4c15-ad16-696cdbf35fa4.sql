-- Create leads table for capturing interested customers
CREATE TABLE public.sales_chat_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  interest_level TEXT DEFAULT 'medium', -- low, medium, high, very_high
  interested_features TEXT[],
  notes TEXT,
  conversation_summary TEXT,
  source_url TEXT,
  handoff_requested BOOLEAN DEFAULT false,
  handoff_platform TEXT, -- 'zalo', 'messenger', 'phone'
  status TEXT DEFAULT 'new', -- new, contacted, qualified, converted, lost
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales_chat_leads ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts/updates (chatbot needs to save leads)
CREATE POLICY "Allow anonymous insert leads"
  ON public.sales_chat_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update own leads"
  ON public.sales_chat_leads FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read
CREATE POLICY "Authenticated can read leads"
  ON public.sales_chat_leads FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX idx_sales_chat_leads_session ON public.sales_chat_leads(session_id);
CREATE INDEX idx_sales_chat_leads_visitor ON public.sales_chat_leads(visitor_id);
CREATE INDEX idx_sales_chat_leads_status ON public.sales_chat_leads(status);
CREATE INDEX idx_sales_chat_leads_created ON public.sales_chat_leads(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_sales_chat_leads_updated_at
  BEFORE UPDATE ON public.sales_chat_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();