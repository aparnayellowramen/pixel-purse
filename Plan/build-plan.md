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

### M3 · Accounts and real data (Supabase)
- [ ] Database tables and row-level security (users can only see their own data)
- [ ] Anonymous guest account when the user taps Get started
- [ ] Onboarding: currency, budgets, Create your save file (email code, Google), tutorial
- [ ] Load your save (returning users), sign out, delete account
- [ ] Supabase data store replaces the browser store
- [ ] Rate limit of 100 AI parses a day per user

### M4 · iPhone polish
- [ ] PWA: manifest, icons, splash screen, standalone mode, safe areas
- [ ] Install guide on iPhone Safari (shown before onboarding)
- [ ] Offline queue: expenses typed offline are parsed when the phone reconnects
- [ ] Daily reminders: web push for installed apps, email for everyone else
- [ ] Sounds (Web Audio), Reduce Motion, VoiceOver labels, contrast check

### M5 · Beta
- [ ] Deploy to Vercel with a production Supabase project
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
