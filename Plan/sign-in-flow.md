# Sign-in flow: detailed spec

**Parent doc:** [PRD.md](PRD.md), Epic 1 · **Status:** Draft v1 · **Last updated:** 2026-11-11

---

## 1. Principles

1. **Play first, sign in later.** Nobody has to create an account before logging their first expense.
2. **No passwords, ever.** Users sign in with a 6-digit email code or Google. There's nothing to forget and nothing to leak.
3. **Never lose a save file.** Every flow either keeps the user's data or clearly warns them before anything is discarded.
4. **Built for iPhone first.** Every flow has to work inside the Home Screen app, not only in Safari (see §2).

In game language, an account is a **save file**. Signing in means **"loading your save"**, and making an account means **"saving your progress"**.

## 2. The iPhone catch that shapes this design

On iPhone, **Safari and the Home Screen app keep separate storage.** A user who starts in Safari and then adds the app to their Home Screen opens it to an **empty app**, because their guest session stayed behind in Safari.

The same split breaks **magic links**. Tapping a sign-in link in the Mail app opens **Safari**, not the Home Screen app, so the user ends up signed in in the wrong place.

**What we do about it:**
| Problem | Solution |
|---|---|
| Guest data stuck in Safari | On iPhone Safari, the **first screen is the install guide**, shown *before* onboarding, so most users start inside the Home Screen app. |
| User chooses to stay in Safari anyway | Allowed. When they install later, the guide says: *"Save your progress first so it comes with you."* |
| Magic links open the wrong app | **No magic links.** We email a **6-digit code** that the user types into the app they're already in. iOS 17 and later can autofill codes from Mail. |
| Google sign-in redirect leaving the Home Screen app | Must be tested on a real iPhone in Phase 1. If the redirect lands in Safari, the email code becomes the only option on iPhone. |

## 3. Sign-in methods

| Method | MVP? | Notes |
|---|---|---|
| **Email + 6-digit code** | ✅ Primary | Works everywhere, including inside the Home Screen app. Codes expire after 10 minutes. |
| **Google** | ✅ | One tap for Gmail users. Depends on the redirect test (§2). |
| **Sign in with Apple** | ⏳ Later | The most natural choice on iPhone, but it needs a paid Apple Developer account (US$99/year). Add it once the beta proves people use the app. |
| Password | ❌ Never | — |
| Phone/SMS code | ❌ | Each SMS costs money, and phone-number accounts are vulnerable to SIM-swap takeovers. |

## 4. Flows

### Flow A: First launch (new user)

```
[iPhone Safari, not installed]
  INSTALL GUIDE  "Add to your Home Screen for the full game"
     │  ├─ shows steps: Share ⬆ → "Add to Home Screen"
     │  └─ small link: "Continue in browser"
     ▼
[Home Screen app opens]
  TITLE SCREEN
     ├─ [ PRESS START ]          → new user
     └─ [ CONTINUE ]             → returning user → Flow C
     ▼ (Press Start)
  The app quietly creates a guest account (no screen shown)
     ▼
  ONBOARDING  (currency → categories → budgets)
     ▼
  CREATE YOUR SAVE FILE  ← sign-in step, part of onboarding
     ├─ [ Continue with Google ]
     ├─ [ Continue with email ] → enter email → enter 6-digit code
     └─ "Play as guest"  (small link: "You can save later in Settings")
     ▼
  3-screen tutorial
     ▼
  HUD, with the Add box ready: "Try it: type your last purchase"
```

**Why the sign-in step comes after budget setup and not first:** by then the user has put 60 seconds into setting up their budgets. Asking them to save that work feels natural ("Save your budgets so you never lose them"). Asking for an email on the first screen feels like a wall.

**Acceptance criteria**
- [ ] The **"Create your save file"** step comes right after budget setup. It uses the same screens and logic as Flow B (email code or Google, and the guest account is upgraded in place).
- [ ] If the email already has a save file, the user is told: *"Welcome back! Load your existing save?"* Loading it **replaces** the onboarding they just did (the new guest has no expenses yet, so nothing of value is lost and no conflict screen is needed).
- [ ] "Play as guest" is clearly available but visually secondary. Choosing it continues to the tutorial.
- [ ] If the app detects iPhone Safari without the Home Screen version, it shows the install guide first. Desktop and Android go straight to the Title screen.
- [ ] Creating the guest account takes under 1 second and shows no screen. If it fails (for example offline), the app says: *"Need a connection to start a new game"* with a Retry button.
- [ ] A bot check runs invisibly when the guest account is created, to stop scripted accounts from abusing the AI.
- [ ] The Title screen always offers CONTINUE, so returning users aren't pushed into a new game.

### Flow B: Save your progress (guest → real account)

**When the prompt appears** (the main one is during onboarding, Flow A. These reminders are only for users who chose "Play as guest".)
| Trigger | Style |
|---|---|
| Day 7 as a guest | Full-screen dialogue, can be skipped |
| After the first Level complete screen | Full-screen dialogue, can be skipped |
| User opens Overview with 2+ months of history | Small banner |
| User taps **Add to Home Screen** guidance while still in Safari | Inline warning |
| Settings → "Save your progress" | Always available |
| Later prompts after a skip | At most once every 2 weeks. Never shown during logging. |

```
SAVE YOUR PROGRESS
  "Your save file lives only on this phone.
   Add an email so you never lose it."
     ├─ [ Continue with Google ]
     ├─ [ Continue with email ]
     └─ "Not now"
     ▼ (email)
  ENTER EMAIL  →  [ Send code ]
     ▼
  ENTER CODE   "We sent a 6-digit code to p•••@gmail.com"
     │  6 boxes, iOS autofill from Mail, paste supported
     │  "Resend code" (available after 30s) · "Wrong email?"
     ▼
  ✓ "PROGRESS SAVED!"  (save-file animation + coin sound if sound is on)
     ▼
  Back to where the user was
```

**What happens to the data:** the guest account is **upgraded in place**. It's the same account, and everything stays (expenses, budgets, Savings, streak, XP). Nothing is copied or moved.

**Edge case: that email already has a save file** (for example the user played on another phone before)
```
  "This email already has a save file."
     ┌─────────────────────────────┬─────────────────────────────┐
     │ THIS PHONE (guest)          │ EXISTING SAVE               │
     │ 12 days · 34 expenses       │ 4 months · 210 expenses     │
     │ CA$40 saved                 │ CA$620 saved                │
     └─────────────────────────────┴─────────────────────────────┘
     ├─ [ Load existing save ]   → warns: "This phone's 34 expenses will be deleted." → confirm
     ├─ [ Use a different email ]
     └─ [ Cancel ]
```
- [ ] **No automatic merging in the MVP.** Merging two histories causes duplicates and budget conflicts. The user picks one save file, with a clear side-by-side comparison.
- [ ] Before the guest data is deleted, the user is offered **"Export this phone's expenses (CSV)"**.
- *Later:* "Merge into existing save" that brings the guest's expenses into the existing account.

### Flow C: Returning user on a new phone or after reinstalling

```
TITLE SCREEN → [ CONTINUE ]
     ▼
LOAD YOUR SAVE
     ├─ [ Continue with Google ]
     └─ [ Continue with email ] → enter email → enter code
     ▼
"WELCOME BACK, LEVEL 7!"  (shows Savings total and current streak)
     ▼
HUD for the current month
```
- [ ] If the email has **no** account: *"No save file found for this email."* Options: **Start a new game with this email** (creates an account and goes to onboarding) or **Try another email**.
- [ ] If this phone already has a guest save with data, the conflict screen from Flow B appears.
- [ ] Data loads in under 2 seconds for a year of history (about 2,000 expenses).

### Flow D: Staying signed in

- [ ] Sessions **don't expire through normal use**. They refresh silently in the background, so a user who opens the app every day never sees a sign-in screen.
- [ ] A session ends only if the user signs out, deletes the account, changes their email, or doesn't open the app for **6 months**.
- [ ] Opening the app with an expired session goes to **Load your save** (Flow C), with the email already filled in.
- [ ] Expenses typed offline are queued and sent once the user is signed in again. Nothing is lost.

### Flow E: Sign out

```
Settings → Sign out
  Signed-in user: "Sign out? Your save is safe in your account." → [Sign out] → Title screen
  Guest:          "You haven't saved your progress. Signing out deletes this save file."
                  ├─ [ Save progress first ]  → Flow B
                  ├─ [ Export CSV ]
                  └─ [ Delete and sign out ]  (red, needs a second confirmation)
```
- [ ] Signing out clears all local data and any queued expenses from the phone. If expenses are still waiting to send, the app warns first.

### Flow F: Change email

```
Settings → Account → Change email → enter new email → code sent to NEW email → enter code → done
```
- [ ] A notice goes to the **old** email: *"Your email was changed. Not you? Reply to this email."*
- [ ] Other devices are signed out and have to sign in again with the new email.

### Flow G: Delete account

```
Settings → Account → Delete account
  "This deletes your save file forever: X months, Y expenses, CA$Z in Savings records."
  [ Export CSV first ]  (recommended)
  Type DELETE to confirm → [ Delete forever ]
  → "Game deleted." → Title screen
```
- [ ] Data is removed right away from the app and permanently from backups within 30 days.
- [ ] Guests can do this too, from Settings.
- [ ] The privacy note explains that guest saves that are never saved to an account are **deleted after 6 months without use**.

## 5. Errors and edge cases

| Situation | What the user sees |
|---|---|
| Wrong code | Boxes shake, then: *"That code didn't match. 2 tries left."* |
| 3 wrong codes | *"Too many tries. Get a new code."* The old code stops working. |
| Code expired (after 10 minutes) | *"This code expired."* → [Send new code] |
| No email arrived | After 30 seconds: *"Check spam or Promotions"* + [Resend]. Limit: 5 codes an hour per email. |
| Typo in email (e.g. gmial.com) | *"Did you mean gmail.com?"* |
| Offline during sign-in | *"Need a connection to load your save."* + Retry. Logging still works offline for users who are already signed in. |
| Google sign-in cancelled | Back to the method picker, with no error. |
| Google account email matches an email-code account | Treated as **the same account**, because the email is verified by Google. |
| User is in Safari but already installed the app | Banner: *"Open the app from your Home Screen."* |
| Server down | *"The server is taking a break. Your expenses are safe on this phone and will sync later."* |

## 6. Security basics

- Codes: 6 digits, single use, expire after 10 minutes, a maximum of 3 tries per code, rate-limited per email and per network address.
- Every data request goes through row-level security, so a user can only ever read or write their own records.
- Every AI parsing request needs a valid session (guest or signed in). Limit: 100 entries a day per user.
- Sign-in emails never contain links, only the code. That also makes phishing harder.
- All data is encrypted in transit and at rest.

## 7. Metrics

| Metric | Target |
|---|---|
| iPhone users who start from the Home Screen app (not Safari) | 70% or more |
| New users who create a save file during onboarding | 60% or more |
| Onboarding completion rate (watch whether the sign-in step causes drop-off) | 85% or more |
| Remaining guests who save their progress by the end of their first month | 40% or more |
| Email-code success rate (code sent → signed in) | 90% or more |
| Median time to save progress | Under 30 seconds |
| Sign-in support requests (for example "I lost my data") | 0 in the beta |

## 8. Build notes (Supabase)

- **Guest accounts:** Supabase anonymous sign-ins, with the built-in invisible bot check turned on.
- **Save progress:** link an email or Google identity to the anonymous user, so it's the same user ID and no data moves.
- **Email code:** Supabase email OTP, with the email template set to show only the 6-digit code and no link.
- **Input field:** `autocomplete="one-time-code"` and `inputmode="numeric"` so iOS can autofill the code.
- **Detecting the Home Screen app:** check `window.navigator.standalone` or `matchMedia('(display-mode: standalone)')`.
- **Cleaning up old guests:** a scheduled job deletes anonymous users who haven't opened the app for 6 months.

## 9. Open questions

1. Should Sign in with Apple be in the MVP even though it costs US$99/year? Recommendation: no, add it after the beta.
2. ~~When should the first "Save your progress" prompt appear?~~ **Decided:** during onboarding, right after budget setup, with "Play as guest" as a skip. Guests are reminded on day 7 and after their first month.
3. Should "Play as guest" stay, or should sign-in be required? Recommendation: keep it for now, and remove it if onboarding completion stays at 85% or more and few people choose guest.
