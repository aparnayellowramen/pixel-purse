"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageShell } from "@/components/page-shell";
import { PixelIcon } from "@/components/pixel-icon";
import { findCat } from "@/lib/domain/budget";
import { sfx } from "@/lib/sound";
import { deleteRule, setLeftoverTo, setSound } from "@/lib/store/actions";
import { resetDemo } from "@/lib/store/app-store";

const titleCase = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

export default function SettingsPage() {
  const router = useRouter();
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <PageShell title="Settings">
      {(s) => {
        const rules = Object.entries(s.rules);
        return (
          <>
            <section className="panel px set">
              <div className="lab">Sound</div>
              <div className="toggle">
                <button className="btn sm" aria-pressed={!s.sound} onClick={() => setSound(false)}>Off</button>
                <button className="btn sm" aria-pressed={s.sound} onClick={() => { setSound(true); sfx("coin", true); }}>On</button>
              </div>
              <p className="fine">Muted by default, because people log in public.</p>
            </section>

            <section className="panel px set">
              <div className="lab">Send leftovers to</div>
              <div className="toggle">
                <button className="btn sm" aria-pressed={s.leftoverTo === "savings"} onClick={() => setLeftoverTo("savings")}>Savings</button>
                <button className="btn sm" aria-pressed={s.leftoverTo === "debt"} onClick={() => setLeftoverTo("debt")}>Debt</button>
              </div>
              <p className="fine">
                At month end, money left in your bars{" "}
                {s.leftoverTo === "savings" ? "drops into the treasure chest." : "is recorded as an extra debt payment."}
              </p>
            </section>

            <section className="panel px set">
              <div className="lab">Merchant rules</div>
              {rules.length ? (
                rules.map(([merchant, cat]) => (
                  <div className="rule" key={merchant}>
                    <PixelIcon name={findCat(s, cat)?.icon ?? "other"} />
                    <span>{titleCase(merchant)} → {findCat(s, cat)?.name ?? "Other"}</span>
                    <button className="btn ghost" onClick={() => deleteRule(merchant)} aria-label={`Delete rule for ${merchant}`}>
                      Delete
                    </button>
                  </div>
                ))
              ) : (
                <p className="fine">
                  Change an expense&apos;s category once and the app remembers it for that store. Rules show up here.
                </p>
              )}
            </section>

            <section className="panel px set">
              <div className="lab">Account</div>
              <p className="fine">Sign-in and saving your progress arrive in milestone 3. For now, your data is saved in this browser.</p>
            </section>

            <section className="panel px set proto">
              <div className="lab">Developer tools</div>
              <button className="btn alt sm" onClick={() => router.push("/level")}>Simulate month end</button>
              {confirmReset ? (
                <div className="row">
                  <button className="btn danger sm" onClick={() => { resetDemo(); setConfirmReset(false); router.push("/"); }}>
                    Reset everything
                  </button>
                  <button className="btn alt sm" onClick={() => setConfirmReset(false)}>Keep my data</button>
                </div>
              ) : (
                <button className="btn ghost" onClick={() => setConfirmReset(true)}>Reset to demo data</button>
              )}
            </section>
          </>
        );
      }}
    </PageShell>
  );
}
