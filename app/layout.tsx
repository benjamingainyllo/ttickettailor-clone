import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  Instrument_Serif,
  Abril_Fatface,
  Pinyon_Script,
  Space_Mono,
  Cormorant_Garamond,
} from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage-grotesque"
});

// Editorial counterweight to Bricolage's chunkiness — used only for
// accent words on the marketing site, never in the app.
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif"
});

/**
 * The faces an organiser can set their event title in. See
 * lib/title-styles.ts, which is the source of truth for which id maps to
 * which family.
 *
 * DECLARING SEVEN DOES NOT DOWNLOAD SEVEN. next/font emits a @font-face
 * per family and self-hosts the files, but a browser only fetches a font
 * file once something on the page actually renders in it. An event page
 * uses exactly one title face, so a buyer downloads one — which matters,
 * because most of them are opening this on mobile data.
 *
 * "Simple" is deliberately absent: it uses the system stack and costs
 * nothing at all.
 */
const abrilFatface = Abril_Fatface({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-abril-fatface",
});

const pinyonScript = Pinyon_Script({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-pinyon-script",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-space-mono",
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  variable: "--font-cormorant",
});

const SITE_TITLE = "Paylance — Sell tickets from ₦200 a ticket, never a percentage";

const SITE_DESCRIPTION =
  "Event ticketing with a flat fee per ticket — from ₦200 — and no cut of your revenue. Set your ticket types, share one link, scan people in at the door — and the money settles straight to your own bank account.";

export const metadata: Metadata = {
  title: {
    default: SITE_TITLE,
    template: "%s | Paylance"
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "event ticketing",
    "sell event tickets",
    "flat fee ticketing",
    "ticket check-in app",
    "QR ticket scanner",
    "event ticketing Nigeria"
  ],
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: "Paylance",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                const savedTheme = localStorage.getItem("theme") || "dark";
                document.documentElement.setAttribute("data-theme", savedTheme);
              })();
            `
          }}
        />
      </head>
      <body
        className={[
          bricolageGrotesque.variable,
          instrumentSerif.variable,
          abrilFatface.variable,
          pinyonScript.variable,
          spaceMono.variable,
          cormorantGaramond.variable,
        ].join(" ")}
      >
        <AuthProvider>
          {children}
          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              style: {
                background: "#18181b",
                border: "1px solid #27272a",
                color: "#fafafa",
              },
            }}
          />
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  );
}
