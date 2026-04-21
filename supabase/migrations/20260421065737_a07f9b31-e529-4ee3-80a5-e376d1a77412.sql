-- 1) Remove the colliding BYOB row that hijacks the default bot's username
DELETE FROM public.telegram_bot_configs
WHERE id = '44fcece0-9355-4d53-8078-641ff01b4618'
  AND organization_id = 'bccfec38-79bf-4abe-9f7d-e6c5d3bd35d2'
  AND is_default = false;

-- 2) Trigger to prevent future BYOB rows from colliding with default bot username
CREATE OR REPLACE FUNCTION public.prevent_byob_collision_with_default_bot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NOT NULL AND COALESCE(NEW.is_default, false) = false THEN
    IF EXISTS (
      SELECT 1 FROM public.telegram_bot_configs
      WHERE organization_id IS NULL
        AND is_default = true
        AND bot_username = NEW.bot_username
        AND id <> NEW.id
    ) THEN
      RAISE EXCEPTION 'BYOB bot username "%" trùng với default bot của Flowa. Mỗi BYOB phải dùng bot riêng (tạo bot mới qua @BotFather với username khác).', NEW.bot_username;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_byob_default_collision ON public.telegram_bot_configs;
CREATE TRIGGER trg_prevent_byob_default_collision
  BEFORE INSERT OR UPDATE ON public.telegram_bot_configs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_byob_collision_with_default_bot();