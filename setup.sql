-- ============================================================
-- Paylance — complete database setup
--
-- This is the ONLY SQL file you need. Run the whole thing in the
-- Supabase SQL Editor.
--
-- Safe to run as many times as you like: everything is written to
-- create what's missing and skip what already exists. It will not
-- duplicate tables, drop your data, or fail halfway because
-- something was already there.
-- ============================================================


-- ============================================================
-- PART 1 — Accounts and profiles
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  handle TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  bio TEXT,
  category TEXT,
  location TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
CREATE POLICY "Public can view profiles" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Give every new signup a profile row automatically.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ============================================================
-- PART 2 — The things a creator sells
-- Money lives in integer kobo (100 kobo = ₦1). Never naira, never
-- decimals — see lib/money.ts.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price_kobo BIGINT NOT NULL DEFAULT 0,
  cover_image_url TEXT,
  slug TEXT UNIQUE,
  offer_type TEXT DEFAULT 'digital',
  publish_status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date DATE,
  time TEXT,
  location TEXT,
  map_link TEXT,
  price_kobo BIGINT NOT NULL DEFAULT 0,
  cover_image_url TEXT,
  status TEXT DEFAULT 'Upcoming',
  publish_status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  capacity INTEGER,
  attendees_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- If these tables already existed from an older version, add whatever
-- is missing rather than assuming the new shape.
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS price_kobo BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS publish_status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS offer_type TEXT DEFAULT 'digital';

-- Organiser setup, collected across the two screens after the email link.
--   box_office_name  the public brand on tickets and event pages
--   timezone         an event happens at a local time; without this a 9pm
--                    door reads as 8pm to somebody in another region
--   country          where the organiser operates
--   referral_source  how they found us, answered once at signup
--   marketing_opt_out  false means they accepted product email, matching the
--                    opt-OUT checkbox on the form. Stored as given rather than
--                    inverted, so the column and the checkbox never disagree.
--   ticket_pricing_mix  'free' or 'paid' — what they mostly expect to run
--   accepted_use_policy_at  when they agreed to the acceptable use policy.
--                    A timestamp rather than a boolean, because the useful
--                    question later is always WHEN they agreed, and to which
--                    version of the wording.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS box_office_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_source TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marketing_opt_out BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ticket_pricing_mix TEXT
  CHECK (ticket_pricing_mix IS NULL OR ticket_pricing_mix IN ('free', 'paid'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS accepted_use_policy_at TIMESTAMPTZ;

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS price_kobo BIGINT NOT NULL DEFAULT 0;

-- Who absorbs the platform fee, chosen per event by the organiser.
--   false (default) -> taken out of the organiser's share; buyer pays face value
--   true            -> added at checkout; buyer pays it and the organiser
--                      receives the full face value of the ticket
-- Off by default deliberately: a surprise fee at the checkout screen costs
-- conversions, and that trade is the organiser's to make, not ours.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS pass_fee_to_buyer BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS publish_status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS capacity INTEGER;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS attendees_count INTEGER DEFAULT 0;

-- Carry over any prices that were stored in naira by an older version.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='offers' AND column_name='price_naira') THEN
    EXECUTE 'UPDATE public.offers SET price_kobo = ROUND(COALESCE(price_naira,0)*100)
             WHERE price_kobo = 0 AND COALESCE(price_naira,0) <> 0';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='events' AND column_name='price_naira') THEN
    EXECUTE 'UPDATE public.events SET price_kobo = ROUND(COALESCE(price_naira,0)*100)
             WHERE price_kobo = 0 AND COALESCE(price_naira,0) <> 0';
  END IF;

  -- Anything already public under the old flag stays public.
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='offers' AND column_name='is_published') THEN
    EXECUTE 'UPDATE public.offers SET publish_status = ''published''
             WHERE is_published = true AND publish_status = ''draft''';
  END IF;
END $$;

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- The public may only see PUBLISHED items. Creators always see their own.
DROP POLICY IF EXISTS "Public can view published offers" ON public.offers;
CREATE POLICY "Public can view published offers" ON public.offers
  FOR SELECT USING (publish_status = 'published' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own offers" ON public.offers;
CREATE POLICY "Users can manage their own offers" ON public.offers
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view events" ON public.events;
DROP POLICY IF EXISTS "Public can view published events" ON public.events;
CREATE POLICY "Public can view published events" ON public.events
  FOR SELECT USING (publish_status = 'published' OR auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can insert own events" ON public.events;
CREATE POLICY "Creators can insert own events" ON public.events
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can update own events" ON public.events;
CREATE POLICY "Creators can update own events" ON public.events
  FOR UPDATE USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can delete own events" ON public.events;
CREATE POLICY "Creators can delete own events" ON public.events
  FOR DELETE USING (auth.uid() = creator_id);


-- ============================================================
-- PART 3 — Buyers
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audience (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  stage TEXT DEFAULT 'lead',
  total_spent_kobo BIGINT NOT NULL DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  last_offer TEXT,
  first_seen TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now(),
  UNIQUE (creator_id, email)
);

ALTER TABLE public.audience ADD COLUMN IF NOT EXISTS total_spent_kobo BIGINT NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='audience' AND column_name='total_spent') THEN
    EXECUTE 'UPDATE public.audience SET total_spent_kobo = ROUND(COALESCE(total_spent,0)*100)
             WHERE total_spent_kobo = 0 AND COALESCE(total_spent,0) <> 0';
  END IF;
END $$;

ALTER TABLE public.audience ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own audience" ON public.audience;
CREATE POLICY "Users can view their own audience" ON public.audience
  FOR SELECT USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can manage their own audience" ON public.audience;
CREATE POLICY "Users can manage their own audience" ON public.audience
  FOR ALL USING (auth.uid() = creator_id);


-- ============================================================
-- PART 4 — Getting paid
--
-- Paylance NEVER holds creator money. The payment provider splits
-- each payment as it happens and sends the creator's share straight
-- to their own bank. That is why there is no wallet, no balance and
-- no withdrawals anywhere in this schema.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payout_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  provider TEXT NOT NULL DEFAULT 'paystack',
  provider_subaccount_id TEXT,

  bank_code TEXT,
  bank_name TEXT,
  account_name TEXT,
  -- Only the last 4 digits are kept here; the full number stays with
  -- the payment provider.
  account_number_last4 TEXT,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'disabled')),

  -- Fee model per creator, so it can change without a migration.
  --   percentage -> basis points (900 = 9.00%)
  --   flat       -> kobo PER TICKET
  --   banded     -> kobo PER TICKET, chosen by the ticket's own price
  --
  -- Paylance charges a flat fee per paid ticket and no percentage of
  -- revenue. 'banded' is still a flat fee per ticket; there are simply
  -- four of them. platform_fee_value is unused for 'banded' -- the band
  -- table lives in lib/money.ts, so the boundaries stay in one place.
  platform_fee_type TEXT NOT NULL DEFAULT 'banded'
    CHECK (platform_fee_type IN ('percentage', 'flat', 'banded')),
  platform_fee_value INTEGER NOT NULL DEFAULT 20000,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Existing installs: widen the CHECK before anything can be written that
-- would violate it. Dropping by name first keeps this re-runnable -- the
-- constraint is recreated every time, so running setup.sql twice is safe.
ALTER TABLE public.payout_accounts
  DROP CONSTRAINT IF EXISTS payout_accounts_platform_fee_type_check;
ALTER TABLE public.payout_accounts
  ADD CONSTRAINT payout_accounts_platform_fee_type_check
  CHECK (platform_fee_type IN ('percentage', 'flat', 'banded'));

-- Then move the column defaults, then move any account still sitting on a
-- superseded default. A rate that still reads exactly ('percentage', 900)
-- or ('flat', 20000) has never been set by hand, so nothing an operator
-- chose deliberately is overwritten here.
ALTER TABLE public.payout_accounts ALTER COLUMN platform_fee_type SET DEFAULT 'banded';
ALTER TABLE public.payout_accounts ALTER COLUMN platform_fee_value SET DEFAULT 20000;

UPDATE public.payout_accounts
SET platform_fee_type = 'banded'
WHERE (platform_fee_type = 'percentage' AND platform_fee_value = 900)
   OR (platform_fee_type = 'flat' AND platform_fee_value = 20000);


ALTER TABLE public.payout_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators read own payout account" ON public.payout_accounts;
CREATE POLICY "Creators read own payout account" ON public.payout_accounts
  FOR SELECT USING (auth.uid() = creator_id);


-- One ledger for every sale, across offers AND events.
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  reference TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'paystack',
  provider_reference TEXT,

  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  item_type TEXT NOT NULL CHECK (item_type IN ('offer', 'event')),
  offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  item_title TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),

  gross_kobo BIGINT NOT NULL CHECK (gross_kobo >= 0),
  platform_fee_kobo BIGINT NOT NULL DEFAULT 0 CHECK (platform_fee_kobo >= 0),
  provider_fee_kobo BIGINT NOT NULL DEFAULT 0 CHECK (provider_fee_kobo >= 0),
  net_kobo BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'abandoned', 'refunded')),
  -- How the buyer funded it (card, transfer, virtual account).
  -- A funding channel is NOT a payment provider.
  payment_channel TEXT,

  buyer_email TEXT NOT NULL,
  buyer_name TEXT,
  buyer_phone TEXT,

  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT orders_item_present CHECK (
    (item_type = 'offer' AND offer_id IS NOT NULL) OR
    (item_type = 'event' AND event_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS orders_creator_idx ON public.orders(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_event_idx ON public.orders(event_id);
CREATE INDEX IF NOT EXISTS orders_offer_idx ON public.orders(offer_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators read own orders" ON public.orders;
CREATE POLICY "Creators read own orders" ON public.orders
  FOR SELECT USING (auth.uid() = creator_id);


-- Record of money landing in the creator's own bank. Reporting only.
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  provider TEXT NOT NULL DEFAULT 'paystack',
  provider_settlement_id TEXT,

  amount_kobo BIGINT NOT NULL CHECK (amount_kobo >= 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed', 'reversed')),

  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (provider, provider_settlement_id)
);

CREATE INDEX IF NOT EXISTS settlements_creator_idx
  ON public.settlements(creator_id, settled_at DESC);

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators read own settlements" ON public.settlements;
CREATE POLICY "Creators read own settlements" ON public.settlements
  FOR SELECT USING (auth.uid() = creator_id);


-- Every inbound provider event, stored so a replayed event can't be
-- counted twice.
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'paystack',
  provider_event_id TEXT,
  event_type TEXT NOT NULL,
  reference TEXT,
  payload JSONB NOT NULL,
  signature_valid BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS webhook_events_reference_idx ON public.webhook_events(reference);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: server-side only, nothing in a browser reads it.


-- ============================================================
-- PART 4B — Tickets
--
-- An event sells one or more TICKET TYPES ("Early Bird", "GA",
-- "VIP"), each with its own price and its own allocation. A paid
-- order then mints one TICKET per admission — a real row with a
-- unique code that can be scanned at the door.
--
-- `events.price_kobo` stays as the event's "from" price and is
-- maintained automatically from the active tiers, so every screen
-- that already reads it keeps working.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ticket_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  price_kobo BIGINT NOT NULL DEFAULT 0 CHECK (price_kobo >= 0),

  -- NULL means unlimited. `sold_count` only ever moves through the
  -- reserve/release functions below, never with a bare UPDATE.
  quantity INTEGER CHECK (quantity IS NULL OR quantity >= 0),
  sold_count INTEGER NOT NULL DEFAULT 0 CHECK (sold_count >= 0),
  max_per_order INTEGER NOT NULL DEFAULT 10 CHECK (max_per_order > 0),

  sales_start TIMESTAMPTZ,
  sales_end TIMESTAMPTZ,

  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'hidden')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_types_event_idx
  ON public.ticket_types(event_id, sort_order);

ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;

-- Tier names and prices are shop-window information: a buyer has to be
-- able to read them before they have an account.
DROP POLICY IF EXISTS "Public can view ticket types" ON public.ticket_types;
CREATE POLICY "Public can view ticket types" ON public.ticket_types
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Creators manage own ticket types" ON public.ticket_types;
CREATE POLICY "Creators manage own ticket types" ON public.ticket_types
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = ticket_types.event_id AND e.creator_id = auth.uid()
    )
  );


-- One row per admission. This is the thing that gets scanned.
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Short, human-readable and unguessable. Generated in lib/tickets.ts.
  code TEXT NOT NULL UNIQUE,

  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_type_id UUID REFERENCES public.ticket_types(id) ON DELETE SET NULL,

  -- Snapshot of the tier name. A tier deleted later must not blank out
  -- a ticket somebody is holding at the door.
  ticket_type_name TEXT,
  price_kobo BIGINT NOT NULL DEFAULT 0 CHECK (price_kobo >= 0),

  holder_name TEXT,
  holder_email TEXT,

  -- Position within its order: 1, 2, 3... Shown as "2 of 4".
  seat_index INTEGER NOT NULL DEFAULT 1 CHECK (seat_index > 0),

  status TEXT NOT NULL DEFAULT 'valid'
    CHECK (status IN ('valid', 'checked_in', 'void', 'refunded')),

  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- The whole idempotency story for issuance: a replayed webhook
  -- re-inserts the same (order, seat) and is silently ignored.
  UNIQUE (order_id, seat_index)
);

CREATE INDEX IF NOT EXISTS tickets_event_idx ON public.tickets(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tickets_order_idx ON public.tickets(order_id);
CREATE INDEX IF NOT EXISTS tickets_creator_idx ON public.tickets(creator_id);
CREATE INDEX IF NOT EXISTS tickets_status_idx ON public.tickets(event_id, status);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Creators see their own. Buyers reach a ticket by its code through a
-- server route using the service role — a ticket is deliberately NOT
-- publicly listable, or anyone could enumerate an event's admissions.
DROP POLICY IF EXISTS "Creators read own tickets" ON public.tickets;
CREATE POLICY "Creators read own tickets" ON public.tickets
  FOR SELECT USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators update own tickets" ON public.tickets;
CREATE POLICY "Creators update own tickets" ON public.tickets
  FOR UPDATE USING (auth.uid() = creator_id);


-- Which tier an order was for. Orders predating tickets keep NULL.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS ticket_type_id UUID REFERENCES public.ticket_types(id) ON DELETE SET NULL;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tickets_issued_at TIMESTAMPTZ;


-- Every event that predates ticket types gets one tier built from the
-- price and capacity it already had, so nothing in the product is left
-- with an event that cannot sell anything.
INSERT INTO public.ticket_types (event_id, name, price_kobo, quantity, sort_order)
SELECT e.id, 'General Admission', COALESCE(e.price_kobo, 0), e.capacity, 0
FROM public.events e
WHERE NOT EXISTS (
  SELECT 1 FROM public.ticket_types t WHERE t.event_id = e.id
);



-- ============================================================
-- ---- Merchandise sold alongside a ticket -------------------------------
--
-- A T-shirt at a club night, a programme at a theatre run, a drink token.
-- Scoped to ONE event rather than to the organiser, because that is how
-- they are actually sold: at the door of a particular night, from the same
-- checkout as the ticket.
--
-- Deliberately NOT the `offers` table. That one is user-level and belongs
-- to the digital-products product this grew out of; a hoodie for Saturday
-- has an allocation, a size, and an event it dies with.
CREATE TABLE IF NOT EXISTS public.event_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  price_kobo BIGINT NOT NULL DEFAULT 0 CHECK (price_kobo >= 0),
  image_url TEXT,

  -- Sizes, colours, flavours. NULL or empty means the item has no options.
  -- An array rather than a variants table: a stall selling four shirt sizes
  -- does not need a join, and the order line records the chosen string.
  variants TEXT[],

  -- NULL means unlimited. `sold_count` only ever moves through the
  -- reserve/release functions below, never with a bare UPDATE.
  quantity INTEGER CHECK (quantity IS NULL OR quantity >= 0),
  sold_count INTEGER NOT NULL DEFAULT 0 CHECK (sold_count >= 0),
  max_per_order INTEGER NOT NULL DEFAULT 10 CHECK (max_per_order > 0),

  -- Physical goods someone has to hand over at the door; the door screen
  -- shows these so nobody walks off without the shirt they paid for.
  requires_collection BOOLEAN NOT NULL DEFAULT true,

  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'hidden')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_products_event_idx
  ON public.event_products(event_id, sort_order);

-- What merchandise an order actually contained.
--
-- The ticket side of an order stays on `orders` itself, untouched. This is
-- additive: settlement and ticket issuance do not read it, so adding merch
-- cannot break the path that puts a QR code in somebody's inbox.
--
-- unit_price_kobo is copied at purchase rather than joined at read time.
-- The organiser will raise the price next month and last month's receipt
-- must not change with it.
CREATE TABLE IF NOT EXISTS public.order_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.event_products(id) ON DELETE SET NULL,

  -- Kept as text so a receipt still reads correctly after the product row
  -- is edited or deleted.
  name TEXT NOT NULL,
  variant TEXT,

  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_kobo BIGINT NOT NULL CHECK (unit_price_kobo >= 0),

  collected_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_products_order_idx
  ON public.order_products(order_id);

ALTER TABLE public.event_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_products ENABLE ROW LEVEL SECURITY;

-- Buyers can see what is on sale for a published event; only the organiser
-- can change it. Mirrors the ticket_types rules exactly.
DROP POLICY IF EXISTS "Anyone can view products of published events" ON public.event_products;
CREATE POLICY "Anyone can view products of published events" ON public.event_products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_products.event_id
        AND (e.publish_status = 'published' OR e.creator_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Organisers manage their own products" ON public.event_products;
CREATE POLICY "Organisers manage their own products" ON public.event_products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_products.event_id AND e.creator_id = auth.uid()
    )
  );

-- Order lines are readable by the organiser whose event they belong to.
-- Buyers reach their own order through its reference, which the server
-- looks up with the service role.
DROP POLICY IF EXISTS "Organisers see order lines for their events" ON public.order_products;
CREATE POLICY "Organisers see order lines for their events" ON public.order_products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_products.order_id AND o.creator_id = auth.uid()
    )
  );


-- PART 5 — Rules the database enforces itself
-- ============================================================

-- You cannot publish something you charge for until your bank is
-- connected. Enforced here as well as in the app, so it holds even if
-- someone calls the database directly. Free items are allowed through.
CREATE OR REPLACE FUNCTION public.enforce_publish_gate()
RETURNS TRIGGER AS $$
DECLARE
  owner_id UUID;
  item_price BIGINT;
  has_active_account BOOLEAN;
BEGIN
  IF NEW.publish_status <> 'published' THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'events' THEN
    owner_id := NEW.creator_id;
  ELSE
    owner_id := NEW.user_id;
  END IF;

  item_price := COALESCE(NEW.price_kobo, 0);

  -- Free items publish without a bank account — nothing is being sold.
  IF item_price = 0 THEN
    NEW.published_at := COALESCE(NEW.published_at, now());
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.payout_accounts
    WHERE creator_id = owner_id
      AND status = 'active'
      AND provider_subaccount_id IS NOT NULL
  ) INTO has_active_account;

  IF NOT has_active_account THEN
    RAISE EXCEPTION 'Connect a bank account before publishing a paid item'
      USING ERRCODE = 'check_violation';
  END IF;

  NEW.published_at := COALESCE(NEW.published_at, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS events_publish_gate ON public.events;
CREATE TRIGGER events_publish_gate
  BEFORE INSERT OR UPDATE OF publish_status, price_kobo ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_publish_gate();

DROP TRIGGER IF EXISTS offers_publish_gate ON public.offers;
CREATE TRIGGER offers_publish_gate
  BEFORE INSERT OR UPDATE OF publish_status, price_kobo ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_publish_gate();


-- Keep updated_at honest.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_offers_updated_at ON public.offers;
CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


-- Bump an event's attendee count. Called after a payment is confirmed.
-- Revenue is always derived from `orders`, never stored on the event.
CREATE OR REPLACE FUNCTION public.increment_event_attendees(
  p_event_id UUID,
  p_attendees INTEGER
)
RETURNS void AS $$
BEGIN
  UPDATE public.events
  SET attendees_count = COALESCE(attendees_count, 0) + p_attendees,
      updated_at = now()
  WHERE id = p_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.increment_event_stats(UUID, INTEGER, NUMERIC);



-- ---- Ticket inventory -------------------------------------------------
-- Allocation is decided in ONE atomic statement. Two people buying the
-- last ticket at the same moment cannot both win: the UPDATE either
-- matches the availability condition or it doesn't.

CREATE OR REPLACE FUNCTION public.reserve_ticket_inventory(
  p_ticket_type_id UUID,
  p_quantity INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  reserved INTEGER;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RETURN FALSE;
  END IF;

  UPDATE public.ticket_types
  SET sold_count = sold_count + p_quantity,
      updated_at = now()
  WHERE id = p_ticket_type_id
    AND status = 'active'
    AND (sales_start IS NULL OR sales_start <= now())
    AND (sales_end IS NULL OR sales_end >= now())
    AND (quantity IS NULL OR sold_count + p_quantity <= quantity);

  GET DIAGNOSTICS reserved = ROW_COUNT;
  RETURN reserved > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Give the allocation back when a payment fails or is abandoned.
CREATE OR REPLACE FUNCTION public.release_ticket_inventory(
  p_ticket_type_id UUID,
  p_quantity INTEGER
)
RETURNS void AS $$
BEGIN
  UPDATE public.ticket_types
  SET sold_count = GREATEST(0, sold_count - COALESCE(p_quantity, 0)),
      updated_at = now()
  WHERE id = p_ticket_type_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ---- Merchandise inventory --------------------------------------------
--
-- Same shape as the ticket functions above, and for the same reason: two
-- people going for the last shirt at the same moment must not both get it.
-- The decision is the WHERE clause of a single UPDATE, so the database
-- settles it rather than whoever's connection is quicker.
CREATE OR REPLACE FUNCTION public.reserve_product_inventory(
  p_product_id UUID,
  p_quantity INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  reserved INTEGER;
BEGIN
  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RETURN FALSE;
  END IF;

  UPDATE public.event_products
  SET sold_count = sold_count + p_quantity,
      updated_at = now()
  WHERE id = p_product_id
    AND status = 'active'
    AND (quantity IS NULL OR sold_count + p_quantity <= quantity);

  GET DIAGNOSTICS reserved = ROW_COUNT;
  RETURN reserved > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.release_product_inventory(
  p_product_id UUID,
  p_quantity INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.event_products
  SET sold_count = GREATEST(0, sold_count - COALESCE(p_quantity, 0)),
      updated_at = now()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ---- "From" price -----------------------------------------------------
-- events.price_kobo is derived, never typed in. It mirrors the cheapest
-- active tier so existing list and storefront screens keep working
-- without knowing tiers exist.

CREATE OR REPLACE FUNCTION public.sync_event_price_from_tiers()
RETURNS TRIGGER AS $$
DECLARE
  target_event UUID;
  lowest BIGINT;
BEGIN
  target_event := COALESCE(NEW.event_id, OLD.event_id);

  SELECT COALESCE(MIN(price_kobo), 0) INTO lowest
  FROM public.ticket_types
  WHERE event_id = target_event AND status = 'active';

  UPDATE public.events
  SET price_kobo = lowest
  WHERE id = target_event AND price_kobo IS DISTINCT FROM lowest;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ticket_types_sync_event_price ON public.ticket_types;
CREATE TRIGGER ticket_types_sync_event_price
  AFTER INSERT OR UPDATE OF price_kobo, status OR DELETE ON public.ticket_types
  FOR EACH ROW EXECUTE FUNCTION public.sync_event_price_from_tiers();


-- The publish gate reaches tiers too: you cannot bolt a paid tier onto
-- an already-published event to get around the bank-account rule.
CREATE OR REPLACE FUNCTION public.enforce_ticket_type_publish_gate()
RETURNS TRIGGER AS $$
DECLARE
  owner_id UUID;
  event_published BOOLEAN;
  has_active_account BOOLEAN;
BEGIN
  IF COALESCE(NEW.price_kobo, 0) = 0 THEN
    RETURN NEW;
  END IF;

  SELECT e.creator_id, e.publish_status = 'published'
  INTO owner_id, event_published
  FROM public.events e WHERE e.id = NEW.event_id;

  IF NOT COALESCE(event_published, FALSE) THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.payout_accounts
    WHERE creator_id = owner_id
      AND status = 'active'
      AND provider_subaccount_id IS NOT NULL
  ) INTO has_active_account;

  IF NOT has_active_account THEN
    RAISE EXCEPTION 'Connect a bank account before selling a paid ticket type'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ticket_types_publish_gate ON public.ticket_types;
CREATE TRIGGER ticket_types_publish_gate
  BEFORE INSERT OR UPDATE OF price_kobo ON public.ticket_types
  FOR EACH ROW EXECUTE FUNCTION public.enforce_ticket_type_publish_gate();


DROP TRIGGER IF EXISTS update_ticket_types_updated_at ON public.ticket_types;
CREATE TRIGGER update_ticket_types_updated_at BEFORE UPDATE ON public.ticket_types
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tickets_updated_at ON public.tickets;
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();




-- ============================================================
-- PART 6 — Image storage
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('event_covers', 'event_covers', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('offer_covers', 'offer_covers', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to Event Covers" ON storage.objects;
DROP POLICY IF EXISTS "Paylance public read" ON storage.objects;
CREATE POLICY "Paylance public read" ON storage.objects
  FOR SELECT USING (bucket_id IN ('avatars', 'event_covers', 'offer_covers'));

DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload event covers" ON storage.objects;
DROP POLICY IF EXISTS "Paylance authenticated upload" ON storage.objects;
CREATE POLICY "Paylance authenticated upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id IN ('avatars', 'event_covers', 'offer_covers')
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update event covers" ON storage.objects;
DROP POLICY IF EXISTS "Paylance authenticated update" ON storage.objects;
CREATE POLICY "Paylance authenticated update" ON storage.objects
  FOR UPDATE USING (
    bucket_id IN ('avatars', 'event_covers', 'offer_covers')
    AND auth.role() = 'authenticated'
  );


-- ============================================================
-- Done. You should see "Success. No rows returned".
-- ============================================================
