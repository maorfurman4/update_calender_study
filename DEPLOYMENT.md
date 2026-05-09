# NADLAN — Deployment Runbook

> **Do this now, in order. Each step must complete before the next.**

---

## Step 1 — Create Remote Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name: `nadlan-production` | Region: **EU West (Ireland)** | Choose a strong DB password — save it
3. Wait for project to finish provisioning (~2 min)
4. Go to **Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret key** → `SUPABASE_SERVICE_ROLE_KEY`

### Run the Schema

5. Go to **SQL Editor** → New query
6. Open `production_schema.sql` (in the repo root), paste the entire contents, click **RUN**
7. Confirm in **Table Editor** that these tables exist: `users`, `properties`, `swipes`, `bot_conversations`, `leads`, `favorites`, `system_settings`, `audit_logs`

### Configure Auth Providers

8. Go to **Authentication → Providers**:
   - **Email**: ensure enabled (for email+password sign-in)
   - **Google**: enable → paste your Google OAuth Client ID & Secret
9. Go to **Authentication → URL Configuration**:
   - **Site URL**: `https://YOUR_VERCEL_DOMAIN.vercel.app`
   - **Redirect URLs**: add `https://YOUR_VERCEL_DOMAIN.vercel.app/auth/callback`

---

## Step 2 — Push Code to GitHub

```bash
# From the repo root (NADLAN_WEB_MAOR)
git remote add origin https://github.com/YOUR_USERNAME/nadlan-web.git
git push -u origin main
```

> If you haven't created the GitHub repo yet: [github.com/new](https://github.com/new) → create `nadlan-web` (private) → copy the remote URL above.

---

## Step 3 — Connect to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import the `nadlan-web` GitHub repository
3. **Framework preset**: Next.js (auto-detected)
4. **Root directory**: `web`
5. **Do NOT click Deploy yet** — set environment variables first (Step 4)

---

## Step 4 — Environment Variables (paste into Vercel Settings)

Go to **Project Settings → Environment Variables** and add every row below.
Set **all environments** (Production + Preview + Development) unless noted.

| Variable | Where to get it |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role (secret) |
| `OPENAI_API_KEY` | platform.openai.com → API Keys |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | console.cloud.google.com → Credentials (Maps JS API + Places API enabled) |
| `RESEND_API_KEY` | resend.com → API Keys |
| `RESEND_FROM_EMAIL` | e.g. `noreply@yourdomain.com` (must be a verified Resend sender) |
| `CRON_SECRET` | Generate: `openssl rand -hex 32` — paste the output |
| `ADMIN_PASSPHRASE` | A strong secret passphrase for the God Mode admin panel |

> **Production only** — do not set in Preview/Development:
> These are all fine to set in all environments for now.

---

## Step 5 — Deploy

1. Click **Deploy** in Vercel
2. Watch the build log — it should take ~90 seconds
3. Build success output will look like:
   ```
   ✓ Compiled successfully
   Route (app)   ƒ /swipe   ƒ /search   ƒ /admin  ...
   ```
4. Visit your production URL and verify:
   - `/swipe` loads (map + swipe deck)
   - `/login` loads (auth form)
   - `/admin/login` loads (admin passphrase form)

---

## Step 6 — Post-Deploy Checklist

- [ ] Open the app on iPhone (Safari) → tap Share → **Add to Home Screen** — verify PWA installs with correct name "נדלן" and brown icon
- [ ] Sign up with a test email account → verify the users table row is created in Supabase
- [ ] Publish a test property via `/owner/new` → verify it appears in `/swipe`
- [ ] Right-swipe a property → verify bot chat opens and streams responses
- [ ] Verify the Vercel Cron job is listed under **Project → Settings → Crons** (appears automatically from `vercel.json`)
- [ ] Test admin panel at `/admin/login` with your `ADMIN_PASSPHRASE`

---

## Environment Variables Quick Reference (`.env.local` template)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AI
OPENAI_API_KEY=sk-proj-...

# Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...

# Email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Security
CRON_SECRET=<output of: openssl rand -hex 32>
ADMIN_PASSPHRASE=<your-chosen-admin-secret>
```

---

*Total time: ~15 minutes. The app is a PWA — users can install it on iOS and Android directly from the browser.*
