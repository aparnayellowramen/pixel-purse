"use client";

import { useEffect } from "react";
import { onSyncMessage, startSync } from "@/lib/store/sync";
import { useToast } from "./toast";

/** Starts syncing the save file with Supabase once the app opens. */
export function SyncBoot() {
  const toast = useToast();
  useEffect(() => {
    const off = onSyncMessage(toast);
    void startSync();
    return off;
  }, [toast]);
  return null;
}
