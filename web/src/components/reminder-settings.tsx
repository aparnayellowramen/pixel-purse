"use client";

import { useEffect, useState } from "react";
import {
  changeReminderTime,
  disableReminder,
  enableReminder,
  reminderOn,
  reminderSupport,
  savedTime,
  sendTestReminder,
  type ReminderSupport,
} from "@/lib/reminders";
import { useToast } from "./toast";

export function ReminderSettings() {
  const toast = useToast();
  const [support, setSupport] = useState<ReminderSupport | null>(null);
  const [on, setOn] = useState(false);
  const [time, setTime] = useState("20:00");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const s = reminderSupport();
    setSupport(s);
    setTime(savedTime());
    if (s === "ok") void reminderOn().then(setOn);
  }, []);

  const run = async (fn: () => Promise<{ ok: boolean; message?: string }>, done?: () => void) => {
    setBusy(true);
    setErr("");
    try {
      const r = await fn();
      if (r.ok) done?.();
      else setErr(r.message ?? "Something went wrong.");
    } catch {
      setErr("Something went wrong. Check your connection and try again.");
    } finally {
      setBusy(false); // never leave the buttons stuck
    }
  };

  return (
    <section className="panel px set">
      <div className="lab">Daily reminder</div>
      {support === null ? null : support === "install-first" ? (
        <p className="fine">On iPhone, reminders work in the Home Screen app. Open Pixel Purse from its icon to turn them on.</p>
      ) : support === "unsupported" ? (
        <p className="fine">This browser can&apos;t show reminders. Try the app on your phone.</p>
      ) : support === "dev" ? (
        <p className="fine">Reminders work in the deployed app (they need the service worker, which is off in development).</p>
      ) : (
        <>
          <div className="toggle">
            <button className="btn sm" aria-pressed={!on} disabled={busy} onClick={() => run(async () => { await disableReminder(); return { ok: true }; }, () => setOn(false))}>
              Off
            </button>
            <button
              className="btn sm"
              aria-pressed={on}
              disabled={busy}
              onClick={() => run(() => enableReminder(time), () => { setOn(true); toast(`Reminder set for ${time} every day.`); })}
            >
              On
            </button>
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <label htmlFor="reminder-time">Remind me at</label>
            <input
              id="reminder-time"
              className="field"
              type="time"
              style={{ width: 130 }}
              value={time}
              onChange={(e) => {
                const t = e.target.value || "20:00";
                setTime(t);
                if (on) void run(() => changeReminderTime(t), () => toast(`Reminder moved to ${t}.`));
              }}
            />
          </div>
          <p className="fine">Skipped on days you&apos;ve already logged, so it never nags.</p>
          {on && (
            <button className="btn alt sm" disabled={busy} onClick={() => run(sendTestReminder, () => toast("Test reminder sent. It should arrive in a few seconds."))}>
              Send a test reminder
            </button>
          )}
        </>
      )}
      {err && <p className="err">{err}</p>}
    </section>
  );
}
