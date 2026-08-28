import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout, Clause, P, Bullets, Important } from "@/components/marketing/legal-layout";
import { LEGAL, PROCESSORS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What personal information Paylance collects, why, who it is shared with, and the rights you have over it.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy policy"
      intro="What we collect, why we have it, who else sees it, and what you can make us do about it. Written to be read rather than to be survived."
    >
      <Clause n="1." title="Who is responsible for your data">
        <P>
          {LEGAL.entity} ({LEGAL.registration}), of {LEGAL.address}, operates{" "}
          {LEGAL.product} and is the data controller for the information
          described here. We handle personal data under the Nigeria Data
          Protection Act 2023.
        </P>
        <P>
          For anything about your data, write to {LEGAL.privacyEmail}.
        </P>
        <Important>
          One thing to be clear about up front: when you buy a ticket, the
          organiser of that event also holds your details and is responsible
          for them separately from us. See clause 7.
        </Important>
      </Clause>

      <Clause n="2." title="What we collect">
        <P>
          <strong>If you open an organiser account:</strong>
        </P>
        <Bullets
          items={[
            "Your name and email address.",
            "Your public handle, and anything you choose to add to your profile — a photo, a short description, a location.",
            "Your bank details, so your ticket money can reach you. See clause 3, because we deliberately store very little of this.",
            "The events you create, and the orders and tickets that result.",
          ]}
        />
        <P>
          <strong>If you buy a ticket:</strong>
        </P>
        <Bullets
          items={[
            "Your name, email address and, where you give it, your phone number.",
            "What you bought, when, and for how much.",
            "Whether and when your ticket was scanned at the door.",
          ]}
        />
        <P>
          <strong>Automatically, from any visit:</strong> the pages you looked
          at, roughly which country you were in, and what browser and device you
          used. We do not build advertising profiles and we do not sell any of
          this.
        </P>
        <P>
          You do not need an account to buy a ticket, and we do not create one
          for you.
        </P>
      </Clause>

      <Clause n="3." title="Bank details and card numbers">
        <Important>
          We never see your card number. It goes directly to our payment
          provider and never touches our systems. And of your bank account
          number, we store only the last four digits — enough to show you which
          account is connected, and useless to anybody who obtained it.
        </Important>
        <P>
          The full account number is passed to the payment provider once, so
          they can verify the account and settle your money into it. They hold
          it under their own licence and their own security obligations. We do
          not keep a copy.
        </P>
      </Clause>

      <Clause n="4." title="Why we hold it">
        <Bullets
          items={[
            <>
              <strong>To perform our contract with you</strong> — creating your
              account, taking payment, issuing tickets, letting a door scan them.
              Without this data the service cannot function.
            </>,
            <>
              <strong>Because we have a legitimate interest</strong> — keeping the
              service secure, preventing fraud and duplicate tickets,
              understanding which pages people use so we can improve them.
            </>,
            <>
              <strong>Because the law requires it</strong> — transaction records
              have to be kept for tax and anti-fraud purposes.
            </>,
            <>
              <strong>Because you agreed</strong> — for anything optional, such as
              marketing email. You can withdraw that at any time.
            </>,
          ]}
        />
      </Clause>

      <Clause n="5." title="Who else sees it">
        <P>
          We share personal data only with the companies that make the service
          work, and only with what they need. We do not sell data to anybody.
        </P>

        <div className="mt-4 space-y-3">
          {PROCESSORS.map((p) => (
            <div
              key={p.name}
              className="rounded-xl border border-[var(--hairline)] bg-[var(--ground-deep)] px-5 py-4"
            >
              <p className="text-[15px] font-extrabold text-[var(--on-ground)]">
                {p.name}
                <span className="ml-2 text-[12.5px] font-semibold text-[var(--on-ground-faint)]">
                  {p.role}
                </span>
              </p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--on-ground-soft)]">
                {p.what}
              </p>
              <p className="mt-1 text-[12.5px] text-[var(--on-ground-faint)]">
                Processes data in: {p.where}
              </p>
            </div>
          ))}
        </div>

        <P>
          We may also disclose data where we are legally required to, or to
          establish or defend a legal claim.
        </P>
      </Clause>

      <Clause n="6." title="Where your data goes">
        <P>
          Some of the companies above process data outside Nigeria. Where
          personal data leaves Nigeria we rely on the transfer conditions in the
          Nigeria Data Protection Act 2023, including contractual protections
          with each provider requiring them to protect it to a comparable
          standard.
        </P>
      </Clause>

      <Clause n="7." title="Organisers and their attendees">
        <P>
          If you buy a ticket, the organiser of that event receives your name,
          email address and what you bought. They need it to run the door and to
          contact you if the event changes.
        </P>
        <Important>
          That organiser is responsible for your data in their own right. What
          they do with it afterwards — including whether they email you about
          future events — is their decision and their legal obligation, not
          ours. If you want them to delete your details, ask them.
        </Important>
        <P>
          Organisers: exporting your attendee list makes you responsible for
          that copy of it.
        </P>
      </Clause>

      <Clause n="8." title="How long we keep it">
        <Bullets
          items={[
            "Account details: while your account is open, and for a period afterwards to handle anything outstanding.",
            "Orders, tickets and transaction records: at least seven years, because tax and financial record-keeping rules require it. This is why closing your account does not erase your sales history.",
            "Technical and analytics data: a short period, in aggregate.",
            "Anything you asked us to delete, where no legal duty requires us to keep it: removed.",
          ]}
        />
      </Clause>

      <Clause n="9." title="Your rights">
        <P>
          Under the Nigeria Data Protection Act 2023 you can ask us to:
        </P>
        <Bullets
          items={[
            "Show you the personal data we hold about you.",
            "Correct it if it is wrong.",
            "Delete it, where we have no continuing legal reason to keep it.",
            "Stop or limit a particular use of it.",
            "Give you a copy in a portable format, or send it to somebody else.",
            "Stop sending you marketing, at any time and without a reason.",
          ]}
        />
        <P>
          Write to {LEGAL.privacyEmail}. We will respond within thirty days. We
          may need to confirm who you are first, so that we do not hand your
          data to somebody else.
        </P>
        <P>
          If you are not satisfied with how we have handled it, you can complain
          to the Nigeria Data Protection Commission.
        </P>
      </Clause>

      <Clause n="10." title="Keeping it safe">
        <Bullets
          items={[
            "Everything travels over an encrypted connection.",
            "Access to data in our database is restricted at the row level, so one organiser cannot read another's events, orders or attendees.",
            "Card numbers never reach us, and we store only the last four digits of a bank account.",
            "Access to production systems is limited to those who need it.",
          ]}
        />
        <P>
          No system is perfectly secure. If a breach occurs that is likely to
          put you at risk, we will notify you and the Commission as the law
          requires.
        </P>
      </Clause>

      <Clause n="11." title="Children">
        <P>
          The service is not for under-18s and we do not knowingly collect their
          data. An event may admit under-18s — that is the organiser&apos;s
          arrangement with them. If you believe a child has given us personal
          data, write to us and we will remove it.
        </P>
      </Clause>

      <Clause n="12." title="Cookies">
        <P>
          Covered separately, in short, on our{" "}
          <Link href="/cookies" className="font-semibold text-[var(--coral)] underline">
            cookie policy
          </Link>
          .
        </P>
      </Clause>

      <Clause n="13." title="Changes">
        <P>
          When this policy changes, the date at the top changes with it. If a
          change materially affects how we use your data, we will tell you
          before it takes effect.
        </P>
      </Clause>
    </LegalLayout>
  );
}
