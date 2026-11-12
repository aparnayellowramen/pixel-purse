import { appIcon } from "@/lib/app-icon";

export const dynamic = "force-static";

export function GET() {
  // Extra margin so Android's round "maskable" crop never cuts the coin.
  return appIcon(512, 0.24);
}
