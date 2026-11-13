# Pixel Purse: the app

The Next.js app behind [Pixel Purse](../README.md). Live at **https://pixel-purse-two.vercel.app**.

## Run it locally

```bash
cd web
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:3000
```

| Variable | Needed for | Without it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Accounts and sync | "Get started" can't create an account |
| `ANTHROPIC_API_KEY` | AI parsing with Claude | Entries are parsed with keyword matching |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Push reminders | Reminders can't be turned on |
| `CRON_SECRET` | The scheduled reminder sender | `/api/reminders/send` refuses every call |

Generate push keys with `npx web-push generate-vapid-keys`.

## Database

In a new Supabase project, run the files in [`supabase/migrations`](supabase/migrations) in order in the SQL Editor. Then switch on **anonymous sign-ins**, and set the email templates to show `{{ .Token }}` (a 6-digit code). Reminders also need `pg_cron` and `pg_net`, a `cron_secret` row in `private.settings`, and a cron job that POSTs to `/api/reminders/send` every 15 minutes with that secret. See the comments in `0003_reminders.sql`.

## Checks

```bash
npm run check                 # type check + lint + unit tests
node e2e/guest-flow.mjs       # browser tests (need the dev server and Microsoft Edge)
node e2e/budgets.mjs
node e2e/install-guide.mjs
node e2e/delete-account.mjs
```

Offline and reminder tests need a production build (the service worker is off in development):

```bash
$env:NEXT_DIST_DIR=".next-prod"; npm run build; npx next start --port 3100
$env:BASE_URL="http://localhost:3100"; node e2e/offline.mjs; node e2e/reminders.mjs
```

Set `BASE_URL` to run any browser test against the live site. Each run creates a throwaway guest account.
