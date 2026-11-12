"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthForm, type AuthMode } from "@/components/auth-form";
import { CategoryEditor, toCategories, toRows, type CategoryRow } from "@/components/category-editor";
import { categoryProblems } from "@/lib/domain/categories";
import { PixelIcon } from "@/components/pixel-icon";
import { useToast } from "@/components/toast";
import { startAsGuest } from "@/lib/auth";
import { shouldShowInstallGuide } from "@/lib/pwa";
import { DEFAULT_CATS } from "@/lib/domain/defaults";
import { CURRENCY_NAME, CURRENCY_SYMBOL } from "@/lib/domain/money";
import { CURRENCIES, type HomeCurrency } from "@/lib/domain/types";
import { getState, newGame, update, useAppState } from "@/lib/store/app-store";

type Step = "install" | "title" | "currency" | "budgets" | "save" | "tutorial" | "signin";

/** The iOS Share icon (a box with an arrow), drawn inline so it matches the system one. */
const ShareGlyph = () => (
  <svg className="share-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v12M7 8l5-5 5 5" />
    <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
  </svg>
);

function Steps({ n }: { n: number }) {
  return (
    <div className="steps" aria-label={`Step ${n} of 3`}>
      {[1, 2, 3].map((i) => <i key={i} className={i <= n ? "on" : ""} />)}
    </div>
  );
}

export default function StartPage() {
  const s = useAppState();
  const router = useRouter();
  const toast = useToast();
  // In iPhone Safari, install first: Safari and the Home Screen app keep separate saves (sign-in-flow.md §2).
  const [step, setStep] = useState<Step>(() => (shouldShowInstallGuide() ? "install" : "title"));
  const [currency, setCurrency] = useState<HomeCurrency>("CAD");
  const [rows, setRows] = useState<CategoryRow[]>(() => toRows(DEFAULT_CATS));
  const [problems, setProblems] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Someone who already finished onboarding belongs on the main screen.
  const done = !!s?.started;
  useEffect(() => {
    if (done && (step === "title" || step === "install")) router.replace("/");
  }, [done, step, router]);

  if (!s) return <div className="device" aria-busy="true" />;
  const sym = CURRENCY_SYMBOL[currency];
  const total = toCategories(rows).filter((c) => !c.debt).reduce((a, c) => a + c.limit, 0);

  const getStarted = async () => {
    setBusy(true);
    setErr("");
    const r = await startAsGuest();
    setBusy(false);
    if (r.ok) setStep("currency");
    else setErr(r.message);
  };

  const finishBudgets = () => {
    const cats = toCategories(rows).map((c) => ({ ...c, name: c.name.trim() }));
    const p = categoryProblems(cats);
    setProblems(p);
    if (p.length) return;
    newGame(currency, cats, { guest: true });
    setStep("save");
  };

  const play = () => {
    update((d) => {
      d.started = true;
    });
    router.replace("/");
  };

  const afterAuth = (mode: AuthMode) => {
    if (mode === "load" && getState().started) {
      toast(`Welcome back! Level ${getState().level}.`);
      router.replace("/");
    } else if (mode === "load") {
      setStep("currency"); // signed in, but this account has no save yet
    } else {
      toast("Save file created!");
      setStep("tutorial");
    }
  };

  return (
    <div className="device">
      <div className="scr">
        {step === "title" && (
          <div className="title-scr scr">
            <div className="logo">
              <PixelIcon name="coin" />
              <h1>Pixel Purse</h1>
              <p>Type what you spend. Keep your bars alive.</p>
            </div>
            <div className="menu">
              {err && <p className="err">{err}</p>}
              <button className="btn" onClick={getStarted} disabled={busy}>{busy ? "Starting…" : "Get started"}</button>
              <button className="btn alt" onClick={() => setStep("signin")}>I have an account</button>
            </div>
          </div>
        )}

        {step === "install" && (
          <div className="scroll">
            <div className="logo" style={{ marginTop: "4vh" }}>
              <PixelIcon name="coin" />
            </div>
            <h2 className="h" style={{ textAlign: "center" }}>Add Pixel Purse to your Home Screen</h2>
            <p className="sub" style={{ textAlign: "center" }}>
              It opens full screen like a real app, and your save file lives in the app instead of in Safari.
            </p>
            <section className="panel px">
              <ol className="install-steps" style={{ margin: 0, padding: 0 }}>
                <li><span className="num">1</span><span>Tap <b>Share</b> <ShareGlyph /> in Safari&apos;s toolbar</span></li>
                <li><span className="num">2</span><span>Scroll down and tap <b>Add to Home Screen</b></span></li>
                <li><span className="num">3</span><span>Tap <b>Add</b>, then open <b>Pixel Purse</b> from your Home Screen</span></li>
              </ol>
            </section>
            <p className="fine" style={{ textAlign: "center" }}>
              Safari and the Home Screen app keep separate saves, so start in the app.
            </p>
            <div style={{ flex: 1 }} />
            <button className="btn ghost" onClick={() => setStep("title")}>Continue in Safari instead</button>
          </div>
        )}

        {step !== "title" && step !== "install" && (
          <div className="scroll">
            {step === "currency" && (
              <>
                <Steps n={1} />
                <h2 className="h">Your currency</h2>
                <p className="sub">&quot;$&quot; and amounts without a symbol will use this.</p>
                <div>
                  {CURRENCIES.map((c) => (
                    <button key={c} className="radio" aria-pressed={currency === c} onClick={() => setCurrency(c)}>
                      <span className="d">{CURRENCY_SYMBOL[c]}</span>
                      <span>{CURRENCY_NAME[c]}</span>
                    </button>
                  ))}
                </div>
                <div style={{ flex: 1 }} />
                <button className="btn" onClick={() => setStep("budgets")}>Next</button>
              </>
            )}

            {step === "budgets" && (
              <>
                <Steps n={2} />
                <h2 className="h">Set your monthly budgets</h2>
                <p className="sub">
                  A monthly budget for each category. Rename, add or remove any of them. Leave out fixed bills like rent so your daily pace only
                  covers everyday spending.
                </p>
                <CategoryEditor rows={rows} onChange={(r) => { setRows(r); setProblems([]); }} currency={currency} />
                <p className="sub">Spending budget: <b style={{ color: "var(--ink)" }}>{sym}{total.toLocaleString("en-US")}</b> / month</p>
                {problems.map((p) => <p className="err" key={p}>{p}</p>)}
                <button className="btn" onClick={finishBudgets}>Next</button>
              </>
            )}

            {step === "save" && (
              <>
                <Steps n={3} />
                <AuthForm
                  mode="create"
                  onDone={afterAuth}
                  skip={{ label: "Play as guest", onClick: () => setStep("tutorial"), note: "You can save later in Settings." }}
                />
              </>
            )}

            {step === "signin" && (
              <AuthForm mode="load" onDone={afterAuth} skip={{ label: "Back", onClick: () => setStep("title") }} />
            )}

            {step === "tutorial" && (
              <>
                <h2 className="h">How it works</h2>
                <section className="panel px tut">
                  <span className="n">1 · Health bars</span>
                  <p>Each budget is a health bar. Spending takes HP away.</p>
                </section>
                <section className="panel px tut">
                  <span className="n">2 · Type it</span>
                  <p>Type a purchase the way you&apos;d say it. The AI files it for you.</p>
                  <p className="fine">“coffee {sym} 4 at tim hortons”</p>
                </section>
                <section className="panel px tut">
                  <span className="n">3 · Loot</span>
                  <p>Go over? Cover it from another bar. At month end, whatever is left drops into your treasure chest.</p>
                </section>
                <div style={{ flex: 1 }} />
                <button className="btn" onClick={play}>Let&apos;s go</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
