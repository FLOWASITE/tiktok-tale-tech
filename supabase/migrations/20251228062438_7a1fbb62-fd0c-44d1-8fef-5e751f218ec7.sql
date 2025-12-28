-- Function to notify users when Industry Pack is upgraded
CREATE OR REPLACE FUNCTION public.notify_industry_upgrade()
RETURNS TRIGGER AS $$
DECLARE
  industry_name TEXT;
BEGIN
  -- Only trigger when version changes and pack is active/stable
  IF OLD.version IS DISTINCT FROM NEW.version AND NEW.is_active = true THEN
    -- Get industry name from translations
    SELECT name INTO industry_name
    FROM industry_template_translations 
    WHERE industry_template_id = NEW.id 
      AND language_code = 'vi' 
    LIMIT 1;
    
    -- Fallback to code if no translation
    IF industry_name IS NULL THEN
      industry_name := NEW.code;
    END IF;
    
    -- Insert notifications for all users whose brands use this industry pack
    INSERT INTO notifications (user_id, organization_id, type, title, message, data)
    SELECT DISTINCT 
      om.user_id,
      om.organization_id,
      'industry_upgrade',
      'Industry Pack đã được nâng cấp',
      'Industry "' || industry_name || '" đã được cập nhật từ v' || COALESCE(OLD.version, '1.0') || ' lên v' || NEW.version,
      jsonb_build_object(
        'industry_template_id', NEW.id,
        'industry_name', industry_name,
        'from_version', COALESCE(OLD.version, '1.0'),
        'to_version', NEW.version,
        'upgrade_url', '/brands'
      )
    FROM brand_templates bt
    JOIN organization_members om ON bt.organization_id = om.organization_id
    WHERE bt.industry_template_id = NEW.id
      AND bt.organization_id IS NOT NULL;
      
    RAISE NOTICE 'Industry upgrade notifications created for % (v% -> v%)', industry_name, OLD.version, NEW.version;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on industry_templates
DROP TRIGGER IF EXISTS on_industry_version_upgrade ON industry_templates;
CREATE TRIGGER on_industry_version_upgrade
  AFTER UPDATE ON industry_templates
  FOR EACH ROW
  EXECUTE FUNCTION notify_industry_upgrade();