-- Migration: 004_search_preferences
-- P7-1: Add search_preferences JSONB column to users table.
--
-- Stores Yad2-style default filters so users don't re-enter them every session.
-- Shape (enforced at app layer, not DB):
--   {
--     "city":       "תל אביב",        -- free-text city or neighbourhood
--     "minPrice":   5000,              -- monthly ₪ (rental) or sale ₪
--     "maxPrice":   10000,
--     "minRooms":   2,                 -- minimum room count
--     "parking":    true,
--     "elevator":   false,
--     "balcony":    true,
--     "renovated":  false
--   }
--
-- Nullable — null means "no saved preferences, use defaults".

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS search_preferences JSONB;

-- Partial index helps the profile query (equality lookup by id is already PK)
-- No extra index needed — access is always by primary key.
