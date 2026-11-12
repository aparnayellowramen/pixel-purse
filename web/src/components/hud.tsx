"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { barState, dailyPace, daysLeft, totalLeft } from "@/lib/domain/budget";
import { fmt0 } from "@/lib/domain/money";
import type { ParsedItem } from "@/lib/domain/types";
import { parseOnClient } from "@/lib/parse/client";
import { sfx } from "@/lib/sound";
import { commitItems, logNoSpend, removeExpenses, XP_PER_LEVEL } from "@/lib/store/actions";
import { getState, useAppState } from "@/lib/store/app-store";
import { ConfirmCard, type Pending } from "./confirm-card";
import { ExpenseRow } from "./expense-row";
import { PixelIcon } from "./pixel-icon";
import { useSheets } from "./sheets";
import { useToast } from "./toast";

const EXAMPLES = [
  "coffee CA$ 4 at tim hortons",
  "zara 40",
  "lunch 15 and uber home 22",
  "groceries 62 nofrills yesterday",
  "paid 200 to credit card",
  "€12 croissant",
  "4",
];
const PLACEHOLDERS = ["coffee 4 at tim hortons", "uber 18", "groceries 62 nofrills", "lunch 15 and uber 22"];

export function Hud() {
  const s = useAppState();
  const toast = useToast();
  const { openRebalance } = useSheets();
  const router = useRouter();
  const monthEndDue = !!s?.monthEndDue;
  useEffect(() => {
    if (monthEndDue) router.replace("/level");
  }, [monthEndDue, router]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<Pending>(null);
  const [placeholder, setPlaceholder] = useState(0);
  const addbar = useRef<HTMLFormElement>(null);

  // Keep floating cards and toasts just above the add bar.
  const ready = s !== null;
  useEffect(() => {
    const el = addbar.current;
    if (!ready || !el) return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty("--addh", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  useEffect(() => {
    const t = setInterval(() => setPlaceholder((p) => (p + 1) % PLACEHOLDERS.length), 3500);
    return () => clearInterval(t);
  }, []);

  const submit = async (text: string) => {
    if (!text.trim() || pending?.kind === "loading") return;
    setDraft("");
    setPending({ kind: "loading", text });
    const r = await parseOnClient(text, getState());
    if (r.items?.length) setPending({ kind: "items", items: r.items, source: r.source });
    else setPending({ kind: "error", message: r.error ?? "Something went wrong. Try again." });
  };

  const save = useCallback(
    (items: ParsedItem[]) => {
      const res = commitItems(items);
      setPending(null);
      sfx("coin");
      toast(res.message, () => {
        removeExpenses(res.ids);
        toast("Undone.");
      });
      if (res.overCat) {
        const cat = res.overCat;
        setTimeout(() => {
          // Skip if the user already pressed Undo.
          if (getState().expenses.some((e) => res.ids.includes(e.id))) openRebalance(cat);
        }, 600);
      }
    },
    [toast, openRebalance],
  );
  const close = useCallback(() => setPending(null), []);

  if (!s) return <div className="device" aria-busy="true" />;

  const left = totalLeft(s);
  const dl = daysLeft(s);
  const today = s.expenses.filter((e) => e.day === s.month.day).reverse();
  const yesterday = s.expenses.filter((e) => e.day === s.month.day - 1).reverse();
  const noSpendToday = s.noSpend.includes(`${s.month.key}-${s.month.day}`);

  return (
    <div className="device" data-screen="hud">
      <div className="scr">
        <header className="top">
          <div className="lv">
            <span className="d">LV {s.level}</span>
            <div className="xp" role="img" aria-label={`${s.xp} of ${XP_PER_LEVEL} XP`}>
              <i style={{ width: `${(s.xp / XP_PER_LEVEL) * 100}%` }} />
            </div>
          </div>
          <div className="chest" aria-label={`Treasure chest ${fmt0(s.chest, s.currency)}`}>
            <PixelIcon name="chest" />
            <span className="d">{fmt0(s.chest, s.currency)}</span>
          </div>
          <Link className="ib" href="/records" aria-label="Hall of records">
            <PixelIcon name="trophy" />
          </Link>
          <Link className="ib" href="/settings" aria-label="Settings">
            <PixelIcon name="gear" />
          </Link>
        </header>

        <div className="scroll">
          <div className="lvlrow d">
            <span>{s.month.name.toUpperCase()} · DAY {s.month.day}/{s.month.days}</span>
            <span className="combo">COMBO ×{s.streak}</span>
          </div>

          <section className="panel px leftp">
            <div className="lab">Left this month</div>
            <div className={`big ${left < 0 ? "neg" : ""}`}>{fmt0(left, s.currency)}</div>
            <div className="sub">
              {left > 0
                ? `${fmt0(dailyPace(s), s.currency)}/day for the next ${dl} days`
                : "Every bar is tapped out. Try a no-spend day."}
            </div>
          </section>

          <section className="bars" aria-label="Budgets">
            {s.cats.map((c) => {
              const b = barState(s, c);
              return (
                <div className="barrow" key={c.id} aria-label={`${c.name}: ${b.text}`}>
                  <div className="bh">
                    <PixelIcon name={c.icon} />
                    <span className="bn">{c.name}</span>
                    {c.protected && <span className="tag">SAFE</span>}
                    <span className={`bv ${b.tone}`}>{b.text}</span>
                  </div>
                  <div className="hp">
                    <i style={{ ["--w" as string]: `${b.pct}%`, ["--c" as string]: `var(--${b.tone === "ok" ? "hp" : b.tone === "debt" ? "cyan" : b.tone})` }} />
                  </div>
                </div>
              );
            })}
          </section>

          <section className="panel px today">
            <div className="lab">Today</div>
            {today.length ? (
              today.map((e) => <ExpenseRow key={e.id} s={s} e={e} />)
            ) : noSpendToday ? (
              <p className="empty">No-spend day logged. +10 XP</p>
            ) : (
              <>
                <p className="empty">Nothing logged yet today.</p>
                <button className="btn alt sm" style={{ width: "100%" }} onClick={() => { toast(logNoSpend()); sfx("coin"); }}>
                  No spend today
                </button>
              </>
            )}
          </section>

          {yesterday.length > 0 && (
            <section className="panel px today">
              <div className="lab">Yesterday</div>
              {yesterday.map((e) => <ExpenseRow key={e.id} s={s} e={e} />)}
            </section>
          )}

          {s.expenses.length > 0 && (
            <Link className="btn alt" href="/expenses" style={{ textAlign: "center", textDecoration: "none" }}>
              See all {s.month.name} expenses ({s.expenses.length})
            </Link>
          )}
        </div>

        <form
          className="addbar"
          ref={addbar}
          autoComplete="off"
          onSubmit={(ev) => {
            ev.preventDefault();
            submit(draft);
          }}
        >
          <div className="chips" aria-label="Examples">
            <span className="k">Try</span>
            {EXAMPLES.map((t) => (
              <button key={t} type="button" className="chip" onClick={() => submit(t)}>
                {t}
              </button>
            ))}
          </div>
          <div className="addrow">
            <input
              id="add"
              value={draft}
              onChange={(ev) => setDraft(ev.target.value)}
              enterKeyHint="send"
              aria-label="Type what you spent"
              placeholder={PLACEHOLDERS[placeholder]}
              maxLength={200}
            />
            <button className="btn" type="submit" aria-label="Add expense">Add</button>
          </div>
        </form>
      </div>

      {pending && <ConfirmCard key={JSON.stringify(pending)} s={s} pending={pending} onSave={save} onClose={close} />}
    </div>
  );
}
