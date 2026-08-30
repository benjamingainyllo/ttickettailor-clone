import Link from "next/link";
import type { Metadata } from "next";
import { TicketTwoTone } from "@/components/storefront/ticket-mark";
import { TicketCard } from "@/components/storefront/ticket-card";
import { getTicketByCode, ticketQrSvg } from "@/lib/ticket-lookup";

// The code is the credential, so this must never be cached or prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your ticket",
  robots: { index: false, follow: false },
};

export default async function TicketPage({ params }: { params: { code: string } }) {
  const ticket = await getTicketByCode(params.code);

  if (!ticket) {
    return (
      <main className="dl flex min-h-screen items-center justify-center px-6 font-[family-name:var(--font-bricolage-grotesque)]">
        <div className="w-full max-w-sm text-center">
          <TicketTwoTone className="mx-auto h-12 w-12 text-[var(--dl-ink-faint)]" />
          <h1 className="mt-4 text-[22px] font-extrabold tracking-[-0.025em]">We can&apos;t find that ticket</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--dl-ink-soft)]">
            Check the link in your confirmation email — it&apos;s the whole code,
            dashes and all.
          </p>
          <Link href="/" className="mt-6 inline-block text-[14px] font-extrabold underline underline-offset-2">
            Go to Paylance
          </Link>
        </div>
      </main>
    );
  }

  const qrSvg = await ticketQrSvg(ticket.code);

  return (
    <main className="dl min-h-screen px-4 py-10 font-[family-name:var(--font-bricolage-grotesque)]">
      <div className="mx-auto w-full max-w-sm space-y-4">
        <TicketCard ticket={ticket} qrSvg={qrSvg} />

        {ticket.totalOnOrder > 1 && (
          <Link
            href={`/tickets/${ticket.orderReference}`}
            className="block rounded-[3px] border-2 border-[var(--dl-line)] bg-[var(--dl-panel)] py-3 text-center text-[14px] font-extrabold"
          >
            See all {ticket.totalOnOrder} tickets
          </Link>
        )}

        <p className="px-4 text-center text-[12.5px] leading-relaxed text-[var(--dl-ink-soft)]">
          Screenshot this or keep the email — either works at the door.
        </p>
      </div>
    </main>
  );
}
