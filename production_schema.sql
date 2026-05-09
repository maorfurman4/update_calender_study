-- =============================================================================
-- NADLAN — Production Schema (single runnable file)
-- =============================================================================
-- Paste this entire file into the Supabase SQL Editor (remote project) and
-- click RUN. It is idempotent: safe to re-run if interrupted.
--
-- Sources: migrations 001–006
-- Generated: 2026-05-09
-- =============================================================================


-- =============================================================================
-- PART 1: Extensions
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- =============================================================================
-- PART 2: Core Schema
-- =============================================================================

-- ----------------------------------------------------------------------------
-- users (mirrors auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT,
  phone               TEXT,
  name                TEXT NOT NULL DEFAULT '',
  avatar_url          TEXT,
  role                TEXT NOT NULL DEFAULT 'renter'
                        CHECK (role IN ('owner', 'renter', 'both', 'admin')),
  is_banned           BOOLEAN NOT NULL DEFAULT FALSE,
  search_preferences  JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_is_banned
  ON public.users(is_banned) WHERE is_banned = TRUE;

-- Auto-create profile on signup
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- properties
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.properties (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  category       TEXT NOT NULL CHECK (category IN ('rental', 'sale', 'roommates')),
  price          INTEGER NOT NULL,
  rooms          DECIMAL(3,1),
  size_sqm       INTEGER,
  address        TEXT NOT NULL,
  location       GEOGRAPHY(POINT, 4326),
  arnona         INTEGER NOT NULL DEFAULT 0,
  vaad           INTEGER NOT NULL DEFAULT 0,
  entry_date     DATE,
  pets_allowed   BOOLEAN NOT NULL DEFAULT FALSE,
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

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS properties_updated_at ON public.properties;
CREATE TRIGGER properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_properties_category ON public.properties(category);
CREATE INDEX IF NOT EXISTS idx_properties_status   ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_owner    ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_location ON public.properties USING GIST(location);

-- ----------------------------------------------------------------------------
-- swipes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.swipes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  direction   TEXT NOT NULL CHECK (direction IN ('left', 'right')),
  swiped_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_swipes_user_property ON public.swipes(user_id, property_id);
CREATE INDEX IF NOT EXISTS idx_swipes_swiped_at     ON public.swipes(swiped_at);

-- ----------------------------------------------------------------------------
-- bot_conversations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bot_conversations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id      UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  messages         JSONB[] NOT NULL DEFAULT '{}',
  status           TEXT NOT NULL DEFAULT 'in_progress'
                     CHECK (status IN ('in_progress', 'approved', 'rejected')),
  rejection_reason TEXT,
  track            TEXT NOT NULL DEFAULT 'rental'
                     CHECK (track IN ('rental', 'sale', 'roommates')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS bot_conversations_updated_at ON public.bot_conversations;
CREATE TRIGGER bot_conversations_updated_at
  BEFORE UPDATE ON public.bot_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_conversations_user_property
  ON public.bot_conversations(user_id, property_id);

-- ----------------------------------------------------------------------------
-- leads
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id     UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.bot_conversations(id),
  revealed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, property_id)
);

-- ----------------------------------------------------------------------------
-- favorites
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.favorites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, property_id)
);

-- ----------------------------------------------------------------------------
-- roommate_profiles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roommate_profiles (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  age            INTEGER,
  gender         TEXT,
  bio            TEXT,
  interests      TEXT[] NOT NULL DEFAULT '{}',
  smoking        BOOLEAN NOT NULL DEFAULT FALSE,
  has_pets       BOOLEAN NOT NULL DEFAULT FALSE,
  sleep_schedule TEXT,
  guests_policy  TEXT,
  cleanliness    INTEGER,
  photos         TEXT[] NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- system_settings (kill switch / maintenance mode)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
  id               INTEGER PRIMARY KEY DEFAULT 1,
  maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO public.system_settings (id, maintenance_mode)
VALUES (1, FALSE)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- audit_logs (append-only admin trail)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  target_id   TEXT,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at  ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id   ON public.audit_logs(target_id);


-- =============================================================================
-- PART 3: Row Level Security
-- =============================================================================

ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roommate_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs         ENABLE ROW LEVEL SECURITY;

-- users
DROP POLICY IF EXISTS "users_own_row" ON public.users;
CREATE POLICY "users_own_row"
  ON public.users FOR ALL USING (auth.uid() = id);

-- properties
DROP POLICY IF EXISTS "properties_read_active" ON public.properties;
CREATE POLICY "properties_read_active"
  ON public.properties FOR SELECT
  USING (status = 'active' OR owner_id = auth.uid());

DROP POLICY IF EXISTS "properties_owner_all" ON public.properties;
CREATE POLICY "properties_owner_all"
  ON public.properties FOR ALL USING (owner_id = auth.uid());

-- swipes
DROP POLICY IF EXISTS "swipes_own" ON public.swipes;
CREATE POLICY "swipes_own"
  ON public.swipes FOR ALL USING (user_id = auth.uid());

-- bot_conversations
DROP POLICY IF EXISTS "conversations_own" ON public.bot_conversations;
CREATE POLICY "conversations_own"
  ON public.bot_conversations FOR ALL USING (user_id = auth.uid());

-- leads
DROP POLICY IF EXISTS "leads_renter_own" ON public.leads;
CREATE POLICY "leads_renter_own"
  ON public.leads FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "leads_owner_sees" ON public.leads;
CREATE POLICY "leads_owner_sees"
  ON public.leads FOR SELECT USING (
    property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())
  );

-- favorites
DROP POLICY IF EXISTS "favorites_own" ON public.favorites;
CREATE POLICY "favorites_own"
  ON public.favorites FOR ALL USING (user_id = auth.uid());

-- roommate_profiles
DROP POLICY IF EXISTS "roommate_profiles_read_all" ON public.roommate_profiles;
CREATE POLICY "roommate_profiles_read_all"
  ON public.roommate_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "roommate_profiles_own" ON public.roommate_profiles;
CREATE POLICY "roommate_profiles_own"
  ON public.roommate_profiles FOR ALL USING (user_id = auth.uid());

-- system_settings: public read (middleware reads it), service-role mutates
DROP POLICY IF EXISTS "system_settings_public_read" ON public.system_settings;
CREATE POLICY "system_settings_public_read"
  ON public.system_settings FOR SELECT USING (true);

-- audit_logs: no public access (service-role only via admin actions)


-- =============================================================================
-- PART 4: Storage Bucket (property photos)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-photos',
  'property-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "property_photos_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "property_photos_auth_upload"  ON storage.objects;
DROP POLICY IF EXISTS "property_photos_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "property_photos_owner_delete" ON storage.objects;

CREATE POLICY "property_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-photos');

CREATE POLICY "property_photos_auth_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'property-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "property_photos_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'property-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "property_photos_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'property-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- =============================================================================
-- PART 5: Analytics RPCs (Owner Dashboard)
-- =============================================================================

-- 1. Per-property KPI aggregates
CREATE OR REPLACE FUNCTION public.owner_property_stats(p_owner_id UUID)
RETURNS TABLE (
  property_id    UUID,
  property_title TEXT,
  total_views    BIGINT,
  right_swipes   BIGINT,
  conversion_pct NUMERIC,
  bot_started    BIGINT,
  approved_leads BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    p.id                                                                AS property_id,
    p.title                                                             AS property_title,
    COUNT(s.id)::BIGINT                                                 AS total_views,
    COUNT(s.id) FILTER (WHERE s.direction = 'right')::BIGINT           AS right_swipes,
    CASE WHEN COUNT(s.id) > 0
         THEN ROUND(COUNT(s.id) FILTER (WHERE s.direction = 'right')::NUMERIC
                    / COUNT(s.id) * 100, 1)
         ELSE 0::NUMERIC
    END                                                                 AS conversion_pct,
    (SELECT COUNT(*) FROM public.bot_conversations bc
       WHERE bc.property_id = p.id)::BIGINT                            AS bot_started,
    (SELECT COUNT(*) FROM public.leads l
       WHERE l.property_id = p.id)::BIGINT                             AS approved_leads
  FROM public.properties p
  LEFT JOIN public.swipes s ON s.property_id = p.id
  WHERE p.owner_id = p_owner_id
  GROUP BY p.id, p.title
  ORDER BY total_views DESC;
$$;

-- 2. Daily swipe time series
CREATE OR REPLACE FUNCTION public.owner_daily_swipes(
  p_owner_id UUID,
  p_days_back INT DEFAULT 30
)
RETURNS TABLE (
  day          DATE,
  right_swipes BIGINT,
  left_swipes  BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    DATE_TRUNC('day', s.swiped_at)::DATE                               AS day,
    COUNT(*) FILTER (WHERE s.direction = 'right')::BIGINT              AS right_swipes,
    COUNT(*) FILTER (WHERE s.direction = 'left')::BIGINT               AS left_swipes
  FROM public.swipes s
  JOIN public.properties p ON p.id = s.property_id
  WHERE p.owner_id = p_owner_id
    AND s.swiped_at > NOW() - (p_days_back || ' days')::INTERVAL
  GROUP BY DATE_TRUNC('day', s.swiped_at)::DATE
  ORDER BY day ASC;
$$;

-- 3. Bot drop-off analysis
CREATE OR REPLACE FUNCTION public.owner_drop_off_stats(p_owner_id UUID)
RETURNS TABLE (
  property_id    UUID,
  property_title TEXT,
  last_question  TEXT,
  drop_count     BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH stalled AS (
    SELECT
      bc.id            AS conv_id,
      bc.property_id,
      bc.messages,
      p.title          AS property_title
    FROM public.bot_conversations bc
    JOIN public.properties p ON p.id = bc.property_id
    WHERE p.owner_id   = p_owner_id
      AND bc.status    = 'in_progress'
      AND bc.updated_at < NOW() - INTERVAL '24 hours'
  ),
  with_last_q AS (
    SELECT
      s.conv_id,
      s.property_id,
      s.property_title,
      COALESCE(
        (
          SELECT LEFT(elem->>'content', 120)
          FROM   unnest(s.messages) WITH ORDINALITY AS t(elem, ord)
          WHERE  elem->>'role' = 'assistant'
          ORDER BY ord DESC
          LIMIT 1
        ),
        'פתיחת שיחה (לא נענתה)'
      ) AS last_question
    FROM stalled s
  )
  SELECT
    wq.property_id,
    wq.property_title,
    wq.last_question,
    COUNT(wq.conv_id)::BIGINT AS drop_count
  FROM with_last_q wq
  GROUP BY wq.property_id, wq.property_title, wq.last_question
  ORDER BY drop_count DESC
  LIMIT 25;
$$;

-- 4. Approved leads with renter contact details
CREATE OR REPLACE FUNCTION public.owner_leads(p_owner_id UUID)
RETURNS TABLE (
  lead_id        UUID,
  property_id    UUID,
  property_title TEXT,
  renter_name    TEXT,
  renter_phone   TEXT,
  renter_email   TEXT,
  revealed_at    TIMESTAMPTZ
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    l.id            AS lead_id,
    p.id            AS property_id,
    p.title         AS property_title,
    u.name          AS renter_name,
    u.phone         AS renter_phone,
    u.email         AS renter_email,
    l.revealed_at
  FROM public.leads l
  JOIN public.properties p ON p.id = l.property_id
  JOIN public.users      u ON u.id = l.user_id
  WHERE p.owner_id = p_owner_id
  ORDER BY l.revealed_at DESC;
$$;


-- =============================================================================
-- PART 6: Polygon Search RPC
-- =============================================================================

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


-- =============================================================================
-- Done. Schema is ready for production.
-- =============================================================================
