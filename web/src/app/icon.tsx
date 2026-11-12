import { appIcon } from "@/lib/app-icon";

// Browser tab icon.
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return appIcon(64, 0.1);
}
