-- =============================================================================
-- Migration 006: Admin Features
-- =============================================================================
-- Adds:
--   1. is_banned column on users (soft-ban)
--   2. system_settings table (global kill switch / maintenance mode)
--   3. audit_logs table (immutable action trail for admin operations)
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. Soft-ban flag on users
-- ----------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE;

-- Index so middleware can quickly check banned status (future use)
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON public.users(is_banned) WHERE is_banned = TRUE;

-- ----------------------------------------------------------------------------
-- 2. system_settings — single-row configuration table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
  id                INTEGER PRIMARY KEY DEFAULT 1,
  maintenance_mode  BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Seed the single row (idempotent)
INSERT INTO public.system_settings (id, maintenance_mode)
VALUES (1, FALSE)
ON CONFLICT (id) DO NOTHING;

-- RLS: enabled, but allow anonymous SELECT so middleware can read it
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_settings_public_read"
  ON public.system_settings FOR SELECT
  USING (true);

-- Only service-role can mutate (admin API routes use service-role key)
-- No INSERT/UPDATE policies — service-role bypasses RLS

-- ----------------------------------------------------------------------------
-- 3. audit_logs — append-only admin action trail
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,               -- e.g. 'ban_user', 'delete_property', 'toggle_maintenance'
  target_id   TEXT,                         -- user_id or property_id acted upon (nullable)
  details     JSONB,                        -- freeform context (before/after state, reason, etc.)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-only: no UPDATE/DELETE needed
-- Service-role inserts via admin API routes — no user-level RLS needed
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- No public read; only accessible via service-role in server actions
-- (If you add an admin dashboard RPC later, use SECURITY DEFINER)

-- Fast queries by action type and recency
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at  ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id   ON public.audit_logs(target_id);
