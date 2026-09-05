import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout, Clause, P, Bullets, Important } from "@/components/marketing/legal-layout";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of service",
  description:
    "The agreement between Paylance and the people who sell and buy tickets through it.",
};

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of service"
      intro="The agreement between us and you. It matters most on one point: we provide the software, the organiser sells the ticket, and the money goes straight to them rather than to us."
    >
      <Clause n="1." title="Who this is between">
        <P>
          These terms are an agreement between {LEGAL.entity} ({LEGAL.registration}),
          registered at {LEGAL.address}, which operates {LEGAL.product}, and you.
        </P>
        <P>
          They apply whether you are an <strong>organiser</strong> selling
          tickets through {LEGAL.product}, or an <strong>attendee</strong> buying
          one. Some clauses apply only to one or the other, and say so.
        </P>
        <P>
          By creating an account or buying a ticket you accept these terms. If
          you do not accept them, do not use the service.
        </P>
      </Clause>

      <Clause n="2." title="What Paylance is, and what it is not">
        <P>
          {LEGAL.product} is software that lets an organiser sell tickets and
          check people in at the door. That is the whole of what we provide.
        </P>
        <Important>
          We are not the seller of any ticket, the promoter of any event, or a
          party to the contract between an organiser and an attendee. When you
          buy a ticket you are buying it from the organiser, and it is the
          organiser who owes you the event.
        </Important>
        <P>
          We are also not a bank, and we do not provide payment services. Card
          and transfer payments are processed by a licensed payment provider, on
          their terms as well as ours.
        </P>
      </Clause>

      <Clause n="3." title="Your account">
        <Bullets
          items={[
            "You must be at least 18 and able to enter a contract.",
            "The details you give us must be accurate, and you must keep them up to date — particularly your bank account.",
            "You are responsible for what happens under your account, and for keeping your password to yourself.",
            "One person or organisation, one account. Do not create an account on behalf of somebody else without their authority.",
          ]}
        />
        <P>
          Tell us promptly if you think somebody else has got into your account.
        </P>
      </Clause>

      <Clause n="4." title="Publishing an event">
        <P>
          Anybody can create a draft. Putting a <strong>paid</strong> event on
          sale requires a verified bank account first, because there would
          otherwise be nowhere for the money to go. Free events can be published
          without one.
        </P>
        <P>As the organiser you are responsible for:</P>
        <Bullets
          items={[
            "The event actually happening, as described, at the time and place advertised.",
            "Everything on your event page being accurate — the date, the venue, the price, the line-up, the restrictions.",
            "Any licence, permit, insurance or permission the event needs.",
            "Safety, capacity limits and access at the venue.",
            "Whatever you promise your attendees, including any age limit or dress code you set.",
          ]}
        />
      </Clause>

      <Clause n="5." title="Our fee">
        <P>
          We charge a percentage of each paid ticket sold, subject to a cap
          per ticket, and nothing at all below a minimum ticket price or on a
          free event. The current rate, cap and floor are published in full on
          our{" "}
          <Link href="/pricing" className="font-semibold text-[var(--coral)] underline">
            pricing page
          </Link>
          , and the fee charged on any order is itemised on that order.
        </P>
        <Bullets
          items={[
            "Tickets under ₦2,000, and free tickets, carry no fee at all.",
            "The fee is taken at the moment of sale. There is no invoice and nothing to pay separately.",
            "If a ticket does not sell, there is no fee.",
            "You may choose, per event, to add the fee to the buyer's total instead of absorbing it. Where you do, the buyer sees it as a separate line before paying.",
            "We may change our fees. Changes take effect for events published after we announce them, never retroactively for tickets already sold.",
          ]}
        />
        <P>
          Your payment provider charges its own processing fees. Those are
          separate from ours, are set by them, and would apply on any platform.
        </P>
      </Clause>

      <Clause n="6." title="How the money moves">
        <Important>
          We never hold your money. Payment is split at the moment of purchase
          and your share settles directly to your own bank account. There is no
          wallet, no balance and nothing to withdraw, by design.
        </Important>
        <P>
          Because of this, how quickly funds reach you is a matter for your bank
          and the payment provider, not for us. We are not in the middle and can
          neither delay nor accelerate a settlement.
        </P>
        <P>
          It also means we cannot reverse a payment that has already settled to
          you. See clause 7.
        </P>
      </Clause>

      <Clause n="7." title="Refunds, cancellations and disputes">
        <P>
          <strong>Refunds are the organiser&apos;s responsibility.</strong> You
          set your own refund policy and you must state it on your event page.
          If you cancel, move or materially change an event, you are responsible
          for refunding your attendees.
        </P>
        <P>
          We cannot issue a refund out of money we never received. Where a
          refund is due, it comes from the organiser.
        </P>
        <P>
          If an attendee reverses a payment through their bank — a chargeback —
          the amount, and any fee the payment provider charges for it, is
          recoverable from the organiser whose event it relates to. You agree to
          reimburse us for any such amount we are debited in respect of your
          events, and we may set it off against fees or other sums.
        </P>
        <P>
          Where an event is repeatedly disputed, or we have reasonable grounds
          to believe it will not take place, we may stop ticket sales for it.
        </P>
      </Clause>

      <Clause n="8." title="If you are buying a ticket">
        <Bullets
          items={[
            "Your ticket is permission to attend, granted by the organiser and subject to their terms and the venue's.",
            "Each ticket admits one person once. A ticket that has already been scanned will not be accepted again.",
            "Do not share, screenshot or resell your ticket for profit — a duplicated code will be refused at the door.",
            "Your contract for the event is with the organiser. Refunds, cancellations and complaints about the event go to them first.",
            "We will pass on what we can to help you reach the organiser, but we cannot make them refund you.",
          ]}
        />
      </Clause>

      <Clause n="9." title="What may not be sold">
        <P>
          You may not use {LEGAL.product} to sell tickets to, or in connection
          with:
        </P>
        <Bullets
          items={[
            "Anything illegal under the laws of Nigeria or of the country where the event takes place.",
            "An event you have no right or authority to run.",
            "Gambling, lotteries or anything requiring a licence you do not hold.",
            "Events promoting violence, hatred or discrimination against people.",
            "Anything designed to defraud attendees, including events you do not intend to hold.",
            "Sales that exist to move or disguise the origin of funds.",
          ]}
        />
        <P>
          We may remove an event, suspend an account and report the matter where
          we reasonably believe this clause has been broken.
        </P>
      </Clause>

      <Clause n="10." title="Your content">
        <P>
          Event titles, descriptions, images and anything else you upload remain
          yours. You give us permission to host, display and reproduce that
          material for the purpose of running the service and showing your event
          page — nothing more.
        </P>
        <P>
          You must have the right to use whatever you upload. Do not use images
          you do not have permission for.
        </P>
      </Clause>

      <Clause n="11." title="Your attendees' data">
        <P>
          The list of people who bought tickets to your event is yours, and you
          are responsible for it under data protection law in your own right —
          not as an extension of us. If you export it or market to it, that is
          your decision and your obligation.
        </P>
        <P>
          Our{" "}
          <Link href="/privacy" className="font-semibold text-[var(--coral)] underline">
            privacy policy
          </Link>{" "}
          explains what we do with personal data.
        </P>
      </Clause>

      <Clause n="12." title="Availability">
        <P>
          We work to keep the service running and the door scanner working on
          the night. We do not guarantee it will be uninterrupted or error-free,
          and we may take it down for maintenance.
        </P>
        <P>
          Every ticket carries a short code as well as a QR code, so a door can
          keep working if a camera or a connection fails. We recommend you
          export your attendee list before an event as a fallback.
        </P>
      </Clause>

      <Clause n="13." title="Suspending or closing an account">
        <P>
          You may stop using the service at any time. There is no minimum term
          and no notice period.
        </P>
        <P>
          We may suspend or close an account that breaches these terms, that we
          reasonably believe is being used fraudulently, or where we are
          required to by law. Where it is safe and lawful to do so we will tell
          you why.
        </P>
        <P>
          Tickets already sold for a genuine upcoming event remain valid where
          we are able to honour them.
        </P>
      </Clause>

      <Clause n="14." title="Our responsibility to you">
        <P>
          Nothing here limits liability for death or personal injury caused by
          our negligence, for fraud, or for anything else that cannot lawfully
          be limited.
        </P>
        <P>
          Subject to that, and because we are not the seller of the ticket, we
          are not responsible for an event being cancelled, changed or falling
          short of what was promised. That sits with the organiser.
        </P>
        <P>
          Our total liability to you in connection with the service is limited
          to the fees we earned from you in the twelve months before the claim.
          We are not liable for lost profit, lost revenue or lost opportunity.
        </P>
      </Clause>

      <Clause n="15." title="Changes to these terms">
        <P>
          We may update these terms. The date at the top shows when they last
          changed. Where a change materially affects you we will give notice
          before it takes effect. Continuing to use the service after that means
          you accept the new version.
        </P>
      </Clause>

      <Clause n="16." title="Law">
        <P>
          These terms are governed by the laws of {LEGAL.jurisdiction}, and the
          courts of {LEGAL.jurisdiction} have jurisdiction over any dispute.
        </P>
        <P>
          If any part of these terms is found unenforceable, the rest continues
          to apply.
        </P>
      </Clause>
    </LegalLayout>
  );
}
