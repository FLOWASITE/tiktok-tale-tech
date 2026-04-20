-- Allow users/admins to update their own telegram_chat_bindings (for Mini App brand switcher)
DROP POLICY IF EXISTS "Users update own bindings" ON public.telegram_chat_bindings;
CREATE POLICY "Users update own bindings"
ON public.telegram_chat_bindings FOR UPDATE
USING (auth.uid() = user_id OR public.is_org_admin(auth.uid(), organization_id))
WITH CHECK (auth.uid() = user_id OR public.is_org_admin(auth.uid(), organization_id));