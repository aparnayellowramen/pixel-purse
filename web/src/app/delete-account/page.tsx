"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageShell } from "@/components/page-shell";
import { useToast } from "@/components/toast";
import { deleteAccount } from "@/lib/auth";
import { fmt0 } from "@/lib/domain/money";
import { downloadCsv } from "@/lib/export";

export default function DeleteAccountPage() {
  const router = useRouter();
  const toast = useToast();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [exported, setExported] = useState(false);

  return (
    <PageShell title="Delete account">
      {(s) => {
        const months = s.history.length;
        const expenses = s.expenses.length;
        return (
          <>
            <h2 className="h">Delete your save file forever?</h2>
            <section className="panel px stack">
              <p>This permanently deletes:</p>
              <ul className="loss">
                <li>{months} finished month{months === 1 ? "" : "s"} in your Hall of records</li>
                <li>{expenses} expense{expenses === 1 ? "" : "s"} this month</li>
                <li>Your treasure chest records ({fmt0(s.chest, s.currency)})</li>
                <li>Your level, combo, budgets and store rules</li>
                <li>{s.user.guest ? "Your guest account" : `Your account (${s.user.email})`}</li>
              </ul>
              <p className="fine">This can&apos;t be undone. Your real money and bank accounts aren&apos;t affected.</p>
            </section>

            <button
              className="btn alt"
              onClick={() => {
                downloadCsv(s);
                setExported(true);
              }}
            >
              {exported ? "Downloaded. Download again" : "Download my data first (CSV)"}
            </button>

            <form
              className="stack"
              noValidate
              onSubmit={async (e) => {
                e.preventDefault();
                if (typed.trim().toUpperCase() !== "DELETE") return setErr("Type DELETE to confirm.");
                setBusy(true);
                const r = await deleteAccount();
                setBusy(false);
                if (!r.ok) return setErr(r.message);
                toast("Game deleted.");
                router.replace("/start");
              }}
            >
              <label className="lab" htmlFor="confirm-delete" style={{ margin: 0 }}>
                Type DELETE to confirm
              </label>
              <input
                className="field"
                id="confirm-delete"
                autoComplete="off"
                autoCapitalize="characters"
                value={typed}
                onChange={(e) => { setTyped(e.target.value); setErr(""); }}
              />
              {err && <p className="err">{err}</p>}
              <button className="btn danger" type="submit" disabled={busy || typed.trim().toUpperCase() !== "DELETE"}>
                {busy ? "Deleting…" : "Delete forever"}
              </button>
              <button type="button" className="btn ghost" onClick={() => router.back()}>Keep my account</button>
            </form>
          </>
        );
      }}
    </PageShell>
  );
}
