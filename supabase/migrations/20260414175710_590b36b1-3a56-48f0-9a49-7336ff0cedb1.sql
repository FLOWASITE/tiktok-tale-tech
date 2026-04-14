-- Add payment_provider column to payment_orders
ALTER TABLE public.payment_orders 
ADD COLUMN IF NOT EXISTS payment_provider TEXT NOT NULL DEFAULT 'vnpay';

-- Make vnpay_txn_ref nullable for payOS orders
ALTER TABLE public.payment_orders 
ALTER COLUMN vnpay_txn_ref DROP NOT NULL;

-- Add default null for vnpay_txn_ref
ALTER TABLE public.payment_orders 
ALTER COLUMN vnpay_txn_ref SET DEFAULT NULL;