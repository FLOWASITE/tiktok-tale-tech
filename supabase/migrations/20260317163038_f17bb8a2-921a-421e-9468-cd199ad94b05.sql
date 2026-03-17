
-- Create payment_orders table for VNPay transactions
CREATE TABLE public.payment_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  plan_type text NOT NULL,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  amount BIGINT NOT NULL,
  currency text NOT NULL DEFAULT 'VND',
  vnpay_txn_ref text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  vnpay_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

-- RLS: org members can read their org's orders
CREATE POLICY "Org members can view payment orders"
  ON public.payment_orders FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- RLS: authenticated users can insert orders for their orgs
CREATE POLICY "Authenticated users can create payment orders"
  ON public.payment_orders FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) AND auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER set_payment_orders_updated_at
  BEFORE UPDATE ON public.payment_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- Index for lookups
CREATE INDEX idx_payment_orders_org ON public.payment_orders(organization_id);
CREATE INDEX idx_payment_orders_txn_ref ON public.payment_orders(vnpay_txn_ref);
CREATE INDEX idx_payment_orders_status ON public.payment_orders(status);
