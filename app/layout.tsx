import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Serif } from "next/font/google";
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
      <body className={`${bricolageGrotesque.variable} ${instrumentSerif.variable}`}>
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
