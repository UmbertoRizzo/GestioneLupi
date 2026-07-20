import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = { title: { default: "GestioneLupi", template: "%s | GestioneLupi" }, description: "Richieste e documenti scout, in ordine.", manifest: "/manifest.webmanifest", icons: { icon: "/icon.svg", apple: "/icon.svg" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#b4232f" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body>
        {children}
        <Script src="https://umbertorizzo.github.io/Jeff/widget.js?v=20260716-3" strategy="afterInteractive" />
      </body>
    </html>
  );
}
