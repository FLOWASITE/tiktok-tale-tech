DROP VIEW IF EXISTS public.v_admin_audit_with_user;

CREATE VIEW public.v_admin_audit_with_user
WITH (security_invoker = true) AS
SELECT
  l.id,
  l.created_at,
  l.action,
  l.details,
  l.target_user_id,
  l.admin_id,
  COALESCE(p.full_name, p.email, 'Unknown') AS admin_name,
  p.email AS admin_email
FROM public.admin_audit_logs l
LEFT JOIN public.profiles p ON p.id = l.admin_id;

GRANT SELECT ON public.v_admin_audit_with_user TO authenticated;