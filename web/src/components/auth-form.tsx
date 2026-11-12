"use client";

import { useEffect, useRef, useState } from "react";
import { sendSaveCode, sendSignInCode, verifySaveCode, verifySignInCode, type AuthResult } from "@/lib/auth";
import { getState } from "@/lib/store/app-store";
import { PixelIcon } from "./pixel-icon";

export type AuthMode = "create" | "save" | "load";

const TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gnail.com": "gmail.com", "gmail.co": "gmail.com",
  "hotmial.com": "hotmail.com", "yaho.com": "yahoo.com", "outlok.com": "outlook.com", "iclod.com": "icloud.com",
};
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECONDS = 30;

const HEAD: Record<AuthMode, [string, string]> = {
  create: ["Create your save file", "Save your budgets so you never lose them. No password needed."],
  save: ["Save your progress", "Your save file lives only on this phone. Add an email so you never lose it."],
  load: ["Load your save", "Sign in to pick up where you left off."],
};

/**
 * Email → 6-digit code → done. Handles "this email already has a save file" by
 * offering to load that save instead (sign-in-flow.md, Flow B edge case).
 */
export function AuthForm({
  mode: initialMode,
  onDone,
  skip,
}: {
  mode: AuthMode;
  onDone: (mode: AuthMode) => void;
  skip?: { label: string; onClick: () => void; note?: string };
}) {
  const [mode, setMode] = useState(initialMode);
  const [step, setStep] = useState<"email" | "code" | "exists">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [typo, setTypo] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  const send = async (addr: string, asMode: AuthMode): Promise<AuthResult> =>
    asMode === "load" ? sendSignInCode(addr) : sendSaveCode(addr);

  const submitEmail = async (checkTypo = true) => {
    const addr = email.trim().toLowerCase();
    if (!EMAIL_RX.test(addr)) return setErr("Enter an email like you@gmail.com.");
    const domain = addr.split("@")[1];
    if (checkTypo && TYPOS[domain]) return setTypo(`${addr.split("@")[0]}@${TYPOS[domain]}`);
    setBusy(true);
    setErr("");
    const r = await send(addr, mode);
    setBusy(false);
    if (r.ok) {
      setEmail(addr);
      setCode("");
      setStep("code");
      setResendIn(RESEND_SECONDS);
    } else if (r.reason === "exists") setStep("exists");
    else setErr(r.message);
  };

  const verify = async (value: string) => {
    if (!/^\d{6}$/.test(value)) return setErr("Enter all 6 digits.");
    setBusy(true);
    setErr("");
    const r = mode === "load" ? await verifySignInCode(email, value) : await verifySaveCode(email, value);
    setBusy(false);
    if (r.ok) onDone(mode);
    else setErr(r.message);
  };

  const loadExisting = async () => {
    setMode("load");
    setBusy(true);
    const r = await sendSignInCode(email.trim().toLowerCase());
    setBusy(false);
    if (r.ok) {
      setCode("");
      setStep("code");
      setResendIn(RESEND_SECONDS);
    } else setErr(r.message);
  };

  const [title, sub] = HEAD[mode];
  const masked = email.replace(/^(.)[^@]*/, "$1•••");
  const localExpenses = getState().expenses.length;

  return (
    <>
      <div className="row" style={{ gap: 14 }}>
        <PixelIcon name="chest" />
        <h2 className="h">{title}</h2>
      </div>
      <p className="sub">{sub}</p>

      {step === "email" && (
        <form className="stack" noValidate onSubmit={(e) => { e.preventDefault(); void submitEmail(); }}>
          <label className="lab" htmlFor="auth-email" style={{ margin: 0 }}>Email</label>
          <input
            className="field"
            id="auth-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@gmail.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setTypo(""); setErr(""); }}
          />
          {typo && (
            <p className="err">
              Did you mean <b>{typo}</b>?{" "}
              <button type="button" className="btn ghost" onClick={() => { setEmail(typo); setTypo(""); }}>Use it</button>{" "}
              <button type="button" className="btn ghost" onClick={() => { setTypo(""); void submitEmail(false); }}>Keep mine</button>
            </p>
          )}
          {err && <p className="err">{err}</p>}
          <button className="btn" type="submit" disabled={busy}>{busy ? "Sending…" : "Send code"}</button>
          {skip && (
            <>
              <button type="button" className="btn ghost" onClick={skip.onClick}>{skip.label}</button>
              {skip.note && <p className="fine" style={{ textAlign: "center" }}>{skip.note}</p>}
            </>
          )}
        </form>
      )}

      {step === "code" && (
        <form className="stack" noValidate onSubmit={(e) => { e.preventDefault(); void verify(code); }}>
          <p>We sent a 6-digit code to <b>{masked}</b></p>
          <input
            ref={codeRef}
            className={`code ${err ? "shake" : ""}`}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            aria-label="6-digit code"
            value={code}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(v);
              setErr("");
              if (v.length === 6) void verify(v);
            }}
          />
          {err ? <p className="err">{err}</p> : <p className="fine">Didn&apos;t get it? Check spam or Promotions.</p>}
          <button className="btn" type="submit" disabled={busy}>{busy ? "Checking…" : "Verify"}</button>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <button
              type="button"
              className="btn ghost"
              disabled={resendIn > 0 || busy}
              onClick={async () => {
                const r = await send(email, mode);
                if (r.ok) setResendIn(RESEND_SECONDS);
                else setErr(r.message);
              }}
            >
              {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
            </button>
            <button type="button" className="btn ghost" onClick={() => { setStep("email"); setErr(""); }}>Wrong email?</button>
          </div>
        </form>
      )}

      {step === "exists" && (
        <section className="panel px stack">
          <p><b>{email}</b> already has a save file.</p>
          {localExpenses > 0 && (
            <p className="fine">
              Loading it replaces this phone&apos;s save ({localExpenses} expense{localExpenses === 1 ? "" : "s"} this month).
            </p>
          )}
          {err && <p className="err">{err}</p>}
          <button className="btn" disabled={busy} onClick={loadExisting}>{busy ? "Sending…" : "Load that save file"}</button>
          <button className="btn alt" onClick={() => { setStep("email"); setEmail(""); setErr(""); }}>Use a different email</button>
        </section>
      )}
    </>
  );
}
