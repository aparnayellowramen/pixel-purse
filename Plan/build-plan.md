# Build plan

**Parent docs:** [PRD.md](PRD.md) · [sign-in-flow.md](sign-in-flow.md) · **Design reference:** [modern prototype](https://claude.ai/artifact/G4V4iEr2tfkjsuLYqS8EQ8)
**Started:** 2026-11-11 · **Code lives in:** `web/`

---

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| App | **Next.js (App Router) + TypeScript + Tailwind CSS** | One codebase for pages and the server route that calls the AI. Deploys free on Vercel. |
| Fonts | Manrope (text, amounts) + Silkscreen (pixel accents), loaded with `next/font` | Matches the approved prototype. Self-hosted, so no layout shift. |
| Data and auth | **Supabase** (Postgres, anonymous guest accounts, email codes, Google, row-level security) | Covers everything in sign-in-flow.md. The free tier is enough. |
| AI parsing | **Claude Opus 5.5** through the official `@anthropic-ai/sdk`, called only from a server route, with structured outputs | Decision #1. The API key never reaches the browser. |
| Fallback parser | Rule-based TypeScript parser (ported from the prototype) | Used when offline, when the AI fails, and for fast local merchant rules. |
| Tests | Vitest | For the parser and budget calculations, where bugs would cost users trust. |
| Install on iPhone | Web app manifest + service worker (PWA) | §7 of the PRD. |
| Hosting | Vercel | Free, and previews for every change. |

## 2. How we'll build it

**Logic first, local data first.** The budget calculations, parser and screens are built against a small **data-store interface**. The first version of that store saves to the browser, so the app works end to end before any account setup. In Milestone 3 we swap in a Supabase store behind the same interface, and no screens change.

```
web/src/
  app/                 pages (routes) and the /api/parse server route
  components/          UI: HP bar, pixel icon, cards, sheets, toast
  lib/
    domain/            types, budget math, month-end logic   (pure, tested)
    parse/             fallback parser, Claude parser        (tested)
    store/             data-store interface + local and Supabase versions
```

## 3. Milestones

Each milestone ends with something you can open on your iPhone.

### M1 · Foundation and core loop (local data) · ✅ built 2026-11-11
- [x] Set up the project: Next.js 15, TypeScript, Tailwind, Vitest
- [x] Design tokens from the prototype (colors, light and dark mode), fonts, pixel icon component
- [x] Domain logic: categories, expenses, remaining amount, daily pace, bar states. Unit-tested.
- [x] Fallback parser ported from the prototype, with the PRD §8.2 examples as tests (19 tests passing)
- [x] `/api/parse` server route: Claude Opus 5.5 with structured outputs and server-side refusal fallback; uses the rule parser if there's no API key or the call fails
- [ ] Claude path tested with a real API key ← **waiting on your key**
- [x] Main screen: top bar, "left this month" with daily pace, health bars, today's and yesterday's expenses, no-spend day
- [x] Add bar: type, then confirm card, then auto-save, Undo toast
- [x] Browser data store with demo data

**Demo:** type "coffee CA$ 4 at tim hortons" on your phone and watch the Food bar go down.

### M2 · Complete the month (local data) · ✅ built 2026-11-11
- [x] Edit sheet (all fields) and the all-expenses list
- [x] Warnings at 80% and 100%, the rebalance sheet, the fresh-start message
- [x] Merchant rules (learn from corrections, list and delete them in Settings)
- [x] Month end: Level complete screen, leftovers to Savings or Debt, one budget tip. Shown automatically when a month has ended, or from Settings → Simulate month end. Unit-tested.
- [x] Hall of records: tiles, charts, category trends, personal bests, month details
- [x] Settings: sound (muted by default; sound effects pulled forward from M4), where leftovers go, rules, reset to demo data
- [ ] Tap-through test on a real iPhone ← **your check**

### M3 · Accounts and real data (Supabase) · 🟡 mostly built 2026-11-12
- [x] Database tables and row-level security: `supabase/migrations/0001_init.sql`. Verified that a user can't write someone else's save.
- [x] Anonymous guest account when the user taps Get started
- [x] Onboarding: currency, budgets, Create your save file (email code), Play as guest, tutorial
- [x] Load your save (returning users) and sign out. "This email already has a save file" offers to load it.
- [x] Save file synced to Supabase (browser keeps a cache, offline edits push later, the newer version wins if two devices conflict)
- [x] AI route requires a signed-in user (guests count) and falls back to the rule parser after 100 parses a day
- [x] End-to-end test `e2e/guest-flow.mjs`: 14 steps pass in headless Edge
- [x] Email code sign-in tested with a real inbox (2026-11-12). Emails go through Resend's test sender `onboarding@resend.dev`, which only delivers to the Resend account's own email. **Before the beta:** own domain + verified sender in Resend.
- [ ] Google sign-in ← needs a Google Cloud OAuth client
- [x] Delete account with CSV export first and type-DELETE confirmation (`0002_delete_account.sql`, `e2e/delete-account.mjs` 7 steps pass)
- [ ] Daily AI limit tested with a real Claude key

### M4 · iPhone polish · 🟡 core built 2026-11-12
- [x] PWA: manifest, pixel-coin icons (generated in code), standalone mode, status bar, safe areas
- [x] Install guide on iPhone Safari, shown before onboarding (`e2e/install-guide.mjs`)
- [x] Offline: service worker caches the app (production builds only), "Offline" note, expenses logged offline are saved straight away with keyword matching and synced on reconnect (`e2e/offline.mjs`, 6 steps pass). See PRD decision #11.
- [x] Daily reminders (web push): Settings → Daily reminder with a time, skipped on days already logged, Supabase pg_cron calls `/api/reminders/send` every 15 min (`0003_reminders.sql` + one-time setup). Sender and secret checks tested; error handling tested in a browser.
- [ ] Reminder push tested on a real iPhone ← **needs the Vercel deploy**
- [ ] Email reminders for people who don't allow notifications ← needs your own email domain
- [x] Sounds (Web Audio, muted by default), Reduce Motion
- [x] Real iPhone test (2026-11-12): installed from Safari, opens full screen, loaded the save file with an email code, logged an expense, worked in Airplane mode, synced back to the PC
- [ ] VoiceOver pass and contrast check on a real iPhone

### Added from real use (2026-11-12)
- [x] Editable categories: rename, add, remove, change amount and icon, in onboarding and Settings → Budgets. Removing a category with expenses asks where to move them; renamed categories keep keyword matching (stable ids). `e2e/budgets.mjs` 8 steps pass, 6 new unit tests.
- [x] Main screen shows the date clearly ("Thursday, November 12 · 19 days left in November")
- [x] Savings/debt goals always listed last; long category names wrap

### M5 · Beta
- [x] Deploy to Vercel: **https://pixel-purse-two.vercel.app** (2026-11-12). Root directory `web`, auto-deploys on every push to `main`. All 4 browser test suites pass against the live site.
- [ ] Analytics events for the PRD §11 metrics (PostHog)
- [ ] Measure AI accuracy on the 100-entry test set (target: 95% or better)
- [ ] 10 beta users for 2+ weeks, then fix what they find

## 4. What you'll need to set up (only when we get there)

| When | What | Cost |
|---|---|---|
| M1 (optional) | An **Anthropic API key** from console.anthropic.com, saved in `web/.env.local` as `ANTHROPIC_API_KEY`. Without it the app uses the rule-based parser. | Pay as you go, roughly US$0.005 per entry |
| M3 | A free **Supabase** project. I'll tell you which settings to switch on. | Free |
| M3 | A **Google Cloud** OAuth client, for "Continue with Google" | Free |
| M5 | A free **Vercel** account connected to the code | Free |

## 5. Ways of working

- **Commits:** I only commit or push when you ask.
- **Secrets:** API keys live in `.env.local`, which is never committed.
- **Scope:** new ideas go into the PRD's "Later" backlog (§14) unless you decide to swap them for something in the current milestone.
- **Phase 0 (user interviews and the AI test set)** runs alongside M1–M2. Collect real examples of how people type purchases: we need about 100 for the M5 accuracy check.
