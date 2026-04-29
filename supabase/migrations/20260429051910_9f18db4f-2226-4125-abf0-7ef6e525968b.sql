update public.social_connections sc
set organization_id = bt.organization_id
from public.brand_templates bt
where sc.brand_template_id = bt.id
  and sc.organization_id is null
  and bt.organization_id is not null
  and sc.platform = 'blogger'
  and not exists (
    select 1 from public.social_connections sc2
    where sc2.organization_id = bt.organization_id
      and sc2.platform = sc.platform
      and sc2.platform_user_id = sc.platform_user_id
      and sc2.id <> sc.id
  );