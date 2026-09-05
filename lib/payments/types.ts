import type { Kobo } from "@/lib/money";

/**
 * Provider-agnostic payment contract.
 *
 * Nothing outside `lib/payments/` should know that Paystack exists. Swapping
 * or adding a processor means adding an implementation of this interface,
 * not touching checkout, webhooks, or the database.
 */

/** How the buyer actually funded the payment. NOT the provider. */
export type PaymentChannel =
  | "card"
  | "bank_transfer"
  | "dedicated_account"
  | "ussd"
  | "qr"
  | "unknown";

export type OrderStatus = "pending" | "paid" | "failed" | "abandoned" | "refunded";

export interface InitializeCheckoutParams {
  /** Our own reference. The provider echoes this back on every event. */
  reference: string;
  buyerEmail: string;
  amountKobo: Kobo;
  /** The platform's cut. The remainder settles to the creator's own bank. */
  platformFeeKobo: Kobo;
  /**
   * The buyer-funded processing fee already included in amountKobo. Added
   * to the provider's transaction charge so the bank's cut comes out of
   * our side rather than the organiser's. See lib/processing-fee.ts.
   */
  processingFeeKobo?: Kobo;
  /**
   * The creator's provider-side subaccount. REQUIRED for paid checkouts —
   * it is what makes the money split at transaction time instead of
   * landing in the platform's account.
   */
  providerSubaccountId: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export interface InitializeCheckoutResult {
  authorizationUrl: string;
  providerReference: string | null;
}

export interface VerifiedTransaction {
  status: OrderStatus;
  reference: string;
  providerReference: string | null;
  amountKobo: Kobo;
  /** Processor fee, when the provider reports it. */
  providerFeeKobo: Kobo;
  channel: PaymentChannel;
  paidAt: string | null;
}

export interface CreateSubaccountParams {
  businessName: string;
  bankCode: string;
  accountNumber: string;
  /**
   * The platform's default percentage, in basis points (900 = 9%).
   * Per-transaction fees override this at checkout time.
   */
  platformFeeBps: number;
}

export interface CreateSubaccountResult {
  providerSubaccountId: string;
  accountName: string | null;
}

export interface ResolvedBankAccount {
  accountName: string;
  accountNumber: string;
}

export interface Bank {
  name: string;
  code: string;
}

export interface RefundParams {
  /** Our own order reference. Providers key refunds off the transaction. */
  reference: string;
  amountKobo: Kobo;
  reason?: string;
}

export interface RefundResult {
  ok: boolean;
  /** Provider's id for the refund, when it gives one. */
  providerRefundId?: string | null;
  /** Providers often accept a refund and settle it later. */
  status: "processing" | "refunded" | "failed";
  error?: string;
}

/** What a dispute looks like once the provider shape is stripped off. */
export interface NormalizedDispute {
  providerDisputeId: string;
  /** Our order reference, so it can be joined to a sale. */
  reference: string | null;
  amountKobo: Kobo;
  category: string | null;
  reason: string | null;
  status: "open" | "evidence_submitted" | "won" | "lost" | "closed";
  /** When the provider stops accepting evidence. */
  deadlineAt: string | null;
}

export interface NormalizedWebhookEvent {
  /** The creator subaccount this event relates to, when the event carries one. */
  providerSubaccountId: string | null;
  /** Provider's own event id, when it supplies one. Used for idempotency. */
  providerEventId: string | null;
  type: "payment.succeeded" | "payment.failed" | "settlement.succeeded" | "unhandled";
  reference: string | null;
  providerReference: string | null;
  amountKobo: Kobo | null;
  providerFeeKobo: Kobo | null;
  channel: PaymentChannel;
  paidAt: string | null;
  raw: unknown;
}

export interface PaymentProvider {
  readonly name: string;
  /** HTTP header this provider signs its webhooks with. */
  readonly webhookSignatureHeader: string;

  initializeCheckout(params: InitializeCheckoutParams): Promise<InitializeCheckoutResult>;
  verifyTransaction(reference: string): Promise<VerifiedTransaction>;

  createSubaccount(params: CreateSubaccountParams): Promise<CreateSubaccountResult>;
  listBanks(): Promise<Bank[]>;
  resolveAccountNumber(accountNumber: string, bankCode: string): Promise<ResolvedBankAccount>;

  /** Send money back to the buyer. Partial amounts allowed. */
  refund(params: RefundParams): Promise<RefundResult>;

  verifyWebhookSignature(rawBody: string, signature: string | null): boolean;
  parseWebhookEvent(payload: unknown): NormalizedWebhookEvent;
  /** Null when the payload isn't a dispute event. */
  parseDisputeEvent(payload: unknown): NormalizedDispute | null;
}
