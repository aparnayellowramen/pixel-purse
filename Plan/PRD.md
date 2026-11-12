# PRD: Spending Tracker (working title)

**Status:** ✅ Approved v1.0 (scope locked on 2026-11-11; changes go through the decisions log in §15) · **Build plan:** [build-plan.md](build-plan.md) · **Type:** Side project · **Platform:** Web first, installable on iPhone (PWA) · **Last updated:** 2026-11-11

**Changes in v2:** retro-game visual direction (§6), iPhone-first PWA (§7), and natural-language logging with AI categorization (§8).
**Changes in v3:** decisions made (§15): Claude Opus 5.5, auto-save, calendar months, leftover money goes to Savings, muted by default, and no sign-up wall. New **Overview** page for past months (Epic 6).

---

## 1. Summary

A manual-entry spending tracker that works like a calorie counter, wrapped in an original retro-game look. Each user sets a monthly budget for each category (Food, Shopping, Transport and so on). Logging a purchase means typing it the way you'd say it, for example **"coffee CA$ 4 at tim hortons"**. An AI model works out the amount, merchant and category and files the expense. Each budget shows as a health bar. If a category goes over, the app helps the user cover the gap from other categories and encourages them to do better next month, without shaming them.

**One-line pitch:** *"Type what you spent. We'll handle the rest. Always know what's left."*

## 2. Problem

- Young professionals with their first real salary often reach the end of the month without knowing where the money went.
- People paying off debt need tight control of their spending, but most budgeting tools are either too complex (YNAB's learning curve) or passive (bank-sync apps that show what you spent only after it's gone).
- With passive tracking there's no moment where you think about a purchase. Logging it by hand gives you that moment, but forms are tedious and people stop using them.
- Budgeting apps feel like homework. Nothing about them makes you want to open them.

## 3. Goals and non-goals

**Goals**
1. Logging an expense takes **5 seconds or less** from opening the app, typed as a plain sentence.
2. The AI files expenses into the **right category at least 95% of the time** without the user correcting it.
3. Users can see **how much is left** in every category at a glance.
4. Going over budget leads to a **constructive action** (rebalancing), not guilt.
5. The app is **fun to open**. The retro-game look and the progress mechanics build a logging habit that lasts past 30 days.
6. It feels like a **native app on iPhone**.

**Non-goals (for the MVP)**
- Bank or card sync
- Investment, net-worth, or credit-score tracking
- Shared or household budgets
- A native iOS app from the App Store, or an Android-specific build
- Multi-currency conversion (see §8.5)
- Monetization

## 4. Target users

### Persona A: Priya, 26, "first real paycheck"
- Salaried, rents, eats out often, shops online.
- Wants to start saving but never knows where the money went.
- **Needs:** fast logging, a clear picture of what's left, light accountability, and something that doesn't feel like a spreadsheet.
- **Quote:** *"I'm not broke, I just have no idea where it goes."*

### Persona B: Marcus, 31, "getting out of debt"
- Pays off credit-card debt and a student loan.
- Very motivated, but has to keep every category tight.
- **Needs:** strict category limits, early warnings, and recovery when a month goes wrong rather than giving up.
- **Quote:** *"One bad weekend used to wreck my whole month and I'd just quit tracking."*

> **Design principle that serves both:** progress, not perfection. One bad week should never make someone stop using the app.

## 5. Core concepts

| Concept | Definition | In the game |
|---|---|---|
| **Budget month** | A calendar month (1st to last day). Payday-based months are out of scope for the MVP. | A **level** |
| **Savings** | A special, protected category. At month end, **whatever is left in every spending category moves into Savings**. It builds up month after month and is never reset. | The **treasure chest** |
| **Category** | A named bucket with a monthly limit, such as Food at CA$400. | A **health bar** |
| **Expense** | Amount, currency, category, merchant, date, optional note. | **Damage** to that bar |
| **Remaining** | Category limit minus spending, plus or minus any rebalancing. | **HP left** |
| **Rebalance** | Moving unspent money from one category to cover overspending in another. The total stays the same. | Using a **potion** from another bar |
| **Streak** | Consecutive days with a logged expense or a "No spend today" tap. | **Combo** and **XP** |
| **Month review** | A summary at month end with wins, overspends and one suggested adjustment. | **Level complete** screen |

## 6. Design direction: retro game

### 6.1 Concept
**Decided (after comparing two prototypes): a clean, modern app with pixel accents.** The base is a readable, modern interface with rounded cards, a clear sans-serif font and soft shadows, in both light and dark mode. The game feel comes from small, deliberate touches: original pixel icons, segmented "HP" budget bars, pixel-font labels for level, combo and section titles, coins, stars and the treasure chest. The game theme still carries the core idea: **each budget is a health bar, spending does damage, and the month is a level you're trying to finish.** It just doesn't make the whole app look like a game.

- Chosen prototype: https://claude.ai/artifact/G4V4iEr2tfkjsuLYqS8EQ8
- Rejected alternative (full dark pixel-arcade look): https://claude.ai/artifact/JwMHcTVUGsCEqqAY1nQnmo. It was more distinctive but harder to read, and less reassuring for a money app.

> **Rule:** all art, characters, sounds and names are original. We draw on the *genre* (pixel art, chiptune, HUD-style screens) and never copy a specific game's characters, sprites, music or branding.

### 6.2 Visual system
| Element | Direction |
|---|---|
| **Type** | A modern sans-serif (*Manrope*) for all body text, headings and amounts. Amounts are bold with evenly spaced digits. A pixel font (*Silkscreen*) only for small accents: level, combo, section labels, chart labels. Minimum 16px for inputs. |
| **Palette** | Soft lavender-tinted neutrals, near-black ink for primary buttons, coin gold for savings and the treasure chest, violet for focus and progress. HP colors: green over 50% remaining, amber 20–50%, red under 20%. Full **light and dark mode**, following the phone's setting. |
| **UI chrome** | Rounded cards (about 20px corners) with a light border and soft shadow, pill-shaped chips, bottom sheets with a grab handle, a pill-shaped treasure chest total in the top bar. |
| **Pixel accents** | Original 8×8 pixel icons on soft tiles, segmented "HP" budget bars, pixel stars on the Level complete screen. These are the *only* pixel elements. |
| **Motion** | Short and smooth (under 300ms). The HP bar "ticks down" in steps when you log, the one deliberately pixel-style animation. Everything respects **Reduce Motion**. |
| **Sound** | 8-bit blips: *coin* on save, *hit* when a category passes 80%, *level-up* at month review. **Muted by default** with a toggle in the header, because people log in public. |
| **Haptics** | Not possible in an iPhone PWA (Safari doesn't support the Vibration API). We don't plan for them. |

### 6.3 Screens in game language
| Screen | In the game | What it shows |
|---|---|---|
| Today | **HUD** | All category HP bars, "CA$38/day" pace, today's log, the **Add** input |
| Month | **World map** | Calendar heatmap: each day is a tile, darker means more spending |
| Rebalance | **Inventory** | Pick which bar to take a "potion" from |
| Month review | **Level complete** | Stars for categories kept under budget, coins added to the treasure chest, XP earned, one tip for next level |
| Overview | **Hall of records** | All past months: stars, spending versus budget, savings growth, trends by category, personal bests |
| Settings | **Options** | Sound (muted by default), theme, budgets, reminders, merchant rules, save your progress (for guests) |

### 6.4 Tone (non-negotiable)
The game look must **never punish**. There's no "GAME OVER" and no skull icons.
- Overspending: *"Food took a hit! −CA$45. Grab a potion from Shopping?"*
- Fresh start: *"New strategy unlocked: CA$22/day for the next 9 days. You've got this."*
- Month review: *"Level 3 complete. 4/6 stars. Best run yet on Transport!"*

### 6.5 Accessibility guardrails
- Every color pairing meets WCAG AA contrast. HP state also shows as text (for example "CA$112 left"), never color alone.
- Pixel fonts are used only for headings, numbers and short labels. Body text and inputs use the readable font.
- Supports Dynamic Type-style browser zoom, Reduce Motion, and VoiceOver labels on every bar and button.

## 7. Platform: iPhone-first PWA

The app is a web app built mobile-first for iPhone Safari, then installed with **Share → Add to Home Screen**. It opens full screen with its own icon, like a native app.

| Requirement | Detail |
|---|---|
| **Install prompt** | iOS doesn't show an automatic install prompt. On iPhone Safari, the **first screen is a pixel-art install guide**, shown before onboarding, because Safari and the Home Screen app don't share storage. See [sign-in-flow.md §2](sign-in-flow.md). |
| **Standalone mode** | Web app manifest with `display: standalone`, `apple-touch-icon`, launch screen and theme color matching the palette. |
| **Safe areas** | Layout respects the notch, Dynamic Island and home indicator (`env(safe-area-inset-*)`). |
| **No zoom on input** | All inputs use a font size of 16px or larger so Safari doesn't zoom in when the keyboard opens. |
| **Keyboard** | The Add input stays visible above the keyboard. The iOS keyboard's dictation mic works out of the box, which gives us **voice logging for free**. |
| **Push reminders** | Web push works on iOS 16.4+ **only for apps added to the Home Screen**. Email reminders are the fallback for everyone else. |
| **Offline** | Expenses typed offline are queued locally and sent for parsing when the phone reconnects. |
| **Data safety** | Safari can clear storage for sites people haven't opened recently, so all data lives on the server. The device holds only a cache. |
| **Target** | iOS 17+ Safari. Chrome on Android and desktop browsers should work too, but we don't optimize for them in the MVP. |

## 8. Natural-language logging with AI

### 8.1 How it works
1. The user types into one input: **"coffee CA$ 4 at tim hortons"**.
2. The app sends **only that text**, the user's category names, their home currency and today's date to an AI model through **our own server**.
3. The model returns structured data:
   ```json
   {
     "expenses": [{
       "amount": 4.00,
       "currency": "CAD",
       "merchant": "Tim Hortons",
       "category": "Food",
       "date": "2026-11-11",
       "note": "coffee",
       "confidence": 0.97
     }]
   }
   ```
4. A **confirm card** shows the result in pixel style:
   `☕ CA$4.00 · Food · Tim Hortons · Today   [✓ Save]  [Edit]`
5. **Auto-save (decided):** if confidence is high (0.85 or more), the expense saves automatically after about 1.5 seconds unless the user taps Edit. If confidence is lower, it waits for the user to tap Save. A short "Undo" toast stays on screen for 5 seconds after every auto-save.
6. The Food health bar ticks down and the coin sound plays (if sound is on).

### 8.2 What the parser must handle
| Input | Expected result |
|---|---|
| `coffee CA$ 4 at tim hortons` | CA$4.00, Food, Tim Hortons |
| `uber 18.50` | CA$18.50, Transport, Uber |
| `groceries 62 nofrills yesterday` | CA$62.00, Groceries, No Frills, date = yesterday |
| `lunch 15 and uber home 22` | **Two** expenses: Food CA$15, Transport CA$22 |
| `$40 zara` | CA$40, Shopping, Zara (a bare `$` means home currency) |
| `paid 200 to credit card` | CA$200, Debt payment |
| `4` | Amount only: the user picks the category on the confirm card |
| `hello` / no amount | No expense created: *"I couldn't find an amount. Try 'coffee 4'."* |

### 8.3 It learns from corrections
- If a user changes a category, we save a **merchant → category rule** for that user (for example "Tim Hortons → Coffee").
- The next time that merchant appears, the saved rule overrides the model. That makes results more accurate and personal, and cheaper to run.

### 8.4 Model choice and cost
- **Decided: Claude Opus 5.5 (`claude-opus-5-5`)**, at US$4 per million input tokens and US$20 per million output tokens. Each entry uses about 600 input and 150 output tokens, so about **US$0.005 per entry**. At 5 entries a day, that's roughly **US$0.75 per active user per month**, or about US$7.50 a month for a 10-person beta.
- **When to revisit:** if parse latency misses the p95 target (3 seconds or less) or the monthly AI bill passes a budget you set (for example US$20 a month), test Claude Haiku 5.5 (`claude-haiku-5-5`, about 40× cheaper) on the test set and switch only if it stays at 95% accuracy or better.
- **Implementation notes:**
  - Use **structured outputs**, so the response always matches the JSON schema above. The `category` field is limited to the user's own category list.
  - Use the lowest **effort** setting. This is a simple extraction task, and it keeps responses fast.
  - Keep the system prompt fixed and **cache** it to cut cost and latency.
  - The API key stays **on the server**, in a serverless function. It never ships to the browser.
  - Limit each user to 100 parses a day to protect against abuse and runaway costs.

### 8.5 Currency
- During onboarding the user sets a **home currency** (for example CAD). `CA$`, `C$`, `$` and no symbol at all all mean home currency.
- If an entry names a different currency (for example "€12 croissant paris"), the MVP saves it as entered and shows a "foreign currency" badge. It is **not** included in budget totals until the user enters the amount in home currency. Automatic conversion comes later.

### 8.6 Fallbacks
- **Offline or the API fails:** a simple rule-based parser picks out the number and checks saved merchant rules. The expense saves as "Uncategorized" with a "?" badge for the user to fix later. Logging never fails.
- **Manual mode:** tapping the coin icon opens the classic keypad and category chips (from v1) for anyone who prefers it.

### 8.7 Privacy
- The model sees only the text the user typed, plus category names, home currency and date. It never sees their name, email or spending history.
- A plain-language privacy note explains this during onboarding.

## 9. MVP user stories and acceptance criteria

### Epic 1: Onboarding and budget setup ("New game")
**US-1.** As a new user, I want to start without creating an account.
- [ ] **No sign-up wall on the first screen.** Tapping "Press Start" silently creates an anonymous guest account on the server, so data is stored safely and the AI works right away.
- [ ] **Onboarding includes a "Create your save file" step** right after budget setup. The user signs in with an email (6-digit code, no password) or Google, and the guest account is upgraded in place. They can choose "Play as guest" to skip it.
- [ ] Guests are reminded to save their progress on day 7 and after their first month-end, and the option is always in Settings.
- [ ] Full sign-in flows, edge cases and errors are in **[sign-in-flow.md](sign-in-flow.md)**.
- [ ] Settings shows a persistent "Save your progress" option for guests.
- [ ] Reasons we still need an account behind the scenes are in §15, decision 6.

**US-1a.** As a new user, I want to set up budgets quickly so I can start tracking today.
- [ ] Set home currency (detected from the browser locale, can be changed).
- [ ] Enter monthly take-home income (optional, used to sanity-check budgets).
- [ ] Choose from suggested categories (Food, Groceries, Shopping, Transport, Bills, Entertainment, Debt payment, Other) or add custom ones. Each one gets a pixel icon.
- [ ] Set a monthly limit for each category. The total is shown, and a warning appears if it's more than income.
- [ ] A 3-screen tutorial in game style: "This is your HP. Type what you spend. Keep your bars alive."
- [ ] Onboarding takes **under 2 minutes** and finishes on the HUD with the Add input focused: *"Try it: type your last purchase."*

**US-1b.** As Marcus, I want debt payments treated as their own category so I can see I'm paying them.
- [ ] "Debt payment" is suggested and marked as protected: rebalancing never suggests taking money from it. Debt payments show as a **positive** event ("+XP, debt down!"), not damage.

### Epic 2: Natural-language logging (the core loop)
**US-2.** As a user, I want to type a purchase in my own words and have it filed for me.
- [ ] One text input, always pinned to the bottom of the HUD, with a placeholder that changes ("coffee 4 at tim hortons", "uber 18"…).
- [ ] Pressing Return sends it to the parser. A pixel loading animation shows for no more than 2 seconds.
- [ ] A confirm card shows amount, category, merchant and date. Each one can be tapped to change it.
- [ ] Auto-saves when confidence is high (§8.1). Waits for the user otherwise.
- [ ] Handles several expenses in one entry, relative dates ("yesterday", "on friday") and home-currency symbols (§8.2).
- [ ] **Targets:** median time from opening the app to saving an expense of **5 seconds or less**; AI parse latency of **1.5 seconds or less at p50 and 3 seconds or less at p95**.

**US-2b.** As a user, I want the app to learn my categories.
- [ ] Correcting a category saves a merchant rule. The next entry for that merchant uses the rule (§8.3).
- [ ] Settings → "Merchant rules" lists the saved rules and lets the user delete them.

**US-2c.** As a user with no signal, I still want to log.
- [ ] Offline entries are queued and parsed when the phone reconnects. A failed parse falls back to the rule-based parser (§8.6).

**US-3.** As a user, I want to edit or delete an expense I logged wrong.
- [ ] Tapping any expense opens an edit sheet with **amount, store, note, date (any day this month) and category**. Changes apply only when the user taps "Save changes". Cancel discards them.
- [ ] Saving shows a "Changes saved" toast with Undo. Delete also has an undo toast.
- [ ] Changing the category of an expense that has a store name saves a merchant rule (US-2b), and the sheet says so before saving.
- [ ] If an edit pushes a category over budget, the rebalance sheet opens (US-6).
- [ ] Foreign-currency expenses have an extra "Amount in [home currency]" field. Filling it counts the expense in the budget and keeps the original amount in the note.
- [ ] **All expenses list:** a "See all [month] expenses" button on the HUD opens every expense this month, grouped by day with daily totals and filterable by category. Any row can be tapped to edit it.

### Epic 3: HUD and month views
**US-4.** As a user, I want to see at a glance where I stand.
- [ ] The **HUD** shows each category as a pixel HP bar with the amount left in text.
- [ ] A **"Left this month"** coin total and a **daily pace** figure (for example "CA$38/day to stay on track").
- [ ] Today's log appears below the bars.
- [ ] The **World map** (Month view) shows a calendar heatmap and per-category totals.

### Epic 4: Overspending and rebalancing
**US-5.** As a user, I want to be warned before I go over.
- [ ] At 80% the bar flashes yellow and the "hit" sound plays. At 100% it turns red. Push notification or banner at both points.

**US-6.** As a user who just overspent, I want help covering it so the month isn't ruined.
- [ ] When a category goes over, the **Inventory** opens: "Food took a hit! −CA$45. Grab a potion from:" followed by the categories with the most HP left. Protected categories are never suggested.
- [ ] The user can accept the suggestion, pick categories themselves, or choose "Not now".
- [ ] A rebalance is recorded as a transfer and is visible in the month history.
- [ ] If the user's total budget is overspent, a **"New strategy" (fresh start)** screen offers a reduced daily pace for the rest of the month.

**US-7.** As a user, I want to learn from the month so next month goes better.
- [ ] On the first open of a new month, the **Level complete** screen shows a star for each category kept under budget, XP and streak, categories that overspent, and **one** suggested adjustment the user can accept with one tap.
- [ ] Encouraging copy that compares this month with last month.

**US-7b.** As a user, I want money I didn't spend to count as savings.
- [ ] At month end, the leftover in every spending category moves into **Savings** (the treasure chest), with an animation of coins dropping into the chest: *"+CA$85 saved this level!"*
- [ ] Settings → **"Send leftovers to: Savings / Debt payment"** (default: Savings). If the user picks Debt payment, leftovers are recorded as an extra debt payment and earn debt XP: *"+CA$85 extra toward your debt!"*
- [ ] Categories that went over add nothing. A category that's over is never taken from Savings automatically.
- [ ] Savings builds up over time and never resets. The HUD header **always** shows the treasure chest total.
- [ ] Savings is protected. Rebalancing never suggests it. The user *can* take from it on purpose, after a confirmation: *"Open the treasure chest? This takes CA$40 out of your savings."*
- [ ] Savings is not a spending category: typed expenses are never filed under it.
- [ ] Every month-end transfer is recorded so the Overview can show savings history.

### Epic 5: Habit and progress
**US-8.** As a user, I want reasons to come back every day.
- [ ] Optional daily reminder (push on iOS 16.4+ when installed, email otherwise).
- [ ] A **streak** counts days where the user logged *or* tapped "No spend today". One free **streak shield** a week.
- [ ] **XP** for logging, days without spending, and debt payments. The user's **level** is shown in the header. *(This is purely cosmetic: no leaderboards and no comparing with other people.)*

### Epic 6: Overview of past months ("Hall of records")
**US-9.** As a user, I want to see how I've done month by month so I can tell whether I'm improving.
- [ ] Reached from a trophy icon on the HUD.
- [ ] Shows the user's **full history** with no limit on how far back it goes.
- [ ] **Summary at the top:** total saved so far (treasure chest), months tracked, best month, longest streak.
- [ ] **Month list**, newest first. Each row shows month name, stars earned (for example ★★★★☆☆), total spent versus total budget, amount saved, and an up or down arrow compared with the month before.
- [ ] **Spending trend chart:** a pixel-style bar chart of total spent per month, with the budget as a line. It shows the last 6 months by default and can be scrolled.
- [ ] **Savings chart:** how the treasure chest has grown month by month.
- [ ] **Category trends:** tap a category to see its spending over the months, how often it went over, and its average.
- [ ] **Month detail:** tap a month to open its final state: per-category bars, rebalances made, the Level complete summary, and the full expense list. This is read-only.
- [ ] **Personal bests:** for example "Lowest Food month: CA$280 (Aug)" and "Most saved: CA$310 (Sep)", presented as unlocked badges.
- [ ] Empty state for new users: *"Finish your first level to start your records."*
- [ ] Encouraging framing: worse months are shown plainly, never in alarming red. The emphasis is on the trend.

## 10. Key flows

**Logging (the most important flow)**
`Open app from Home Screen → input is already focused → type "coffee CA$ 4 at tim hortons" → Return → confirm card → auto-save → Food bar ticks down → coin sound`

**Overspend**
`Save → Food goes past 100% → "Food took a hit!" → Inventory → take a potion from Shopping → bars update → "Nice save!"`

**Month end**
`First open of the new month → Level complete screen → leftover coins drop into the treasure chest → accept or skip the tip → (guests: "Save your progress?") → new level starts with full bars`

**Looking back**
`HUD → trophy icon → Hall of records → see the trend → tap a month → that month's details`

## 11. Success metrics

| Type | Metric | Target (first 3 months after launch) |
|---|---|---|
| **North star** | % of weekly active users who log on at least 4 days a week | 40% |
| Activation | % of sign-ups who log 3 or more expenses in their first 48 hours | 60% |
| Speed | Median time from opening the app to saving an expense | 5 seconds or less |
| **AI accuracy** | % of AI-parsed expenses saved **without** a category or amount edit | 95% or more |
| AI latency | Parse latency at p50 / p95 | 1.5s or less / 3s or less |
| AI cost | Model cost per active user per month | Under US$1 |
| Savings | % of users who add something to Savings in a month | 50% |
| Sign-in at start | % of new users who create a save file during onboarding | 60% |
| Overview | % of monthly active users who open the Hall of records at least once a month | 30% |
| Install | % of active iPhone users who add the app to the Home Screen | 50% |
| Retention | Day-30 retention | 25% or more |
| Differentiator | % of overspend events that lead to a rebalance | 50% |
| Outcome | % of users with *less* overspending in their second month than their first | 60% |

## 12. Release plan

| Phase | Scope | Time estimate (evenings and weekends) |
|---|---|---|
| **0: Validate** | Interview 5 people from each persona. Collect about 100 real "how would you type this purchase?" examples, which become the **AI test set**. Make a Figma prototype of the HUD and test the retro look with 5 people: is it fun, and is it readable? | 1–2 weeks |
| **1: Foundation** | Design system (palette, pixel fonts, HP bar, dialogue box), PWA shell installable on iPhone, anonymous guest accounts, budget setup. | 2–3 weeks |
| **2: Core loop** | Natural-language logging with Opus 5.5, confirm card and auto-save, merchant rules, offline queue and fallback parser, HUD and World map. Measure accuracy and latency on the test set. | 3–4 weeks |
| **3: Differentiator** | Warnings, Inventory (rebalancing), fresh start. | 2 weeks |
| **4: Month cycle and habit** | Level complete screen, month-end move into Savings, guest upgrade prompt, **Hall of records (Overview)**, streaks, XP, sound, reminders. | 3–4 weeks |
| **5: Polish and share** | Accessibility pass, light theme, CSV export, landing page, portfolio case study. | 1–2 weeks |

**Launch criteria for the MVP:** you've used it yourself on your iPhone for 2 full months; 10 beta users have used it for at least 2 weeks; AI accuracy is 95% or more on the test set; median logging time is 5 seconds or less; there are no data-loss bugs; and it passes the accessibility contrast checks.

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| **People stop logging** (the biggest risk) | Typing a sentence is faster than filling in a form. Plus the game loop, reminders and a forgiving streak. |
| **The AI picks the wrong category** | Confirm card, a confidence threshold, merchant rules learned from corrections, and an accuracy metric we track. |
| **AI latency makes logging feel slow** (Opus is the most capable model, not the fastest) | Low effort setting, a cached prompt, and a pixel loading animation. Saved merchant rules skip the model entirely. Auto-save means the user doesn't wait to confirm. Haiku is the fallback if p95 goes above 3 seconds (§8.4). |
| **AI costs grow** | Merchant rules bypass the model, a daily limit per user, a monthly spending alert, and Haiku as the fallback. |
| **Anonymous guest endpoint gets abused** | Each guest has a rate limit, there's a bot check on account creation, and the AI route requires a valid session. |
| **Auto-save files a wrong entry unnoticed** | Only high-confidence entries auto-save, there's an Undo toast, and every entry shows in today's log. |
| **The retro look hurts readability** | Pixel fonts only for headings and numbers, AA contrast, and a readable body font. Tested in Phase 0. |
| **The game theme trivializes debt** | Tone rules (§6.4), no "game over", and debt payments shown as positive progress. |
| **iPhone PWA limits** (no install prompt, push only when installed, no haptics) | A custom install guide, email fallback for reminders, and data kept on the server. |
| **Copyright** | Original art and sound only. No references to existing games. |
| Financial data feels sensitive | No bank login, minimal data sent to the model, encryption at rest, export and full account deletion. |
| Scope creep on a side project | The non-goals list is a hard rule. Anything new goes into the "Later" backlog. |

## 14. Later (post-MVP backlog)

Receipt photo scanning (the AI reads the receipt) · voice logging with Siri Shortcuts · automatic currency conversion · recurring expenses · savings goals and a debt-payoff "boss fight" tracker · unlockable themes and pixel avatars · weekly AI insights ("you spend 40% more on weekends") · shared budgets · a native iOS app.

## 15. Decisions log

| # | Question | Decision |
|---|---|---|
| 1 | Which AI model? | **Claude Opus 5.5.** Revisit Haiku 5.5 only if latency or cost targets are missed (§8.4). |
| 2 | Auto-save or tap to confirm? | **Auto-save** for high-confidence entries, with an Undo toast. |
| 3 | Calendar or payday months? | **Calendar month.** |
| 4 | What happens to unspent money? | It **moves into a Savings category** (the treasure chest) at month end (US-7b). |
| 5 | Sound on or off by default? | **Muted** by default. |
| 6 | Do we need a login? | **Yes, but not as a wall.** Sign-in is a step inside onboarding, right after budget setup, and users can skip it as a guest. Guests are reminded on day 7 and after their first month (US-1, [sign-in-flow.md](sign-in-flow.md)). |
| 7 | Can leftovers go toward debt instead of Savings? | **Yes.** A setting lets each user choose "Send leftovers to: Savings / Debt payment". Savings is the default (US-7b). |
| 8 | Show the Savings total on the HUD all the time? | **Yes.** The treasure chest total is always in the HUD header. |
| 9 | Full Overview history for free? | **Yes.** All past months, no limits. |
| 10 | Visual style? | **Modern + pixel accents** (§6.1), chosen over the full dark pixel-arcade look after testing both prototypes. |
| 11 | What happens to expenses typed offline? | **Saved immediately with keyword matching** (shown as "Offline · basic matching") and synced on reconnect, instead of waiting in a queue for the AI. Logging never waits on the network; the user can fix a category in one tap. |

**Why there's still an account behind the scenes (decision 6):**
1. **Data safety on iPhone.** Safari can delete data stored only on the phone, especially for web apps that haven't been opened in a while. Months of history, which the Overview depends on, would be lost.
2. **The AI runs through our server.** Every entry costs money with Opus. Without some identity per user, anyone could flood the endpoint and run up the bill. Rate limits need a user to attach to.
3. **New phone or a second device.** Without an account there's no way to get your history back.

A silent guest account gives the "no login" experience while keeping all three. Users only add an email when they've seen enough value to want to keep it.

## 15b. Open questions

None right now.

## 16. Suggested tech (for a side project)

- **Frontend:** Next.js (React) with Tailwind, set up as a PWA (manifest and service worker). Pixel fonts from Google Fonts. HP bars and dialogue boxes in CSS, with small pixel-art icons as SVG or PNG.
- **Backend and auth:** Supabase (Postgres, auth, row-level security).
- **AI:** a server-side API route calls the Claude API through the official Anthropic TypeScript SDK (`@anthropic-ai/sdk`) with structured outputs. The API key is stored as a server environment variable.
- **Hosting:** Vercel, free tier.
- **Analytics:** PostHog, free tier. Logs parse accuracy, latency and cost per user.
- **Sound:** a few small 8-bit sound effects played with the Web Audio API, only after the user's first tap (iOS requires that).

*Rationale: hosting is nearly free and auth and storage are mostly ready-made, so your time goes into the parts that make this product different: the AI logging and the game feel.*
