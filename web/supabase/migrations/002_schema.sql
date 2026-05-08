-- Migration: 002_schema
-- P1-2 through P1-9: Full database schema

-- ============================================================
-- P1-2: users table (mirrors auth.users)
-- ============================================================
CREATE TABLE public.users (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT,
  phone        TEXT,
  name         TEXT NOT NULL DEFAULT '',
  avatar_url   TEXT,
  -- 'both' allows same account to list AND browse
  role         TEXT NOT NULL DEFAULT 'renter'
                 CHECK (role IN ('owner', 'renter', 'both', 'admin')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: auto-create profile row when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, phone, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, ''),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- P1-3: properties table with PostGIS GEOGRAPHY column
-- ============================================================
CREATE TABLE public.properties (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  category       TEXT NOT NULL CHECK (category IN ('rental', 'sale', 'roommates')),
  price          INTEGER NOT NULL,
  rooms          DECIMAL(3,1),
  size_sqm       INTEGER,
  address        TEXT NOT NULL,
  -- Spatial column: GEOGRAPHY stores lon/lat with real-world distance accuracy
  location       GEOGRAPHY(POINT, 4326),
  arnona         INTEGER NOT NULL DEFAULT 0,
  vaad           INTEGER NOT NULL DEFAULT 0,
  entry_date     DATE,
  pets_allowed   BOOLEAN NOT NULL DEFAULT FALSE,
  -- max 10 photos enforced at app layer
  photos         TEXT[] NOT NULL DEFAULT '{}',
  floor          INTEGER,
  parking        BOOLEAN NOT NULL DEFAULT FALSE,
  storage        BOOLEAN NOT NULL DEFAULT FALSE,
  contact_phone  TEXT,
  contact_hours  TEXT,
  status         TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'paused', 'sold')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- P1-4: swipes table
-- ============================================================
CREATE TABLE public.swipes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  direction   TEXT NOT NULL CHECK (direction IN ('left', 'right')),
  -- named swiped_at (not created_at) for clarity in the 10-day recycle cron
  swiped_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, property_id)
);

-- ============================================================
-- P1-5: bot_conversations table
-- ============================================================
CREATE TABLE public.bot_conversations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id      UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  -- Each element: {role: 'user'|'assistant', content: '...', timestamp: ISO}
  messages         JSONB[] NOT NULL DEFAULT '{}',
  status           TEXT NOT NULL DEFAULT 'in_progress'
                     CHECK (status IN ('in_progress', 'approved', 'rejected')),
  rejection_reason TEXT,
  -- track distinguishes which bot prompt to load
  track            TEXT NOT NULL DEFAULT 'rental'
                     CHECK (track IN ('rental', 'sale', 'roommates')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER bot_conversations_updated_at
  BEFORE UPDATE ON public.bot_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- P1-6: leads, favorites, roommate_profiles
-- ============================================================
CREATE TABLE public.leads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id     UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.bot_conversations(id),
  revealed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, property_id)
);

CREATE TABLE public.favorites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, property_id)
);

CREATE TABLE public.roommate_profiles (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  age            INTEGER,
  gender         TEXT,
  bio            TEXT,
  -- free-form interest tags e.g. {'cooking','gaming','sports'}
  interests      TEXT[] NOT NULL DEFAULT '{}',
  smoking        BOOLEAN NOT NULL DEFAULT FALSE,
  has_pets       BOOLEAN NOT NULL DEFAULT FALSE,
  -- e.g. 'early' | 'late' | 'flexible'
  sleep_schedule TEXT,
  -- e.g. 'rarely' | 'sometimes' | 'often'
  guests_policy  TEXT,
  -- 1-5 cleanliness rating (enforced at app layer)
  cleanliness    INTEGER,
  photos         TEXT[] NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- P1-7: Row Level Security policies
-- ============================================================
ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roommate_profiles  ENABLE ROW LEVEL SECURITY;

-- users: each user can only read/write their own row
CREATE POLICY "users_own_row"
  ON public.users FOR ALL
  USING (auth.uid() = id);

-- properties: anyone can read active listings; owners can read/write their own
CREATE POLICY "properties_read_active"
  ON public.properties FOR SELECT
  USING (status = 'active' OR owner_id = auth.uid());

CREATE POLICY "properties_owner_all"
  ON public.properties FOR ALL
  USING (owner_id = auth.uid());

-- swipes: users see/manage only their own swipes
CREATE POLICY "swipes_own"
  ON public.swipes FOR ALL
  USING (user_id = auth.uid());

-- bot_conversations: users see/manage only their own
CREATE POLICY "conversations_own"
  ON public.bot_conversations FOR ALL
  USING (user_id = auth.uid());

-- leads: renter sees their own; property owner sees leads on their properties
CREATE POLICY "leads_renter_own"
  ON public.leads FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "leads_owner_sees"
  ON public.leads FOR SELECT
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

-- favorites: users see/manage only their own
CREATE POLICY "favorites_own"
  ON public.favorites FOR ALL
  USING (user_id = auth.uid());

-- roommate_profiles: users see all profiles (for matching), manage only own
CREATE POLICY "roommate_profiles_read_all"
  ON public.roommate_profiles FOR SELECT
  USING (true);

CREATE POLICY "roommate_profiles_own"
  ON public.roommate_profiles FOR ALL
  USING (user_id = auth.uid());

-- ============================================================
-- P1-9: Indexes for performance
-- ============================================================
-- Filtered queries by category and status
CREATE INDEX idx_properties_category ON public.properties(category);
CREATE INDEX idx_properties_status   ON public.properties(status);
CREATE INDEX idx_properties_owner    ON public.properties(owner_id);

-- Spatial index (GIST) for ST_Within polygon queries
CREATE INDEX idx_properties_location ON public.properties USING GIST(location);

-- Swipe feed: fast lookup of what a user has already swiped
CREATE INDEX idx_swipes_user_property ON public.swipes(user_id, property_id);
-- For 10-day recycle cron: find old left-swipes quickly
CREATE INDEX idx_swipes_swiped_at    ON public.swipes(swiped_at);

-- Bot conversation lookups
CREATE INDEX idx_conversations_user_property
  ON public.bot_conversations(user_id, property_id);

-- ============================================================
-- Polygon search RPC (used by Phase 4 map tool)
-- ============================================================
CREATE OR REPLACE FUNCTION public.properties_in_polygon(
  geojson    TEXT,
  p_category TEXT DEFAULT NULL,
  p_status   TEXT DEFAULT 'active'
)
RETURNS SETOF public.properties
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT *
  FROM public.properties
  WHERE
    ST_Within(
      location::geometry,
      ST_GeomFromGeoJSON(geojson)
    )
    AND (p_category IS NULL OR category = p_category)
    AND status = p_status;
$$;
