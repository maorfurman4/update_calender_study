# NADLAN — Project Tasks

> **State-Machine Protocol:** Complete ONE task → commit → HALT → wait for `/resume` or `Continue`.
> **Language Rule:** All code, variables, comments, and commits in English. UI text in Hebrew only.
> **CSS Rule:** Use CSS Logical Properties (`padding-inline`, `margin-block`). NEVER use `letter-spacing` on Hebrew text.

---

## Phase 0: Project Setup & Configuration

- [x] **P0-1:** Install all required npm packages: `@supabase/supabase-js`, `@supabase/ssr`, `next-intl`, `framer-motion`, `@googlemaps/js-api-loader`, `@turf/turf`, `openai`, `react-hook-form`, `zod`, `@hookform/resolvers`, `lucide-react`, `recharts`
- [x] **P0-2:** Initialize shadcn/ui and add components: `button`, `card`, `input`, `label`, `form`, `dialog`, `scroll-area` — Brown & White theme applied to `globals.css`
- [x] **P0-3:** Create `messages/he.json` — full Hebrew translation file (nav, search, swipe, bot, property fields, auth, owner, admin). Configure `i18n/request.ts`, update `next.config.ts` with next-intl plugin, rewrite `app/layout.tsx` with `lang="he" dir="rtl"`
- [x] **P0-4:** Create `.env.local.example` — documented placeholders for Supabase (URL/anon/service_role), OpenAI, Google Maps (3 APIs), and CRON_SECRET. Fixed `.gitignore` to track `.example` but not `.env.local`
- [x] **P0-5 (merged):** `i18n/request.ts`, `next.config.ts`, `app/layout.tsx` — all completed in P0-3
- [x] **P0-6 (merged):** `app/globals.css` — completed in P0-2
- [x] **P0-7 (merged):** Brown & White CSS variables — completed in P0-2
- [x] **P0-8:** Create `components/shared/Navbar.tsx` (mobile bottom tab bar, logical CSS, no letter-spacing), `components/shared/PageShell.tsx` (fullscreen/scroll modes, pb-16 for nav clearance). Clean `app/page.tsx` → redirect to `/swipe`. Add `app/swipe/page.tsx` placeholder with Brown & White card stack visual

---

## Phase 1: Supabase — Database Schema & RLS

- [x] **P1-1:** Enable PostGIS extension in Supabase. Create `supabase/migrations/001_extensions.sql`
- [x] **P1-2:** Create `users` table (mirrors `auth.users`). Trigger: auto-insert on signup. Role field supports `owner`, `renter`, `both`, `admin`
- [x] **P1-3:** Create `properties` table with spatial `location GEOGRAPHY(POINT)` column, all rental/sale/roommate fields, `photos text[]` (max 10), `status`, `category`
- [x] **P1-4:** Create `swipes` table with `direction`, unique constraint `(user_id, property_id)`, `swiped_at` timestamp for 10-day recycle logic
- [x] **P1-5:** Create `bot_conversations` table: `messages jsonb[]`, `status` (in_progress/approved/rejected), `rejection_reason`, `track` (rental/sale/roommates)
- [x] **P1-6:** Create `leads` table (approved contacts). Create `favorites` table. Create `roommate_profiles` table (interests tags, lifestyle fields)
- [x] **P1-7:** Write all RLS Policies: users (own row), properties (read active OR own), swipes/favorites/leads (own only), owner sees leads on their properties
- [x] **P1-8:** Create Supabase Storage bucket `property-photos` with public read policy. Set 10MB file size limit per image
- [x] **P1-9:** Create DB indexes: `properties(category)`, `properties(status)`, `properties GIST(location)` (spatial index), `swipes(user_id, property_id)`
- [x] **P1-10:** Generate TypeScript types from Supabase schema → `lib/supabase/types.ts`

---

## Phase 2: Supabase — Authentication

- [x] **P2-1:** Create `lib/supabase/client.ts` (browser client) and `lib/supabase/server.ts` (server client with cookie handling)
- [x] **P2-2:** Create `app/(auth)/login/page.tsx` — Hebrew UI, Google OAuth button, Apple OAuth button, Facebook OAuth button, Email+Password form
- [x] **P2-3:** Create `app/(auth)/register/page.tsx` — name, email, password, phone (optional), role selector (owner/renter/both)
- [x] **P2-4:** Create `app/(auth)/forgot-password/page.tsx` + `reset-password/page.tsx`
- [x] **P2-5:** Create `app/auth/callback/route.ts` — handles OAuth redirect from Supabase
- [x] **P2-6:** Create `middleware.ts` at project root — protects `/owner`, `/admin`, `/swipe`, `/favorites` routes. Redirects unauthenticated users to `/login`

---

## Phase 3: Property Listing — Owner Side

- [ ] **P3-1:** Create `app/api/upload/route.ts` — generates Supabase Storage signed upload URL. Validates user is authenticated. Returns public URL
- [ ] **P3-2:** Create `components/shared/ImageUpload.tsx` — drag-and-drop, max 10 images, shows preview, handles upload to Supabase Storage, displays progress bar
- [ ] **P3-3:** Create `app/owner/new/page.tsx` — multi-step form (4 steps):
  - Step 1: Category (rental/sale/roommates), title, description, price
  - Step 2: Address via Google Places Autocomplete → auto-fills lat/lng
  - Step 3: Image upload (up to 10 photos)
  - Step 4: Details (rooms, size, arnona, vaad, entry_date, pets_allowed, floor, parking, storage, contact_phone, contact_hours)
- [ ] **P3-4:** Create `app/owner/listings/page.tsx` — table of owner's properties with status toggle (active/paused), edit, delete actions
- [ ] **P3-5:** Create `app/owner/listings/[id]/edit/page.tsx` — pre-filled edit form reusing Step components from P3-3

---

## Phase 4: Search Page + Google Maps

- [ ] **P4-1:** Create `lib/maps/loader.ts` — loads Google Maps JS API once using `@googlemaps/js-api-loader`
- [ ] **P4-2:** Create `components/search/FilterBar.tsx` — city/area text input, price range slider, room count buttons (1/2/3/4+), category tabs (rental/sale/roommates), available-from date
- [ ] **P4-3:** Create `components/search/MapView.tsx` — renders Google Map, plots property pins, opens mini property card on pin click
- [ ] **P4-4:** Create `components/search/PolygonTool.tsx` — freehand polygon draw mode using Google Maps Drawing Library. On polygon close: calls Supabase RPC `properties_in_polygon(geojson)` using PostGIS `ST_Within`
- [ ] **P4-5:** Create Supabase RPC function `properties_in_polygon` — `ST_Within(location, ST_GeomFromGeoJSON($1))` filtered by category + status
- [ ] **P4-6:** Create `components/search/ListingCard.tsx` — horizontal card with first photo, price, address, rooms, size
- [ ] **P4-7:** Create `app/(main)/search/page.tsx` — combines FilterBar + MapView + PolygonTool + ListingCard list. URL search params sync with filters. "Browse in swipe" CTA button

---

## Phase 5: Swipe UI

- [ ] **P5-1:** Create `components/swipe/SwipeCard.tsx` — full-screen card using `framer-motion`. Tap cycles photos. Scroll reveals details. Green LIKE / Red NOPE overlays. Photo dots indicator
- [ ] **P5-2:** Create `components/swipe/SwipeStack.tsx` — manages card stack (pre-loads next 3 cards). Handles `onSwipeLeft` (write swipe LEFT to DB) and `onSwipeRight` (write swipe RIGHT + open bot). Fetches paginated properties filtered by active user filters, excluding already-swiped
- [ ] **P5-3:** Create `app/(main)/swipe/page.tsx` — renders SwipeStack with filter params from URL. Shows empty state when feed runs out ("אין עוד דירות")
- [ ] **P5-4:** Create Supabase cron / Vercel Cron — daily at 00:00, resets swipes older than 10 days by deleting `direction='left'` rows where `swiped_at < NOW() - INTERVAL '10 days'`

---

## Phase 6: AI Bot Gatekeeper (3 Tracks)

- [ ] **P6-1:** Create `lib/openai/prompts/rental-prompt.ts` — system prompt for rental track. Fixed questions: budget (incl. arnona+vaad), pets, move-in date. Decision: approve → `APPROVED` / reject → `REJECTED: [reason]`
- [ ] **P6-2:** Create `lib/openai/prompts/sales-prompt.ts` — system prompt for sales track. Questions: mortgage pre-approval, eviction timeline. Presents Tabu data (sqm, directions, parking). Decision logic same
- [ ] **P6-3:** Create `lib/openai/prompts/roommates-prompt.ts` — system prompt for roommates track. Questions: sleep schedule, cleanliness level (1-5), smoking, hosting habits, pets. Matches against profile tags
- [ ] **P6-4:** Create `lib/openai/decision-parser.ts` — parses GPT response for `APPROVED` / `REJECTED: reason`. Handles edge cases
- [ ] **P6-5:** Create `app/api/bot/route.ts` — SSE streaming endpoint. Receives `{propertyId, messages, track}`. Loads correct system prompt. Streams GPT-4o response. On `APPROVED`: writes lead to DB, returns WhatsApp deep link. On `REJECTED`: writes rejection + reason
- [ ] **P6-6:** Create `components/bot/BotBubble.tsx` — bottom sheet (mobile) / side panel (desktop). Chat UI with streaming message display. Shows typing indicator. On approval: renders WhatsApp CTA button (`https://wa.me/[phone]?text=[prefilled_message]`). On rejection: shows reason + "חזור לחיפוש" button that navigates back to swipe
- [ ] **P6-7:** Create `components/bot/MessageBubble.tsx` — styled chat bubble (user right, bot left). RTL-aware using CSS logical properties
- [ ] **P6-8:** Wire `BotBubble` into `SwipeStack` — opens automatically on `onSwipeRight`. Saves `bot_conversation` record on open

---

## Phase 7: Favorites & User Profile

- [ ] **P7-1:** Create `app/(main)/favorites/page.tsx` — grid of favorited properties (auto-favorited on right swipe). Unfavorite button. Empty state
- [ ] **P7-2:** Create `app/(main)/profile/page.tsx` — edit name, phone, avatar upload. Role selector. Language toggle (he/en)

---

## Phase 8: Owner Dashboard

- [ ] **P8-1:** Create Supabase DB view or RPC `owner_property_stats` — returns per-property: total_views, right_swipe_count, right_swipe_rate, conversations_started, approved_leads, drop_off_by_question
- [ ] **P8-2:** Create `components/owner/KpiCard.tsx` — single metric card with trend indicator
- [ ] **P8-3:** Create `components/owner/FunnelChart.tsx` — Recharts funnel: Views → Right Swipes → Bot Started → Approved. Shows absolute numbers + percentages
- [ ] **P8-4:** Create `components/owner/DropOffChart.tsx` — bar chart showing which bot question caused the most drop-offs (parsed from `bot_conversations.messages`)
- [ ] **P8-5:** Create `components/owner/LeadsTable.tsx` — paginated table of approved leads: tenant name, phone, timestamp, property
- [ ] **P8-6:** Create `app/owner/dashboard/page.tsx` — combines all dashboard components. Property selector dropdown if owner has multiple listings. Real-time via Supabase Realtime subscription on `leads` table

---

## Phase 9: Admin Panel

- [ ] **P9-1:** Create `middleware.ts` admin guard — checks `users.role = 'admin'`, redirects to `/` if not
- [ ] **P9-2:** Create `app/admin/page.tsx` — platform-wide stats: total users, total properties, total swipes today, total approved leads today
- [ ] **P9-3:** Create `app/admin/users/page.tsx` — searchable user table. Ban/unban toggle. Role editor
- [ ] **P9-4:** Create `app/admin/properties/page.tsx` — all properties table. Remove listing. Mark as verified/featured (boost)

---

## Phase 10: Weekly Summary — Cron + Python

- [ ] **P10-1:** Create `app/api/weekly-summary/route.ts` — Vercel Cron endpoint (runs Sundays 09:00). Protected by `CRON_SECRET` header. Queries last 7 days stats per owner. Calls OpenAI to generate Hebrew summary text. Sends via Twilio WhatsApp
- [ ] **P10-2:** Create `vercel.json` — defines cron schedule: `"schedule": "0 9 * * 0"` pointing to `/api/weekly-summary`
- [ ] **P10-3:** Create `scripts/weekly_summary.py` — standalone Python alternative (for local dev/testing). Uses `supabase-py` + `openai` SDK. Reads same data, generates same summary, prints to stdout

---

## Phase 11: QA & Polish

- [ ] **P11-1:** Audit all components for CSS Logical Properties compliance. Replace any `padding-left/right`, `margin-left/right`, `text-align: left/right` with logical equivalents
- [ ] **P11-2:** Test all 3 auth methods (Google, Apple, Facebook, Email) end-to-end
- [ ] **P11-3:** Test full rental flow: search → swipe → bot → approve → WhatsApp link
- [ ] **P11-4:** Test polygon map filter with PostGIS query
- [ ] **P11-5:** Mobile responsiveness audit (375px, 390px, 430px viewports)
- [ ] **P11-6:** Lighthouse performance audit. Target: Performance > 90, Accessibility > 95
- [ ] **P11-7:** Deploy to Vercel. Set all ENV variables. Verify cron job is active

---

## Key Architecture Decisions (Reference)

| Decision | Choice | Reason |
|----------|--------|--------|
| Image storage | Supabase Storage | Simpler than AWS S3, integrated auth |
| Polygon search | PostGIS ST_Within | Industry standard for geo queries |
| Swipe recycle | 10-day cron delete | Keeps feed fresh without complex state |
| Bot handoff | WhatsApp deep link | No Twilio needed, instant UX |
| Auth providers | Google, Apple, Facebook, Email | Max conversion |
| Single account | role: owner/renter/both | User can list AND browse |
| Weekly summary | Vercel Cron + Twilio | No separate server needed |
