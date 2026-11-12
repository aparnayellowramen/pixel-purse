"use client";

import Link from "next/link";
import type { AppState } from "@/lib/domain/types";
import { useAppState } from "@/lib/store/app-store";
import { PixelIcon } from "./pixel-icon";

/** A secondary screen: back button, title, scrolling content. */
export function PageShell({ title, children }: { title: string; children: (s: AppState) => React.ReactNode }) {
  const s = useAppState();
  return (
    <div className="device">
      <div className="scr">
        <header className="top">
          <Link className="ib" href="/" aria-label="Back">
            <PixelIcon name="back" />
          </Link>
          <h1 className="title">{title}</h1>
        </header>
        <div className="scroll">{s ? children(s) : null}</div>
      </div>
    </div>
  );
}
