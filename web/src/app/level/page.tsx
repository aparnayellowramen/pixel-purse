"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PixelIcon } from "@/components/pixel-icon";
import { Stars } from "@/components/stars";
import { useToast } from "@/components/toast";
import { fmt0 } from "@/lib/domain/money";
import { monthLabel, monthObj } from "@/lib/domain/month";
import { computeLevel, nextMonthKey, type LevelResult } from "@/lib/domain/month-end";
import { sfx } from "@/lib/sound";
import { completeMonth } from "@/lib/store/actions";
import { useAppState } from "@/lib/store/app-store";

export default function LevelPage() {
  const s = useAppState();
  const router = useRouter();
  const toast = useToast();
  const [tip, setTip] = useState<boolean | null>(null);
  // Score the month once when the screen opens, so it doesn't change after "Start".
  const frozen = useRef<LevelResult | null>(null);
  if (s && !frozen.current) frozen.current = computeLevel(s);
  const result = frozen.current;

  const ready = s !== null;
  useEffect(() => {
    if (ready) sfx("level");
  }, [ready]);

  if (!s || !result) return <div className="device" aria-busy="true" />;
  const { record: r, leftover, dest } = result;
  const cur = s.currency;
  const next = monthObj(nextMonthKey(s, new Date()));
  const last = s.history.at(-1);
  const best = s.history.length ? Math.max(...s.history.map((h) => h.saved)) : 0;
  const compare = !last
    ? "Your first level is in the books."
    : r.saved > best
      ? "Best run yet!"
      : r.saved > last.saved
        ? `You saved ${fmt0(r.saved - last.saved, cur)} more than last month.`
        : r.spent < last.spent
          ? `You spent ${fmt0(last.spent - r.spent, cur)} less than last month.`
          : "New level, fresh bars. You've got this.";

  const start = () => {
    completeMonth(result, tip === true);
    sfx("coin");
    toast(`${next.name} started. Bars are full again.`);
    router.replace("/");
  };

  return (
    <div className="device">
      <div className="scr">
        <div className="scroll center">
          <h1 className="lvtitle">Level complete</h1>
          <p className="sub">{monthLabel(r.key, "long")}</p>
          <Stars n={r.stars} max={r.maxStars} />
          <p className="fine">{r.stars} of {r.maxStars} bars survived</p>

          <section className="panel px">
            {r.cats.map((c) => {
              const d = c.limit - c.spent;
              return (
                <div className="res" key={c.id}>
                  <PixelIcon name={c.icon} />
                  <span className="rn">{c.name}</span>
                  <span className={`rv ${d >= 0 ? "good" : "mutedc"}`}>{d >= 0 ? `+${fmt0(d, cur)}` : `${fmt0(-d, cur)} over`}</span>
                </div>
              );
            })}
          </section>

          <section className="panel px loot">
            <div className="lab">{dest === "debt" ? "Extra toward debt" : "Loot for the treasure chest"}</div>
            <div className="big">+{fmt0(leftover, cur)}</div>
            <p className="sub">
              {dest === "savings"
                ? `Chest: ${fmt0(s.chest, cur)} → ${fmt0(s.chest + leftover, cur)}`
                : "Recorded as an extra debt payment. +50 XP"}
            </p>
          </section>

          {result.tip ? (
            <section className="panel px stack" style={{ textAlign: "left" }}>
              <div className="lab" style={{ margin: 0 }}>Tip for next level</div>
              <p>{result.tip.text}</p>
              {tip === null ? (
                <div className="row">
                  <button className="btn sm" onClick={() => setTip(true)}>Apply</button>
                  <button className="btn alt sm" onClick={() => setTip(false)}>Skip</button>
                </div>
              ) : (
                <p className="fine">{tip ? "Will apply to next month's budgets." : "Skipped. Budgets stay the same."}</p>
              )}
            </section>
          ) : r.stars === r.maxStars ? (
            <section className="panel px"><p>Perfect level! Every bar survived.</p></section>
          ) : null}

          <p className="sub">{compare}</p>
          <button className="btn" onClick={start}>Start {next.name}</button>
          {!s.monthEndDue && (
            <button className="btn ghost" onClick={() => router.back()}>Not yet, go back</button>
          )}
        </div>
      </div>
    </div>
  );
}
