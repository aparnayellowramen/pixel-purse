import { ImageResponse } from "next/og";

// The pixel coin from the app, drawn on the dark background. "#" = coin, "o" = shine.
const COIN = ["..####..", ".##oo##.", "##.##.##", "##.##.##", "##.##.##", "##.##.##", ".##..##.", "..####.."];

/** Square app icon as a PNG. `pad` is the margin around the coin as a share of the size. */
export function appIcon(size: number, pad = 0.2) {
  const cell = Math.floor((size * (1 - pad * 2)) / 8);
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, background: "#121018", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {COIN.map((row, y) => (
            <div key={y} style={{ display: "flex" }}>
              {[...row].map((c, x) => (
                <div
                  key={x}
                  style={{ width: cell, height: cell, background: c === "#" ? "#f6b52d" : c === "o" ? "#ffe08a" : "transparent" }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
