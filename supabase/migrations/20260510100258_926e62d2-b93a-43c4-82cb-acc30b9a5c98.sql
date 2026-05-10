-- Industry search aliases (synonyms cho tìm kiếm ngành)
CREATE TABLE IF NOT EXISTS public.industry_search_aliases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id UUID NOT NULL REFERENCES public.industry_global_packs(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  language_code TEXT NOT NULL DEFAULT 'vi',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pack_id, alias, language_code)
);

CREATE INDEX IF NOT EXISTS idx_industry_search_aliases_pack ON public.industry_search_aliases(pack_id);
CREATE INDEX IF NOT EXISTS idx_industry_search_aliases_lang ON public.industry_search_aliases(language_code);

ALTER TABLE public.industry_search_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Aliases are public read" ON public.industry_search_aliases;
CREATE POLICY "Aliases are public read"
  ON public.industry_search_aliases
  FOR SELECT
  USING (true);

-- Track recently used industry packs per organization (cap 5)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS last_used_industry_pack_ids UUID[] NOT NULL DEFAULT '{}'::uuid[];

-- RPC để ghi nhận pack đã dùng (push lên đầu, dedupe, cap 5)
CREATE OR REPLACE FUNCTION public.record_industry_pack_use(_org_id UUID, _pack_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_member BOOLEAN;
BEGIN
  -- Verify caller is member of org
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = auth.uid()
  ) INTO _is_member;

  IF NOT _is_member THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  UPDATE public.organizations
  SET last_used_industry_pack_ids = (
    ARRAY[_pack_id] || array_remove(
      COALESCE(last_used_industry_pack_ids, '{}'::uuid[]),
      _pack_id
    )
  )[1:5]
  WHERE id = _org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_industry_pack_use(UUID, UUID) TO authenticated;