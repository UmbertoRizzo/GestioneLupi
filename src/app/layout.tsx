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
        <Script id="jeff-widget-config" strategy="beforeInteractive">
          {`
            window.JeffWidgetConfig = {
              siteId: "gestione-lupi",
              assistantName: "Jeff",
              buttonText: "Assistente virtuale",
              welcomeMessage: "Ciao, io sono solo un assistente dimostrativo, su questo sito non posso fare molto. Se pensi che io possa essere utile per il tuo sito, scrivi all'amministratore di GestioneLupi alla mail udrizzo04@gmail.com!",
              inputPlaceholder: "Scrivi una domanda...",
              primaryColor: "#323d49",
              secondaryColor: "#f5f5f5",
              textColor: "#ffffff",
              backendUrl: "https://jeff-b2gq.onrender.com/chat"
            };
          `}
        </Script>

        <Script id="jeff-widget-loader" strategy="afterInteractive">
          {`
            const script = document.createElement("script");
            script.src = "https://umbertorizzo.github.io/Jeff/frontend/widget.js?v=" + Date.now();
            script.defer = true;
            document.body.appendChild(script);
          `}
        </Script>
      </body>
    </html>
  );
}
