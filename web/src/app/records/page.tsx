"use client";

import { useState } from "react";
import { SavingsChart, SpendChart } from "@/components/charts";
import { PageShell } from "@/components/page-shell";
import { PixelIcon } from "@/components/pixel-icon";
import { Sheet } from "@/components/sheet";
import { Stars } from "@/components/stars";
import { daysLeft, limitOf, spendCats, spentIn } from "@/lib/domain/budget";
import { fmt0, round2 } from "@/lib/domain/money";
import { monthLabel } from "@/lib/domain/month";
import type { AppState, MonthRecord } from "@/lib/domain/types";

export default function RecordsPage() {
  const [trendCat, setTrendCat] = useState("food");
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  return (
    <PageShell title="Hall of records">
      {(s) => {
        const H = s.history;
        if (!H.length) {
          return (
            <div className="center stack" style={{ marginTop: "18vh" }}>
              <PixelIcon name="trophy" className="empty-icon" />
              <p className="h" style={{ fontSize: 22 }}>No records yet</p>
              <p className="sub">Finish your first level to start your records. {s.month.name} ends in {daysLeft(s)} days.</p>
            </div>
          );
        }
        const cur = s.currency;
        const best = H.reduce((a, b) => (b.saved > a.saved ? b : a));
        const mostStars = H.reduce((a, b) => (b.stars > a.stars ? b : a));
        const longest = Math.max(s.bestStreak, ...H.map((h) => h.streak));
        const rows = [
          ...H.map((h) => ({ label: monthLabel(h.key), spent: h.spent, budget: h.budget })),
          {
            label: monthLabel(s.month.key) + "*",
            spent: round2(spendCats(s).reduce((a, c) => a + spentIn(s, c.id), 0)),
            budget: spendCats(s).reduce((a, c) => a + limitOf(s, c), 0),
            current: true,
          },
        ];
        const trend = H.flatMap((h) => {
          const c = h.cats.find((x) => x.id === trendCat);
          return c ? [{ key: h.key, ...c }] : [];
        });
        const tmax = Math.max(1, ...trend.map((t) => Math.max(t.spent, t.limit))) * 1.05;
        const avg = trend.length ? trend.reduce((a, t) => a + t.spent, 0) / trend.length : 0;
        const overCount = trend.filter((t) => t.spent > t.limit).length;
        const lowestFood = H.flatMap((h) => {
          const c = h.cats.find((x) => x.id === "food");
          return c ? [{ h, c }] : [];
        }).sort((a, b) => a.c.spent - b.c.spent)[0];
        const month = openMonth ? H.find((h) => h.key === openMonth) : undefined;

        return (
          <>
            <div className="tiles">
              <Tile label="Treasure chest" value={fmt0(s.chest, cur)} sub="saved so far" coin />
              <Tile label="Levels cleared" value={String(H.length)} sub="months tracked" />
              <Tile label="Best level" value={monthLabel(best.key)} sub={`${fmt0(best.saved, cur)} saved`} />
              <Tile label="Longest combo" value={String(longest)} sub="days in a row" />
            </div>

            <section className="panel px">
              <div className="lab">Spent vs budget</div>
              <div className="chartwrap"><SpendChart rows={rows} /></div>
              <div className="legend">
                <span><i style={{ background: "var(--hp)" }} />Under</span>
                <span><i style={{ background: "var(--bad)" }} />Over</span>
                <span><i style={{ background: "var(--accent)", opacity: 0.5 }} />{monthLabel(s.month.key)} so far</span>
                <span><i style={{ background: "none", borderTop: "2px dashed var(--ink)", height: 0 }} />Budget</span>
              </div>
            </section>

            <section className="panel px">
              <div className="lab">Treasure chest growth</div>
              <div className="chartwrap"><SavingsChart history={H} /></div>
            </section>

            <section className="panel px">
              <div className="lab">Category trends</div>
              <div className="cats" style={{ marginTop: 0 }}>
                {spendCats(s).map((c) => (
                  <button key={c.id} className="cchip" aria-pressed={trendCat === c.id} onClick={() => setTrendCat(c.id)}>
                    <PixelIcon name={c.icon} />
                    {c.name}
                  </button>
                ))}
              </div>
              <div className="trend">
                {trend.map((t) => (
                  <div className="tr" key={t.key}>
                    <span className="tl">{monthLabel(t.key)}</span>
                    <div className="tt">
                      <i className={t.spent > t.limit ? "over" : ""} style={{ width: `${(t.spent / tmax) * 100}%` }} />
                      <b style={{ left: `${(t.limit / tmax) * 100}%` }} />
                    </div>
                    <span className="tvv">{fmt0(t.spent, cur)}</span>
                  </div>
                ))}
              </div>
              <p className="fine" style={{ marginTop: 10 }}>
                Average {fmt0(avg, cur)} · went over {overCount} of {trend.length} months · line = budget
              </p>
            </section>

            <section className="panel px">
              <div className="lab">Personal bests</div>
              <div className="badges">
                <Badge icon="coin" title="Most saved" text={`${fmt0(best.saved, cur)} in ${monthLabel(best.key, "long")}`} />
                <Badge icon="star" title="Most stars" text={`${mostStars.stars}/${mostStars.maxStars} in ${monthLabel(mostStars.key, "long")}`} />
                {lowestFood && <Badge icon="food" title="Lowest food" text={`${fmt0(lowestFood.c.spent, cur)} in ${monthLabel(lowestFood.h.key, "long")}`} />}
                <Badge icon="heart" title="Longest combo" text={`${longest} days`} />
              </div>
            </section>

            <section className="panel px">
              <div className="lab">All levels</div>
              {H.slice().reverse().map((h, i, arr) => {
                const prev = arr[i + 1];
                const diff = prev ? round2(h.spent - prev.spent) : 0;
                return (
                  <button key={h.key} className="mrow" onClick={() => setOpenMonth(h.key)}>
                    <div className="mt">
                      <div className="mn">{monthLabel(h.key, "long")}</div>
                      <Stars n={h.stars} max={h.maxStars} small />
                      <div className="ms">{fmt0(h.spent, cur)} of {fmt0(h.budget, cur)}</div>
                    </div>
                    <div className="mv">
                      <span className="sv">+{fmt0(h.saved, cur)}</span>
                      {prev && (diff <= 0
                        ? <span className="good">▼ {fmt0(-diff, cur)} less</span>
                        : <span className="mutedc">▲ {fmt0(diff, cur)} more</span>)}
                    </div>
                  </button>
                );
              })}
            </section>

            {month && <MonthSheet s={s} h={month} onClose={() => setOpenMonth(null)} />}
          </>
        );
      }}
    </PageShell>
  );
}

function Tile({ label, value, sub, coin }: { label: string; value: string; sub: string; coin?: boolean }) {
  return (
    <div className="tile px">
      <div className="lab">{label}</div>
      <div className={`tv ${coin ? "coin" : ""}`}>{value}</div>
      <div className="ts">{sub}</div>
    </div>
  );
}

function Badge({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="bdg">
      <PixelIcon name={icon} />
      <div><b>{title}</b>{text}</div>
    </div>
  );
}

function MonthSheet({ s, h, onClose }: { s: AppState; h: MonthRecord; onClose: () => void }) {
  const cur = s.currency;
  return (
    <Sheet label={monthLabel(h.key, "long")} onClose={onClose}>
      <h2>{monthLabel(h.key, "long")}</h2>
      <Stars n={h.stars} max={h.maxStars} small />
      <p>
        {fmt0(h.spent, cur)} spent of {fmt0(h.budget, cur)} · <b style={{ color: "var(--coin)" }}>+{fmt0(h.saved, cur)}</b>{" "}
        {h.savedTo === "debt" ? "toward debt" : "to the chest"}
      </p>
      <div className="bars">
        {h.cats.map((c) => {
          const rem = c.limit - c.spent;
          const pct = rem <= 0 ? 0 : (rem / c.limit) * 100;
          const tone = pct > 50 ? "ok" : pct > 20 ? "warn" : "bad";
          return (
            <div className="barrow" key={c.id}>
              <div className="bh">
                <PixelIcon name={c.icon} />
                <span className="bn">{c.name}</span>
                <span className={`bv ${tone}`}>{rem < 0 ? `${fmt0(-rem, cur)} over` : `${fmt0(rem, cur)} left`}</span>
              </div>
              <div className="hp">
                <i style={{ ["--w" as string]: `${pct}%`, ["--c" as string]: `var(--${tone === "ok" ? "hp" : tone})` }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="sub">
        Debt paid: {fmt0(h.debtPaid, cur)}
        {h.streak ? ` · Best combo: ${h.streak} days` : ""}
        {h.moves.length ? ` · ${h.moves.length} rebalance${h.moves.length > 1 ? "s" : ""}` : ""}
      </p>
      <button className="btn alt" onClick={onClose}>Close</button>
    </Sheet>
  );
}
