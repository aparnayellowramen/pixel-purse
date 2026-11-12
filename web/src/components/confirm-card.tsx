"use client";

import { useEffect, useState } from "react";
import { findCat } from "@/lib/domain/budget";
import { fmt, symbolFor } from "@/lib/domain/money";
import { dayLabel } from "@/lib/domain/month";
import type { AppState, ParsedItem, ParseSource } from "@/lib/domain/types";
import { PixelIcon } from "./pixel-icon";

export const AUTO_SAVE_MS = 1600;
export const AUTO_SAVE_CONFIDENCE = 0.85;

export type Pending =
  | { kind: "loading"; text: string }
  | { kind: "error"; message: string }
  | { kind: "items"; items: ParsedItem[]; source: ParseSource }
  | null;

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function CategoryChips({ s, selected, onPick }: { s: AppState; selected: string | null; onPick: (id: string) => void }) {
  return (
    <div className="cats">
      {s.cats.map((c) => (
        <button key={c.id} type="button" className="cchip" aria-pressed={selected === c.id} onClick={() => onPick(c.id)}>
          <PixelIcon name={c.icon} />
          {c.name}
        </button>
      ))}
    </div>
  );
}

export function ConfirmCard({
  s,
  pending,
  onSave,
  onClose,
}: {
  s: AppState;
  pending: Exclude<Pending, null>;
  onSave: (items: ParsedItem[]) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<ParsedItem[]>(pending.kind === "items" ? pending.items : []);
  const [editing, setEditing] = useState(false);
  const auto = pending.kind === "items" && items.every((i) => i.cat && i.conf >= AUTO_SAVE_CONFIDENCE);

  useEffect(() => {
    if (pending.kind !== "items" || !auto || editing) return;
    const t = setTimeout(() => onSave(items), AUTO_SAVE_MS);
    return () => clearTimeout(t);
  }, [pending.kind, auto, editing, items, onSave]);

  if (pending.kind === "loading") {
    return (
      <div className="ov-card">
        <div className="card">
          <div className="reading d">
            Reading<span className="dots"><i>.</i><i>.</i><i>.</i></span>
          </div>
          <p className="fine" style={{ marginTop: 6 }}>“{pending.text}”</p>
        </div>
      </div>
    );
  }

  if (pending.kind === "error") {
    return (
      <div className="ov-card">
        <div className="card">
          <div className="crow">
            <PixelIcon name="other" />
            <p className="ctext">{pending.message}</p>
          </div>
          <div className="cact">
            <span />
            <button className="btn alt sm" onClick={onClose}>OK</button>
          </div>
        </div>
      </div>
    );
  }

  const needs = items.some((i) => !i.cat);
  const showPick = editing || needs;
  const label =
    pending.source === "offline" ? "Offline · basic matching"
    : items.every((i) => i.how === "rule") ? "Your rule"
    : `${pending.source === "claude" ? "AI" : "Matched"} · ${Math.round(Math.min(...items.map((i) => i.conf)) * 100)}% sure`;

  return (
    <div className="ov-card">
      <div className="card" role="dialog" aria-label="Confirm expense">
        <div className="chead d">
          <span>{items.length > 1 ? `${items.length} expenses found` : "Expense found"}</span>
          <span>{needs ? "Needs you" : label}</span>
        </div>
        {items.map((i, idx) => {
          const c = findCat(s, i.cat);
          const amount = i.foreign ? `${symbolFor(i.cur)}${i.amount.toFixed(2)}` : fmt(i.amount, s.currency);
          const meta = [c?.name ?? "Pick a category", dayLabel(s.month, i.day), ...(i.merchant && i.note ? [i.note] : [])].join(" · ");
          return (
            <div className="citem" key={idx}>
              <div className="crow">
                <PixelIcon name={c?.icon ?? "other"} />
                <div className="ctext">
                  <div className="cl">
                    {i.merchant || cap(i.note) || c?.name || "Expense"} {i.foreign && <span className="badge">Foreign</span>}
                  </div>
                  <div className="cm">{meta}</div>
                </div>
                <div className="ca">{amount}</div>
              </div>
              {showPick && (
                <CategoryChips
                  s={s}
                  selected={i.cat}
                  onPick={(id) => {
                    setEditing(true);
                    setItems((prev) => prev.map((x, j) => (j === idx ? { ...x, cat: id, picked: true, conf: 1 } : x)));
                  }}
                />
              )}
            </div>
          );
        })}
        {auto && !editing ? (
          <>
            <div className="autobar"><i /></div>
            <div className="cact">
              <span className="fine">Saving…</span>
              <button className="btn alt sm" onClick={() => setEditing(true)}>Edit</button>
            </div>
          </>
        ) : (
          <div className="cact">
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn sm" disabled={needs} onClick={() => onSave(items)}>Save</button>
          </div>
        )}
      </div>
    </div>
  );
}
