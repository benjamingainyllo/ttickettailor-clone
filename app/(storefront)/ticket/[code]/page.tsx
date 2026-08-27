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
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-6">
        <div className="w-full max-w-sm text-center">
          <TicketTwoTone className="mx-auto h-12 w-12 text-zinc-700" />
          <h1 className="mt-4 text-lg font-bold text-white">We can&apos;t find that ticket</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Check the link in your confirmation email — it&apos;s the whole code,
            dashes and all.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm font-semibold text-blue-400 hover:underline">
            Go to Paylance
          </Link>
        </div>
      </main>
    );
  }

  const qrSvg = await ticketQrSvg(ticket.code);

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-8">
      <div className="mx-auto w-full max-w-sm space-y-4">
        <TicketCard ticket={ticket} qrSvg={qrSvg} />

        {ticket.totalOnOrder > 1 && (
          <Link
            href={`/tickets/${ticket.orderReference}`}
            className="block rounded-xl border border-zinc-800 bg-zinc-900 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
          >
            See all {ticket.totalOnOrder} tickets
          </Link>
        )}

        <p className="px-4 text-center text-xs leading-relaxed text-zinc-600">
          Screenshot this or keep the email — either works at the door.
        </p>
      </div>
    </main>
  );
}
