-- Create function to handle assignment notifications
CREATE OR REPLACE FUNCTION public.handle_assignment_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT: notify assignee about new assignment
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, organization_id, type, title, message, data)
    VALUES (
      NEW.assigned_to,
      NEW.organization_id,
      'assignment_created',
      'Nhiệm vụ mới',
      'Bạn được phân công một nhiệm vụ mới cho kênh ' || NEW.channel,
      jsonb_build_object(
        'assignment_id', NEW.id,
        'content_id', NEW.content_id,
        'channel', NEW.channel,
        'priority', NEW.priority,
        'due_date', NEW.due_date
      )
    );
    RETURN NEW;
  END IF;

  -- On UPDATE: notify assignee if status changed
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, organization_id, type, title, message, data)
    VALUES (
      NEW.assigned_to,
      NEW.organization_id,
      'assignment_status_changed',
      'Trạng thái nhiệm vụ thay đổi',
      'Nhiệm vụ của bạn đã chuyển sang trạng thái: ' || NEW.status,
      jsonb_build_object(
        'assignment_id', NEW.id,
        'content_id', NEW.content_id,
        'channel', NEW.channel,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for assignment notifications
DROP TRIGGER IF EXISTS on_assignment_change ON public.content_assignments;
CREATE TRIGGER on_assignment_change
  AFTER INSERT OR UPDATE ON public.content_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_assignment_notification();