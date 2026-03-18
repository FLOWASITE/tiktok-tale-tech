
-- Vouchers table
CREATE TABLE public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL,
  max_uses INTEGER DEFAULT NULL,
  used_count INTEGER DEFAULT 0,
  applicable_plans TEXT[] DEFAULT NULL,
  min_amount NUMERIC DEFAULT 0,
  starts_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Voucher usages table
CREATE TABLE public.voucher_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID REFERENCES public.vouchers(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  payment_order_id UUID REFERENCES public.payment_orders(id),
  discount_amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Updated_at trigger for vouchers
CREATE TRIGGER set_vouchers_updated_at
  BEFORE UPDATE ON public.vouchers
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- Enable RLS
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_usages ENABLE ROW LEVEL SECURITY;

-- RLS: Admin full access to vouchers
CREATE POLICY "Admins full access vouchers"
  ON public.vouchers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: Authenticated users can read active vouchers (for validation)
CREATE POLICY "Users can read active vouchers"
  ON public.vouchers FOR SELECT TO authenticated
  USING (is_active = true);

-- RLS: Admin full access to voucher_usages
CREATE POLICY "Admins full access voucher_usages"
  ON public.voucher_usages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: Users can read their own voucher usages
CREATE POLICY "Users can read own voucher usages"
  ON public.voucher_usages FOR SELECT TO authenticated
  USING (user_id = auth.uid());
