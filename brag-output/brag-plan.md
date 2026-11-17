# Pixel Purse: brag plan

## The questions
- **What is it?** A spending tracker you log by typing what you spent in plain words; each budget is a health bar.
- **Who's it for?** Young professionals who don't know where their money goes, and people paying off debt.
- **What sets it apart?** No forms: "coffee CA$ 4 at tim hortons" files itself. Game feel without punishment: going over budget leads to a fix, not a "game over".
- **Most impressive or funniest claim?** Your budget literally has HP, and it takes damage when you shop.
- **Visual hook:** a giant segmented health bar labelled *Shopping* taking a hit: −CA$188, from green to red, with a shake.
- **Real UI to show:** the main screen (bars, left this month, daily pace), typing an entry and the confirm card auto-saving, the "Shopping took a hit" panel and covering from Groceries, then Level complete with stars and treasure-chest loot.
- **Tone:** `default` (punchy, playful, clean), with mobile-game flavour from the app's own pixel accents.
- **Share caption:** "I built a budget app where your budgets are health bars. Type what you spend; it takes the hit."

Data shown is the app's own demo save file (fictional). No real names, emails or account data.

## Angle
**"Your budget has HP."** Open on the joke being literal, then prove it with the real app: type, take damage, heal, loot.

## Visual identity
- Stage: deep ink `#121018` with a faint pixel-dot grid. The phone shows the app in its real light theme (tokens from `web/src/app/globals.css`).
- Type: Manrope 800 for headlines and amounts, Silkscreen for pixel labels, both as the app uses them.
- Accents: coin gold `#eea010`, HP green `#1c9f54`, amber `#c98204`, red `#dc3f49`, violet `#5a45d6`.
- Phone: the app's real markup and CSS (HUD, confirm card, sheet, Level complete), scaled to 1.12×.

## Music
120 BPM (a beat is 0.5s, a bar is 2s), A minor chiptune: triangle bass, a soft square-wave arpeggio, kick/snare/hats. Chords Am → F → C → G. Every cut and effect sits on the 1/16 grid from frame 0. Effects (hit, coin, ticks, whoosh) are in A minor and mixed under the music.

## Storyboard (20.0s, 1920×1080, 30fps)
| # | Time | Scene | On screen | Sound |
|---|---|---|---|---|
| 1 | 0.0–2.5 | **Hook** | "Your budget has HP." above a giant **Shopping** health bar, full and green. At 1.0 it takes **−CA$188** and drains in steps to red, "CA$12 left", with a shake. | kick, bass; hit on 1.0 |
| 2 | 2.5–6.0 | **Reveal** | The pixel coin and "Pixel Purse", then "Type what you spend. Keep your bars alive." on the left. The phone rises on the right with the real main screen: CA$501 left, CA$36/day, bars. | whoosh on 2.5; drums in |
| 3 | 6.0–10.5 | **Highlight: type it** | Caption: "Type it like you'd say it." In the phone, "coffee CA$ 4 at tim hortons" types out. The card shows *Expense found · Tim Hortons · Food · CA$4.00* and auto-saves; the Food bar ticks down, then the toast "Food: CA$124 left". | soft key ticks on 1/16; coin on 9.5 |
| 4 | 10.5–14.5 | **Highlight: no guilt** | Caption: "Go over? Cover it. No guilt." "zara 40" saves, Shopping goes red, "CA$28 over", and the phone shakes. The sheet "Shopping took a hit" slides up; a tap on **Groceries** and the toast "Nice save! Moved CA$28 from Groceries." | hit on 12.0; tap/coin on 13.5 |
| 5 | 14.5–17.5 | **Highlight: loot** | Caption: "Finish the month. Loot the chest." The phone shows **Level complete**: 7 stars pop in one by one, then "+CA$457" counts up and "Chest: CA$620 → CA$1,077". | rising coin notes on stars; chord on loot |
| 6 | 17.5–20.0 | **Punchline** | Centred: the coin, "Pixel Purse", "Your budget has HP.", the URL **pixel-purse-two.vercel.app**, and "Installs on iPhone · Works offline". | final chord, fade out |

Transitions: old content out, then new content in (no muddy crossfades). The phone stays in place from scene 2 to scene 5 for continuity.

Poster: a settled frame from scene 3, with the card on screen and the caption fully in, baked in as frame 0.
