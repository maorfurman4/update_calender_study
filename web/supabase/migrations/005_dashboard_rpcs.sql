-- Migration: 005_dashboard_rpcs
-- P8-1: Analytics RPC functions for Owner Dashboard.
--
-- All functions are SECURITY DEFINER + STABLE, so they run as the definer
-- and Postgres can cache plans. The p_owner_id param is always validated
-- against the calling user in the Next.js layer (service-role not used here —
-- RLS still blocks reads, but these functions bypass RLS intentionally for
-- aggregate reads that JOIN multiple tables).

-- ============================================================
-- 1. Per-property KPI aggregates
-- ============================================================
-- Returns one row per property owned by p_owner_id with:
--   total_views    — all swipes (proxy for impressions)
--   right_swipes   — interested swipes
--   conversion_pct — right_swipes / total_views × 100 (0 if no views)
--   bot_started    — number of bot_conversations opened
--   approved_leads — number of leads created (approved conversions)
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
         THEN ROUND(
           COUNT(s.id) FILTER (WHERE s.direction = 'right')::NUMERIC
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

-- ============================================================
-- 2. Daily swipe time series (last N days)
-- ============================================================
-- Used by the recharts LineChart to show right_swipes vs left_swipes per day.
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

-- ============================================================
-- 3. Bot drop-off analysis — JSONB[] parsing in Postgres
-- ============================================================
-- Finds stalled conversations (in_progress + silent for 24+ hours) and
-- extracts the LAST assistant message from each conversation's messages JSONB[]
-- to determine exactly which question caused the user to abandon.
--
-- JSONB[] unnesting:
--   unnest(bc.messages) WITH ORDINALITY AS t(elem, ord)
--   → each elem is a JSONB object {role, content, timestamp}
--   → ord is the 1-based array position (used for ordering)
--
-- We group by (property, last_question) to get a count per drop-off point,
-- enabling the dashboard to show "3 users dropped at the budget question".
CREATE OR REPLACE FUNCTION public.owner_drop_off_stats(p_owner_id UUID)
RETURNS TABLE (
  property_id    UUID,
  property_title TEXT,
  last_question  TEXT,
  drop_count     BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH stalled AS (
    -- Conversations that opened but went silent for > 24 h
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
    -- For each stalled conversation, find the last assistant message.
    -- unnest with ORDINALITY gives us the array index; ORDER BY ord DESC LIMIT 1
    -- picks the most-recent assistant turn.
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
        'פתיחת שיחה (לא נענתה)'   -- user opened bot but sent no reply
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

-- ============================================================
-- 4. Approved leads with renter details (for LeadsTable)
-- ============================================================
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
