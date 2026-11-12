"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { findCat, rebalanceSources, remaining } from "@/lib/domain/budget";
import { fmt0, symbolFor } from "@/lib/domain/money";
import { dayLabel } from "@/lib/domain/month";
import type { AppState, Expense } from "@/lib/domain/types";
import { deleteExpense, editExpense, rebalance, restoreExpense, takeFromChest } from "@/lib/store/actions";
import { getState, useAppState } from "@/lib/store/app-store";
import { sfx } from "@/lib/sound";
import { CategoryChips } from "./confirm-card";
import { PixelIcon } from "./pixel-icon";
import { Sheet } from "./sheet";
import { useToast } from "./toast";

type Open = { kind: "edit"; id: string } | { kind: "rebalance"; cat: string } | null;

interface SheetsApi {
  openEdit: (id: string) => void;
  openRebalance: (cat: string) => void;
}

const SheetsContext = createContext<SheetsApi>({ openEdit: () => {}, openRebalance: () => {} });
export const useSheets = () => useContext(SheetsContext);

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const num = (v: string) => parseFloat(v.replace(",", ".").replace(/[^\d.]/g, ""));

export function SheetsProvider({ children }: { children: React.ReactNode }) {
  const s = useAppState();
  const [open, setOpen] = useState<Open>(null);
  const close = useCallback(() => setOpen(null), []);
  const api = useMemo<SheetsApi>(
    () => ({
      openEdit: (id) => setOpen({ kind: "edit", id }),
      openRebalance: (cat) => {
        sfx("hit");
        setOpen({ kind: "rebalance", cat });
      },
    }),
    [],
  );

  const expense = s && open?.kind === "edit" ? s.expenses.find((e) => e.id === open.id) : undefined;

  return (
    <SheetsContext.Provider value={api}>
      {children}
      {s && expense && <EditSheet key={expense.id} s={s} e={expense} onClose={close} onOver={api.openRebalance} />}
      {s && open?.kind === "rebalance" && <RebalanceSheet s={s} catId={open.cat} onClose={close} />}
    </SheetsContext.Provider>
  );
}

/* ---------- edit ---------- */

function EditSheet({ s, e, onClose, onOver }: { s: AppState; e: Expense; onClose: () => void; onOver: (cat: string) => void }) {
  const toast = useToast();
  const [amount, setAmount] = useState(String(e.amount));
  const [home, setHome] = useState("");
  const [merchant, setMerchant] = useState(e.merchant);
  const [note, setNote] = useState(e.note);
  const [day, setDay] = useState(e.day);
  const [cat, setCat] = useState(e.cat);
  const [err, setErr] = useState("");
  const days = Array.from({ length: s.month.day }, (_, i) => s.month.day - i);
  const willLearn = merchant.trim() && cat !== e.cat;

  const save = () => {
    const amt = num(amount);
    if (!(amt > 0)) return setErr("Enter an amount above 0.");
    let homeAmount: number | undefined;
    if (e.foreign && home.trim()) {
      homeAmount = num(home);
      if (!(homeAmount > 0)) return setErr(`Enter the ${s.currency} amount, or leave it empty.`);
    }
    const res = editExpense(e.id, { amount: amt, merchant, note, day, cat, homeAmount });
    onClose();
    if (!res) return;
    sfx("blip");
    toast("Changes saved.", () => {
      restoreExpense(res.previous);
      toast("Undone.");
    });
    if (res.overCat) setTimeout(() => onOver(res.overCat!), 500);
  };

  const remove = () => {
    const res = deleteExpense(e.id);
    onClose();
    if (res) toast(`Deleted ${e.merchant || cap(e.note) || "expense"}.`, () => restoreExpense(res.expense, res.index));
  };

  return (
    <Sheet label="Edit expense" onClose={onClose}>
      <h2>Edit expense</h2>
      <div className="ef">
        <label className="lab" htmlFor="ed-amt">Amount ({e.foreign ? symbolFor(e.cur) : symbolFor(s.currency)})</label>
        <input className="field" id="ed-amt" inputMode="decimal" value={amount} onChange={(v) => { setAmount(v.target.value); setErr(""); }} />
      </div>
      {e.foreign && (
        <div className="ef">
          <label className="lab" htmlFor="ed-home">Amount in {s.currency}</label>
          <input className="field" id="ed-home" inputMode="decimal" placeholder="From your card statement" value={home} onChange={(v) => { setHome(v.target.value); setErr(""); }} />
          <p className="fine">This expense is in another currency, so it isn&apos;t counted yet. Enter the {symbolFor(s.currency)} amount to count it in your budget.</p>
        </div>
      )}
      <div className="ef2">
        <div className="ef">
          <label className="lab" htmlFor="ed-mer">Store</label>
          <input className="field" id="ed-mer" placeholder="Optional" value={merchant} onChange={(v) => setMerchant(v.target.value)} />
        </div>
        <div className="ef">
          <label className="lab" htmlFor="ed-note">Note</label>
          <input className="field" id="ed-note" placeholder="Optional" value={note} onChange={(v) => setNote(v.target.value)} />
        </div>
      </div>
      <div className="ef">
        <label className="lab" htmlFor="ed-day">Date</label>
        <select className="field" id="ed-day" value={day} onChange={(v) => setDay(Number(v.target.value))}>
          {days.map((d) => (
            <option key={d} value={d}>{dayLabel(s.month, d)}</option>
          ))}
        </select>
      </div>
      <div className="ef">
        <div className="lab">Category</div>
        <CategoryChips s={s} selected={cat} onPick={setCat} />
      </div>
      {willLearn && (
        <p className="fine">Next time, {merchant.trim()} goes to {findCat(s, cat)?.name} automatically.</p>
      )}
      {err && <p className="err">{err}</p>}
      <div className="row" style={{ marginTop: 4 }}>
        <button className="btn danger sm" onClick={remove}>Delete</button>
        <button className="btn sm" onClick={save}>Save changes</button>
      </div>
      <button className="btn ghost" onClick={onClose}>Cancel</button>
    </Sheet>
  );
}

/* ---------- rebalance ---------- */

function RebalanceSheet({ s, catId, onClose }: { s: AppState; catId: string; onClose: () => void }) {
  const toast = useToast();
  const [askChest, setAskChest] = useState(false);
  const c = findCat(s, catId);
  const over = c ? -remaining(s, c) : 0;
  if (!c || over <= 0) return null;
  const sources = rebalanceSources(s, c.id);
  const cur = s.currency;

  const done = (msg: string) => {
    sfx("coin");
    // Read the store directly: React hasn't re-rendered with the new numbers yet.
    if (remaining(getState(), c) >= 0) {
      onClose();
      toast(msg);
    }
  };

  return (
    <Sheet label={`${c.name} is over budget`} onClose={onClose}>
      <h2>{c.name} took a hit</h2>
      <p>
        {c.name} is <b>{fmt0(over, cur)}</b> over. {sources.length ? "Cover it from another bar:" : "It happens."}
      </p>
      {sources.length ? (
        sources.map((x) => {
          const amt = Math.min(over, remaining(s, x));
          return (
            <button
              key={x.id}
              className="opt"
              onClick={() => {
                const moved = rebalance(x.id, c.id);
                done(`Nice save! Moved ${fmt0(moved, cur)} from ${x.name}. ${c.name} is back in the green.`);
              }}
            >
              <PixelIcon name={x.icon} />
              <div className="ot">
                {x.name}
                <div className="os">{fmt0(remaining(s, x), cur)} left{amt < over ? " · covers part of it" : ""}</div>
              </div>
              <span className="oa">{fmt0(amt, cur)}</span>
            </button>
          );
        })
      ) : (
        <section className="panel px">
          <div className="lab">New strategy unlocked</div>
          <p>Every other bar is empty. Try 3 no-spend days this week. Each one earns +10 XP.</p>
        </section>
      )}
      {s.chest > 0 &&
        (askChest ? (
          <section className="panel px stack">
            <p>
              Open the treasure chest? This takes <b>{fmt0(Math.min(over, s.chest), cur)}</b> out of your savings.
            </p>
            <div className="row">
              <button
                className="btn sm"
                onClick={() => {
                  const moved = takeFromChest(c.id);
                  setAskChest(false);
                  done(`Took ${fmt0(moved, cur)} from the chest. ${c.name} is covered.`);
                }}
              >
                Open chest
              </button>
              <button className="btn alt sm" onClick={() => setAskChest(false)}>Back</button>
            </div>
          </section>
        ) : (
          <button className="opt chest" onClick={() => setAskChest(true)}>
            <PixelIcon name="chest" />
            <div className="ot">
              Treasure chest
              <div className="os">Your savings: {fmt0(s.chest, cur)}</div>
            </div>
            <span className="oa">{fmt0(Math.min(over, s.chest), cur)}</span>
          </button>
        ))}
      <button className="btn ghost" onClick={onClose}>Not now</button>
    </Sheet>
  );
}
