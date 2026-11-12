"use client";

import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { PageShell } from "@/components/page-shell";
import { useToast } from "@/components/toast";
import { getState } from "@/lib/store/app-store";

export default function SaveProgressPage() {
  const router = useRouter();
  const toast = useToast();
  return (
    <PageShell title="Account">
      {() => (
        <AuthForm
          mode="save"
          onDone={(mode) => {
            toast(mode === "load" ? `Save file loaded. Level ${getState().level}.` : "Progress saved. Your save file is safe.");
            router.replace(getState().started ? "/settings" : "/start");
          }}
          skip={{ label: "Not now", onClick: () => router.back() }}
        />
      )}
    </PageShell>
  );
}
