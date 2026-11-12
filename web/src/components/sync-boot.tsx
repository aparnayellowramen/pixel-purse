"use client";

import { useEffect, useState } from "react";
import { registerServiceWorker } from "@/lib/pwa";
import { onSyncMessage, startSync } from "@/lib/store/sync";
import { useToast } from "./toast";

/** App start-up: offline support, syncing the save file, and an "offline" note when the connection drops. */
export function SyncBoot() {
  const toast = useToast();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    registerServiceWorker();
    const off = onSyncMessage(toast);
    void startSync();
    return off;
  }, [toast]);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    const back = () => {
      update();
      toast("Back online. Your changes are syncing.");
    };
    window.addEventListener("offline", update);
    window.addEventListener("online", back);
    return () => {
      window.removeEventListener("offline", update);
      window.removeEventListener("online", back);
    };
  }, [toast]);

  if (!offline) return null;
  return (
    <div className="offline-note" role="status">
      Offline · you can keep logging, it saves on this phone and syncs later
    </div>
  );
}
