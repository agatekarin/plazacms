-- PlazaCMS schema alignment migration
-- Date: 2025-08-25

BEGIN;

-- 1) Ensure uuid-ossp extension is available (safer than manual C functions)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2) Fix product and variant status defaults and allowed values (add 'archived')
-- Products
ALTER TABLE public.products
  ALTER COLUMN status SET DEFAULT 'draft';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'products'
      AND constraint_name = 'products_status_check'
  ) THEN
    ALTER TABLE public.products DROP CONSTRAINT products_status_check;
  END IF;
END$$;

ALTER TABLE public.products
  ADD CONSTRAINT products_status_check CHECK (
    status IN ('published','private','draft','archived')
  );

-- Product Variants
ALTER TABLE public.product_variants
  ALTER COLUMN status SET DEFAULT 'draft';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'product_variants'
      AND constraint_name = 'product_variants_status_check'
  ) THEN
    ALTER TABLE public.product_variants DROP CONSTRAINT product_variants_status_check;
  END IF;
END$$;

ALTER TABLE public.product_variants
  ADD CONSTRAINT product_variants_status_check CHECK (
    status IN ('published','private','draft','archived')
  );

-- 3) Enforce enum-like checks for shipping types
-- shipping_methods.method_type in ('flat_rate','free_shipping','local_pickup','table_rate')
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'shipping_methods'
      AND constraint_name = 'shipping_methods_method_type_check'
  ) THEN
    ALTER TABLE public.shipping_methods DROP CONSTRAINT shipping_methods_method_type_check;
  END IF;
END$$;

ALTER TABLE public.shipping_methods
  ADD CONSTRAINT shipping_methods_method_type_check CHECK (
    method_type IN ('flat_rate','free_shipping','local_pickup','table_rate')
  );

-- shipping_method_rates.rate_type in ('weight','price','item_count')
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'shipping_method_rates'
      AND constraint_name = 'shipping_method_rates_rate_type_check'
  ) THEN
    ALTER TABLE public.shipping_method_rates DROP CONSTRAINT shipping_method_rates_rate_type_check;
  END IF;
END$$;

ALTER TABLE public.shipping_method_rates
  ADD CONSTRAINT shipping_method_rates_rate_type_check CHECK (
    rate_type IN ('weight','price','item_count')
  );

-- 4) Normalize order selections: add FKs for payment/shipping selections while keeping existing text columns for display
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method_id uuid NULL REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shipping_zone_method_id uuid NULL REFERENCES public.shipping_zone_methods(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS carrier_id uuid NULL REFERENCES public.shipping_carriers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_payment_method_id ON public.orders (payment_method_id);
CREATE INDEX IF NOT EXISTS idx_orders_shipping_zone_method_id ON public.orders (shipping_zone_method_id);
CREATE INDEX IF NOT EXISTS idx_orders_carrier_id ON public.orders (carrier_id);

-- 5) Helpful composite and status indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status, payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products (status);
CREATE INDEX IF NOT EXISTS idx_product_variants_status ON public.product_variants (product_id, status);
CREATE INDEX IF NOT EXISTS idx_reviews_product_created ON public.reviews (product_id, created_at DESC);

-- 6) Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach/update triggers for all tables with updated_at: drop-if-exists then create
DO $$
DECLARE
  r RECORD;
  trig_name text;
BEGIN
  FOR r IN (
    SELECT table_schema, table_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'updated_at'
    GROUP BY table_schema, table_name
  ) LOOP
    trig_name := 'trg_set_updated_at_' || r.table_name;
    -- Drop existing trigger if present to keep this migration idempotent
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I;', trig_name, r.table_schema, r.table_name);
    -- Create the trigger
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
                   trig_name, r.table_schema, r.table_name);
  END LOOP;
END$$;

COMMIT;

-- Admin credentials setup (run separately if needed)
-- Note: This block is intentionally placed after COMMIT to avoid wrapping credential seeding in the main transaction.
-- It is idempotent and safe to re-run.
-- Ensure pgcrypto is available for bcrypt hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 7) Add password_hash column for credentials-based auth
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS password_hash text;

-- 8) Seed an admin user (email: admin@local, password: Admin123! - change in production)
-- Create user if not exists
INSERT INTO public.users (id, name, email, role, image, password_hash, created_at, updated_at)
SELECT uuid_generate_v4(), 'Administrator', 'admin@local', 'admin', NULL, crypt('Admin123!', gen_salt('bf')), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM public.users WHERE email = 'admin@local'
);

-- Ensure role and password for the seed user are correct on subsequent runs
UPDATE public.users
SET role = 'admin', password_hash = crypt('Admin123!', gen_salt('bf'))
WHERE email = 'admin@local';
