import type { Metadata, Viewport } from "next";
import { Manrope, Silkscreen } from "next/font/google";
import { SheetsProvider } from "@/components/sheets";
import { ToastProvider } from "@/components/toast";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const silkscreen = Silkscreen({ variable: "--font-silkscreen", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Pixel Purse",
  description: "Type what you spend. Keep your bars alive.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f3fa" },
    { media: "(prefers-color-scheme: dark)", color: "#121018" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Font variables live on <html> because the :root theme tokens reference them.
    <html lang="en" className={`${manrope.variable} ${silkscreen.variable}`}>
      <body>
        <ToastProvider>
          <SheetsProvider>{children}</SheetsProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
