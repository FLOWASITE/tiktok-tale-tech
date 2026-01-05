-- Create table to track sent notifications and prevent duplicates
CREATE TABLE public.campaign_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  notification_key TEXT NOT NULL UNIQUE,
  notification_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_notification_logs ENABLE ROW LEVEL SECURITY;

-- Index for fast lookups
CREATE INDEX idx_campaign_notification_logs_key ON public.campaign_notification_logs(notification_key);
CREATE INDEX idx_campaign_notification_logs_campaign ON public.campaign_notification_logs(campaign_id);

-- RLS policies - only service role can insert (from edge function)
CREATE POLICY "Service role can manage notification logs"
ON public.campaign_notification_logs
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger function for real-time KPI target notifications
CREATE OR REPLACE FUNCTION public.check_kpi_target_on_log()
RETURNS TRIGGER AS $$
DECLARE
  campaign_record RECORD;
  goal JSONB;
  metric_key TEXT;
  metric_value NUMERIC;
  target_value NUMERIC;
  notification_key TEXT;
  goal_label TEXT;
BEGIN
  -- Get campaign info
  SELECT * INTO campaign_record FROM public.campaigns WHERE id = NEW.campaign_id;
  
  IF campaign_record IS NULL OR campaign_record.goals IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check each goal
  FOR goal IN SELECT * FROM jsonb_array_elements(campaign_record.goals)
  LOOP
    metric_key := goal->>'metric';
    target_value := (goal->>'target')::NUMERIC;
    goal_label := COALESCE(goal->>'label', metric_key);
    
    -- Get metric value from the new log
    IF NEW.metrics ? metric_key THEN
      metric_value := (NEW.metrics->>metric_key)::NUMERIC;
      
      IF metric_value >= target_value THEN
        notification_key := 'kpi_reached_' || metric_key || '_' || NEW.campaign_id::TEXT;
        
        -- Check if notification already sent
        IF NOT EXISTS (
          SELECT 1 FROM public.campaign_notification_logs 
          WHERE campaign_notification_logs.notification_key = check_kpi_target_on_log.notification_key
        ) THEN
          -- Insert notification
          INSERT INTO public.notifications (user_id, organization_id, type, title, message, data)
          VALUES (
            campaign_record.created_by,
            campaign_record.organization_id,
            CASE WHEN metric_value > target_value THEN 'kpi_target_exceeded' ELSE 'kpi_target_reached' END,
            CASE WHEN metric_value > target_value THEN 'Vượt mục tiêu KPI!' ELSE 'Đạt mục tiêu KPI!' END,
            campaign_record.name || ': ' || goal_label || ' đã đạt ' || metric_value::TEXT || '/' || target_value::TEXT,
            jsonb_build_object(
              'campaign_id', NEW.campaign_id,
              'metric', metric_key,
              'label', goal_label,
              'target', target_value,
              'current', metric_value
            )
          );
          
          -- Log to prevent duplicates
          INSERT INTO public.campaign_notification_logs (campaign_id, notification_key, notification_type)
          VALUES (NEW.campaign_id, notification_key, 
            CASE WHEN metric_value > target_value THEN 'kpi_target_exceeded' ELSE 'kpi_target_reached' END
          );
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on campaign_kpi_logs
CREATE TRIGGER trigger_check_kpi_target
AFTER INSERT ON public.campaign_kpi_logs
FOR EACH ROW
EXECUTE FUNCTION public.check_kpi_target_on_log();