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

- [x] **P3-1:** Create `app/api/upload/route.ts` — generates Supabase Storage signed upload URL. Validates user is authenticated. Returns public URL
- [x] **P3-2:** Create `components/shared/ImageUpload.tsx` — drag-and-drop, max 10 images, shows preview, handles upload to Supabase Storage, displays progress bar
- [x] **P3-3:** Create `app/owner/new/page.tsx` — multi-step form (4 steps):
  - Step 1: Category (rental/sale/roommates), title, description, price
  - Step 2: Address via Google Places Autocomplete → auto-fills lat/lng
  - Step 3: Image upload (up to 10 photos)
  - Step 4: Details (rooms, size, arnona, vaad, entry_date, pets_allowed, floor, parking, storage, contact_phone, contact_hours)
- [ ] **P3-4:** Create `app/owner/listings/page.tsx` — table of owner's properties with status toggle (active/paused), edit, delete actions
- [ ] **P3-5:** Create `app/owner/listings/[id]/edit/page.tsx` — pre-filled edit form reusing Step components from P3-3

---

## Phase 4: Search Page + Google Maps

- [x] **P4-1:** Create `lib/maps/loader.ts` — loads Google Maps JS API once using `@googlemaps/js-api-loader`
- [x] **P4-2:** Create `components/search/FilterBar.tsx` — category tabs (rental/sale/roommates), room count buttons (1/2/3/4+), polygon indicator badge, result count
- [x] **P4-3:** Create `components/search/MapView.tsx` — renders Google Map, AdvancedMarkerElement pins, selected highlight, loading spinner overlay
- [x] **P4-4:** Create polygon draw tool inside `MapView.tsx` — DrawingManager in POLYGON mode, turf.polygon() + turf.rewind() GeoJSON conversion, draw/clear buttons
- [x] **P4-5:** Create Supabase RPC function `properties_in_polygon` in `002_schema.sql` — `ST_Within(location::geometry, ST_GeomFromGeoJSON(geojson))` filtered by category + status
- [x] **P4-6:** Create `components/search/ListingCard.tsx` — horizontal card with first photo, price, address, rooms, size, total monthly, selected highlight
- [x] **P4-7:** Create `app/search/page.tsx` — full-viewport map + sliding bottom sheet + FilterBar overlay + ListingCard list. URL search params sync with filters. "גלוש בנכסים" CTA button

---

## Phase 5: Swipe UI

- [x] **P5-1:** Create `components/swipe/SwipeCard.tsx` — full-screen card using `framer-motion`. Drag physics with `useMotionValue` + `useTransform` for rotation. LIKE/PASS overlays fade in proportionally. Photo tap cycles array. Photo dots indicator
- [x] **P5-2:** Create `components/swipe/SwipeDeck.tsx` — manages card stack (3 cards in DOM). Swipe left → `recordSwipe('left')`. Swipe right → `recordSwipe('right')` + `router.push('/bot/[id]')`. Empty state with refresh. Action buttons as alternatives to gestures
- [x] **P5-3:** Create `app/swipe/page.tsx` — Server Component pre-fetches feed via `fetchSwipeFeed`. Passes to SwipeDeck client component. URL params (category, minRooms) forwarded from search page CTA. Skeleton loading state
- [x] **P5-4:** Create `app/api/cron/recycle-swipes/route.ts` — deletes left-swipe rows older than 10 days (service-role, CRON_SECRET auth). `vercel.json` schedules it daily at 00:00 UTC

---

## Phase 6: AI Bot Gatekeeper (3 Tracks)

- [x] **P6-1:** Create `lib/bot/prompts.ts` — `buildSystemPrompt(property)` returns track-specific gatekeeper prompt. Rental: budget/pets/date. Sale: mortgage pre-approval, eviction, financing. Roommates: sleep, cleanliness, smoking, hosting. All tracks instruct LLM to call `approve_candidate` tool, never approve via text
- [x] **P6-2:** *(merged into P6-1)* Sale track prompt in `lib/bot/prompts.ts` — professional consultant persona, Tabu data highlighted
- [x] **P6-3:** *(merged into P6-1)* Roommates track prompt — friendly screener persona, holistic compatibility assessment
- [x] **P6-4:** *(replaced by tool calling)* Approval detection via `approve_candidate` tool invocation — no text parsing needed; structured output eliminates false positives
- [x] **P6-5:** Create `app/api/chat/route.ts` — Vercel AI SDK v6 `streamText` + `convertToModelMessages`. `approve_candidate` tool: updates `bot_conversations.status='approved'` + upserts `leads` row via service-role client. `onFinish` persists messages. Returns `toUIMessageStreamResponse()`
- [x] **P6-6:** Create `components/bot/BotChat.tsx` — `useChat` from `@ai-sdk/react` v3. Full-viewport chat with property header, message list, typing dots, WhatsApp CTA surfaced via `ApprovalCard` in `MessageBubble`. Input disabled after approval
- [x] **P6-7:** Create `components/bot/MessageBubble.tsx` — renders `TextUIPart` as styled bubbles (user inline-end / bot inline-start, RTL logical), tool parts as `ApprovalCard` with WhatsApp deep link
- [x] **P6-8:** `app/bot/[propertyId]/page.tsx` — Server Component: auth check, property fetch, existing-approval redirect, track greeting. Wired to SwipeDeck via `router.push('/bot/[id]')` on right swipe

---

## Phase 7: Favorites & User Profile

- [x] **P7-1:** Create `app/favorites/page.tsx` — 2-column grid of right-swiped properties, each linking to /bot/[id]. Empty state with swipe CTA. Category chip overlay on thumbnail
- [x] **P7-2:** Create `app/profile/page.tsx` — shadcn Tabs: (1) Profile tab: name/phone edit via ProfileForm + Yad2-style SearchPrefsForm (city, price range, rooms, parking/elevator/balcony/renovated toggles); (2) Conversations tab: ConversationList with status badges, track labels, resume/view links. Migration `004_search_preferences.sql` adds `search_preferences JSONB` column to users

---

## Phase 8: Owner Dashboard

- [x] **P8-1:** `005_dashboard_rpcs.sql` — 4 Postgres SECURITY DEFINER RPCs: `owner_property_stats` (views/rights/conversion/bot_started/approved), `owner_daily_swipes` (30-day time series), `owner_drop_off_stats` (JSONB[] unnest CTE to find last assistant message before stall), `owner_leads` (approved leads JOIN users JOIN properties)
- [x] **P8-2:** `components/owner/KpiCard.tsx` — metric card with icon, accent variant (brown bg for approved leads)
- [x] **P8-3:** `components/owner/FunnelChart.tsx` — recharts FunnelChart (v3.8.1) with 4 stages: Views→Right Swipes→Bot Started→Approved. Brown-palette Cell colors
- [x] **P8-4:** `components/owner/DropOffList.tsx` — ranked list of stall points with heat-bar proportional to drop_count. Data from owner_drop_off_stats RPC (JSONB[] parsing in Postgres)
- [x] **P8-5:** `components/owner/LeadsTable.tsx` — approved leads with tel/mailto/WhatsApp deep links per renter. `components/owner/SwipeChart.tsx` — recharts LineChart 30-day right vs left swipes
- [x] **P8-6:** `app/owner/dashboard/page.tsx` — Server Component, parallel 4-RPC fetch, KPI grid, multi-property strip, SwipeChart, FunnelChart (primary property), DropOffList, LeadsTable

---

## Phase 9: Admin Panel

- [x] **P9-1:** Create `supabase/migrations/006_admin_features.sql` — `is_banned` on users, `system_settings` table (kill switch), `audit_logs` table. Updated `middleware.ts`: isolated httpOnly cookie guard for `/admin`, kill-switch maintenance check for all routes, 30-second module-level cache. `lib/admin/auth.ts` — Edge-compatible HMAC-SHA-256 cookie signing via `crypto.subtle`. `app/admin/login/page.tsx` — isolated passphrase login form. `app/api/admin/auth/route.ts` + `app/api/admin/logout/route.ts`
- [x] **P9-2:** Create `app/admin/page.tsx` — platform-wide KPI grid (StatsGrid), Kill Switch toggle (KillSwitch client component), nav tiles to sub-pages, recent audit log (last 20 entries)
- [x] **P9-3:** Create `app/admin/users/page.tsx` + `components/admin/UsersTable.tsx` — searchable user table, ban/unban actions via server actions, fresh-fetch after mutation
- [x] **P9-4:** Create `app/admin/properties/page.tsx` + `components/admin/PropertiesTable.tsx` — all properties table, delete action with confirm dialog, owner name JOIN, status badge

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
