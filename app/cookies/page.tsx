import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout, Clause, P, Bullets, Important } from "@/components/marketing/legal-layout";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Cookie policy",
  description:
    "The small number of cookies Paylance uses, what each one does, and how to control them.",
};

/**
 * Kept deliberately short and specific. A cookie policy listing categories
 * that the site does not actually use is worse than none — it is a claim
 * nobody checked. Every row below corresponds to something the code really
 * sets; if a tracker is ever added, it gets a row here in the same change.
 */
const COOKIES = [
  {
    name: "Sign-in session",
    who: "Set by us, through Supabase",
    what: "Keeps you signed in as you move between pages, and proves it is really you when your dashboard loads.",
    life: "Until you sign out, or it expires",
    needed: true,
  },
  {
    name: "Theme preference",
    who: "Stored on your own device",
    what: "Remembers whether you chose the light or dark dashboard. Never leaves your browser and never reaches us.",
    life: "Until you clear your browser data",
    needed: false,
  },
  {
    name: "Site analytics",
    who: "Vercel",
    what: "Counts page views and where visitors arrived from, so we can tell which pages work. It does not use cookies and does not identify you.",
    life: "Not stored on your device",
    needed: false,
  },
];

export default function CookiesPage() {
  return (
    <LegalLayout
      title="Cookie policy"
      intro="There are three things on this list and one of them is required for signing in. We do not run advertising trackers, and nothing here follows you to other websites."
    >
      <Clause n="1." title="What a cookie is">
        <P>
          A cookie is a small file a website stores in your browser so it can
          remember something between one page and the next — most usefully, that
          you are signed in. Some information is kept in similar browser storage
          that never leaves your device at all.
        </P>
      </Clause>

      <Clause n="2." title="Everything we use">
        <div className="mt-2 space-y-3">
          {COOKIES.map((c) => (
            <div
              key={c.name}
              className="rounded-xl border border-[var(--hairline)] bg-[var(--ground-deep)] px-5 py-4"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-[15px] font-extrabold text-[var(--on-ground)]">
                  {c.name}
                </p>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    c.needed
                      ? "bg-[var(--mint)] text-[#1B1512]"
                      : "border border-[var(--hairline-firm)] text-[var(--on-ground-faint)]"
                  }`}
                >
                  {c.needed ? "Required" : "Optional"}
                </span>
              </div>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--on-ground-soft)]">
                {c.what}
              </p>
              <p className="mt-1.5 text-[12.5px] text-[var(--on-ground-faint)]">
                {c.who} · Lasts: {c.life}
              </p>
            </div>
          ))}
        </div>
      </Clause>

      <Clause n="3." title="What we do not use">
        <Important>
          No advertising cookies. No social media tracking pixels. Nothing that
          follows you around other websites, and nothing sold to a data broker.
          If that ever changes, this page changes first and we will ask you.
        </Important>
      </Clause>

      <Clause n="4." title="Why we do not show a cookie banner">
        <P>
          The only cookie we set is the one that keeps you signed in, and a site
          does not need permission for something you asked for by signing in.
          The other two either never leave your device or do not use cookies at
          all.
        </P>
        <P>
          We would rather explain the three things on this page than interrupt
          every visitor with a box to dismiss.
        </P>
      </Clause>

      <Clause n="5." title="Turning them off">
        <P>
          Every browser lets you block or delete cookies, usually under Settings
          then Privacy. Two things worth knowing before you do:
        </P>
        <Bullets
          items={[
            "Blocking the sign-in cookie means you cannot stay signed in — the dashboard will send you back to the login page each time.",
            "Buying a ticket does not require an account, so blocking cookies will not stop you attending anything.",
          ]}
        />
        <P>
          Clearing your browser data also resets your light or dark theme
          choice.
        </P>
      </Clause>

      <Clause n="6." title="More on data">
        <P>
          What we collect and why is set out in the{" "}
          <Link href="/privacy" className="font-semibold text-[var(--coral)] underline">
            privacy policy
          </Link>
          . Questions go to {LEGAL.privacyEmail}.
        </P>
      </Clause>
    </LegalLayout>
  );
}
