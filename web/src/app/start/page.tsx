"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthForm, type AuthMode } from "@/components/auth-form";
import { PixelIcon } from "@/components/pixel-icon";
import { useToast } from "@/components/toast";
import { startAsGuest } from "@/lib/auth";
import { DEFAULT_CATS } from "@/lib/domain/defaults";
import { CURRENCY_NAME, CURRENCY_SYMBOL } from "@/lib/domain/money";
import { CURRENCIES, type Category, type HomeCurrency } from "@/lib/domain/types";
import { getState, newGame, update, useAppState } from "@/lib/store/app-store";

type Step = "title" | "currency" | "budgets" | "save" | "tutorial" | "signin";

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
  const [step, setStep] = useState<Step>("title");
  const [currency, setCurrency] = useState<HomeCurrency>("CAD");
  const [cats, setCats] = useState<Category[]>(() => structuredClone(DEFAULT_CATS));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Someone who already finished onboarding belongs on the main screen.
  const done = !!s?.started;
  useEffect(() => {
    if (done && step === "title") router.replace("/");
  }, [done, step, router]);

  if (!s) return <div className="device" aria-busy="true" />;
  const sym = CURRENCY_SYMBOL[currency];
  const total = cats.filter((c) => !c.debt).reduce((a, c) => a + (c.limit || 0), 0);

  const getStarted = async () => {
    setBusy(true);
    setErr("");
    const r = await startAsGuest();
    setBusy(false);
    if (r.ok) setStep("currency");
    else setErr(r.message);
  };

  const finishBudgets = () => {
    newGame(currency, cats.map((c) => ({ ...c, limit: Math.max(0, Math.round(c.limit || 0)) })), { guest: true });
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

        {step !== "title" && (
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
                <p className="sub">A monthly budget for each category. Change any amount.</p>
                <section className="panel px">
                  {cats.map((c, i) => (
                    <div className="limrow" key={c.id}>
                      <PixelIcon name={c.icon} />
                      <label className="ln" htmlFor={`lim-${c.id}`}>
                        {c.name}
                        {c.debt && <small>Planned payment. Never used for rebalancing.</small>}
                      </label>
                      <input
                        className="limin"
                        id={`lim-${c.id}`}
                        inputMode="decimal"
                        value={c.limit || ""}
                        placeholder="0"
                        onChange={(e) => {
                          const v = parseFloat(e.target.value.replace(",", ".")) || 0;
                          setCats((prev) => prev.map((x, j) => (j === i ? { ...x, limit: v } : x)));
                        }}
                      />
                    </div>
                  ))}
                </section>
                <p className="sub">Spending budget: <b style={{ color: "var(--ink)" }}>{sym}{total.toLocaleString("en-US")}</b> / month</p>
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
