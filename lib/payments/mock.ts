import type {
  Bank,
  CreateSubaccountParams,
  CreateSubaccountResult,
  InitializeCheckoutParams,
  InitializeCheckoutResult,
  NormalizedWebhookEvent,
  PaymentProvider,
  ResolvedBankAccount,
  VerifiedTransaction,
  RefundParams,
  RefundResult,
  NormalizedDispute,
} from "./types";

/**
 * Demo payment provider.
 *
 * Used automatically when no real provider is configured, so the whole
 * product — publishing, checkout, orders, revenue, payouts — can be built
 * and demonstrated before a payment gateway exists.
 *
 * It moves NO money and talks to no one. Checkout redirects to an in-app
 * page where a payment can be completed or failed by hand, which then flows
 * through exactly the same order-settlement code a real provider would use.
 *
 * The interface is identical to the real thing on purpose: when the gateway
 * arrives, nothing outside lib/payments/ changes.
 */

const DEMO_BANKS: Bank[] = [
  { name: "Demo Bank", code: "001" },
  { name: "Test Savings & Trust", code: "002" },
  { name: "Sandbox Microfinance", code: "003" },
  { name: "Example Commercial Bank", code: "004" },
];

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "demo";
  readonly webhookSignatureHeader = "x-demo-signature";

  async initializeCheckout(params: InitializeCheckoutParams): Promise<InitializeCheckoutResult> {
    // Same guard as the real provider: a paid checkout without a
    // destination account is a bug, even in demo mode.
    if (!params.providerSubaccountId) {
      throw new Error("Refusing to start a paid checkout without a payout account.");
    }

    const url = new URL(params.callbackUrl);
    const origin = `${url.protocol}//${url.host}`;

    return {
      authorizationUrl: `${origin}/checkout/demo?reference=${encodeURIComponent(params.reference)}`,
      providerReference: `demo_${params.reference}`,
    };
  }

  /**
   * The demo checkout page settles the order directly, so by the time the
   * return page verifies, there is nothing left to confirm. Reporting
   * "pending" here lets the caller fall back to reading the stored order.
   */
  async verifyTransaction(reference: string): Promise<VerifiedTransaction> {
    return {
      status: "pending",
      reference,
      providerReference: `demo_${reference}`,
      amountKobo: 0,
      providerFeeKobo: 0,
      channel: "unknown",
      paidAt: null,
    };
  }

  async createSubaccount(params: CreateSubaccountParams): Promise<CreateSubaccountResult> {
    return {
      providerSubaccountId: `DEMO_ACCT_${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      accountName: params.businessName,
    };
  }

  async listBanks(): Promise<Bank[]> {
    return DEMO_BANKS;
  }

  async resolveAccountNumber(
    accountNumber: string,
    bankCode: string
  ): Promise<ResolvedBankAccount> {
    if (!/^\d{10}$/.test(accountNumber)) {
      throw new Error("Enter a 10-digit account number.");
    }
    const bank = DEMO_BANKS.find((b) => b.code === bankCode);
    return {
      accountName: `Demo Account (${bank?.name ?? "Unknown bank"})`,
      accountNumber,
    };
  }

  /** No inbound webhooks exist in demo mode. */
  verifyWebhookSignature(): boolean {
    return false;
  }

  parseWebhookEvent(payload: unknown): NormalizedWebhookEvent {
    return {
      providerEventId: null,
      providerSubaccountId: null,
      type: "unhandled",
      reference: null,
      providerReference: null,
      amountKobo: null,
      providerFeeKobo: null,
      channel: "unknown",
      paidAt: null,
      raw: payload,
    };
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    console.log(
      `\n──── REFUND (demo — no money moved) ────\n` +
        `Order:  ${params.reference}\n` +
        `Amount: ${params.amountKobo} kobo\n` +
        `Reason: ${params.reason ?? "—"}\n`
    );
    return { ok: true, providerRefundId: `demo-refund-${Date.now()}`, status: "refunded" };
  }

  /** The demo provider never raises a dispute against itself. */
  parseDisputeEvent(): NormalizedDispute | null {
    return null;
  }
}
