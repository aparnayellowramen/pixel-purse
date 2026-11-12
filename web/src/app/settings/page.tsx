"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageShell } from "@/components/page-shell";
import { PixelIcon } from "@/components/pixel-icon";
import { ReminderSettings } from "@/components/reminder-settings";
import { signOut } from "@/lib/auth";
import { findCat } from "@/lib/domain/budget";
import { sfx } from "@/lib/sound";
import { deleteRule, setLeftoverTo, setSound } from "@/lib/store/actions";
import { loadDemo } from "@/lib/store/app-store";

const titleCase = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

export default function SettingsPage() {
  const router = useRouter();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
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
              <div className="lab">Budgets</div>
              <p className="fine">
                {s.cats.length} categories ·{" "}
                {s.cats.filter((c) => !c.debt).reduce((a, c) => a + c.limit, 0).toLocaleString("en-US")} {s.currency} a month for spending
              </p>
              <Link className="btn alt sm" href="/budgets" style={{ textAlign: "center", textDecoration: "none" }}>
                Edit budgets and categories
              </Link>
            </section>

            <ReminderSettings />

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
              {s.user.guest ? (
                <>
                  <p>Playing as guest. Your save file lives only on this phone.</p>
                  <Link className="btn" href="/save-progress" style={{ textAlign: "center", textDecoration: "none" }}>
                    Save your progress
                  </Link>
                </>
              ) : confirmSignOut ? (
                <>
                  <p>Sign out? Your save file stays safe in your account. Sign in again with {s.user.email} to load it.</p>
                  <div className="row">
                    <button
                      className="btn sm"
                      onClick={async () => {
                        await signOut();
                        router.replace("/start");
                      }}
                    >
                      Sign out
                    </button>
                    <button className="btn alt sm" onClick={() => setConfirmSignOut(false)}>Stay signed in</button>
                  </div>
                </>
              ) : (
                <>
                  <p>Signed in as <b>{s.user.email}</b>. Your save file syncs to your account.</p>
                  <button className="btn alt sm" onClick={() => setConfirmSignOut(true)}>Sign out</button>
                </>
              )}
              <Link className="btn ghost danger-link" href="/delete-account">Delete account</Link>
            </section>

            <section className="panel px set proto">
              <div className="lab">Developer tools</div>
              <button className="btn alt sm" onClick={() => router.push("/level")}>Simulate month end</button>
              {confirmReset ? (
                <div className="row">
                  <button className="btn danger sm" onClick={() => { loadDemo(); setConfirmReset(false); router.push("/"); }}>
                    Replace with demo data
                  </button>
                  <button className="btn alt sm" onClick={() => setConfirmReset(false)}>Keep my data</button>
                </div>
              ) : (
                <button className="btn ghost" onClick={() => setConfirmReset(true)}>Load demo data</button>
              )}
            </section>
          </>
        );
      }}
    </PageShell>
  );
}
