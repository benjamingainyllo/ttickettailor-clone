import Link from "next/link";
import type { Metadata } from "next";
import { TicketTwoTone } from "@/components/storefront/ticket-mark";
import { TicketCard } from "@/components/storefront/ticket-card";
import { getTicketsByOrderReference, ticketQrSvg } from "@/lib/ticket-lookup";

// The reference is the credential, so never cache or prerender this.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your tickets",
  robots: { index: false, follow: false },
};

export default async function OrderTicketsPage({
  params,
}: {
  params: { reference: string };
}) {
  const result = await getTicketsByOrderReference(params.reference);

  if (!result) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-6">
        <div className="w-full max-w-sm text-center">
          <TicketTwoTone className="mx-auto h-12 w-12 text-zinc-700" />
          <h1 className="mt-4 text-lg font-bold text-white">We can&apos;t find that order</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Use the link in your confirmation email.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm font-semibold text-blue-400 hover:underline">
            Go to Paylance
          </Link>
        </div>
      </main>
    );
  }

  if (result.tickets.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-6">
        <div className="w-full max-w-sm text-center">
          <TicketTwoTone className="mx-auto h-12 w-12 text-zinc-700" />
          <h1 className="mt-4 text-lg font-bold text-white">Nothing issued yet</h1>
          <p className="mt-2 text-sm text-zinc-400">
            This order hasn&apos;t been paid, so there are no tickets on it. If
            you&apos;ve just paid, give it a moment and refresh.
          </p>
        </div>
      </main>
    );
  }

  const withQr = await Promise.all(
    result.tickets.map(async (ticket) => ({
      ticket,
      qrSvg: await ticketQrSvg(ticket.code),
    }))
  );

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-8">
      <div className="mx-auto w-full max-w-sm space-y-5">
        <header className="text-center">
          <h1 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500">
            {withQr.length} {withQr.length === 1 ? "ticket" : "tickets"}
          </h1>
        </header>

        {withQr.map(({ ticket, qrSvg }) => (
          <TicketCard key={ticket.code} ticket={ticket} qrSvg={qrSvg} />
        ))}

        <p className="px-4 text-center text-xs leading-relaxed text-zinc-600">
          Each person needs their own QR code. Scroll between them at the door,
          or forward this link to whoever is coming with you.
        </p>
      </div>
    </main>
  );
}
