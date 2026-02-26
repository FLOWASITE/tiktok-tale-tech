
-- Security Events table for prompt injection logging
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  organization_id UUID REFERENCES public.organizations(id),
  event_type TEXT NOT NULL DEFAULT 'prompt_injection_attempt',
  risk_level TEXT NOT NULL DEFAULT 'low',
  flagged_patterns TEXT[] DEFAULT '{}',
  original_length INTEGER,
  was_truncated BOOLEAN DEFAULT false,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Circuit Breaker Events table for trip logging
CREATE TABLE IF NOT EXISTS public.circuit_breaker_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  failure_count INTEGER NOT NULL DEFAULT 0,
  failure_rate DOUBLE PRECISION DEFAULT 0,
  tripped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  instance_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for security_events (only admins can read)
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read security events"
  ON public.security_events
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert security events"
  ON public.security_events
  FOR INSERT
  WITH CHECK (true);

-- RLS for circuit_breaker_events (only admins can read)
ALTER TABLE public.circuit_breaker_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read circuit breaker events"
  ON public.circuit_breaker_events
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert circuit breaker events"
  ON public.circuit_breaker_events
  FOR INSERT
  WITH CHECK (true);

-- Index for querying recent events
CREATE INDEX idx_security_events_created_at ON public.security_events(created_at DESC);
CREATE INDEX idx_circuit_breaker_events_model ON public.circuit_breaker_events(model, tripped_at DESC);
