import crypto from "crypto";
import type { Kobo } from "@/lib/money";
import type {
  Bank,
  CreateSubaccountParams,
  CreateSubaccountResult,
  InitializeCheckoutParams,
  InitializeCheckoutResult,
  NormalizedWebhookEvent,
  PaymentChannel,
  PaymentProvider,
  ResolvedBankAccount,
  VerifiedTransaction,
} from "./types";

const BASE_URL = "https://api.paystack.co";

/**
 * Who Paystack deducts its processing fee from. SETTLED: "account".
 *
 * Read this with lib/processing-fee.ts, because on its own it looks
 * backwards. The decision is that the BUYER pays processing and the
 * organiser pays only Paylance's fee. Paystack has no "buyer" bearer, so
 * it is done in two parts:
 *
 *   1. the buyer is charged the ticket price PLUS the processing fee
 *      (worked out by grossUpForProcessing)
 *   2. that same processing fee is added to transaction_charge, and
 *      Paystack deducts its real fee from there
 *
 * So Paylance's charge covers the bank and nets out to exactly its own
 * fee, and the organiser's settlement is untouched by processing. Setting
 * this back to "subaccount" without also changing the charge maths would
 * silently take the fee out of the organiser's money twice over.
 */
const PROCESSING_FEE_BEARER: "account" | "subaccount" = "account";

function secretKey(): string {
  const key = process.env.PAYMENTS_PROVIDER_SECRET_KEY ?? process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error("Missing payment provider secret key");
  }
  return key;
}

async function call<T = any>(
  path: string,
  init?: { method?: string; body?: unknown }
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  const json = await response.json().catch(() => null);

  if (!response.ok || json?.status === false) {
    throw new Error(json?.message || `Payment provider request failed (${response.status})`);
  }

  return json as T;
}

function mapChannel(channel: unknown): PaymentChannel {
  switch (channel) {
    case "card":
      return "card";
    case "bank_transfer":
    case "bank":
      return "bank_transfer";
    case "dedicated_nuban":
      return "dedicated_account";
    case "ussd":
      return "ussd";
    case "qr":
      return "qr";
    default:
      return "unknown";
  }
}

export class PaystackProvider implements PaymentProvider {
  readonly name = "paystack";
  readonly webhookSignatureHeader = "x-paystack-signature";

  /**
   * Initializes a SPLIT transaction.
   *
   * `subaccount` + `transaction_charge` is what keeps Paylance out of the
   * money: Paystack splits at transaction time, the creator's share settles
   * to their own bank account, and we only ever receive `transaction_charge`.
   * Never initialize a paid checkout without a subaccount.
   */
  async initializeCheckout(params: InitializeCheckoutParams): Promise<InitializeCheckoutResult> {
    if (!params.providerSubaccountId) {
      throw new Error(
        "Refusing to initialize a paid checkout without a subaccount — that would make the platform custody funds."
      );
    }

    const json = await call("/transaction/initialize", {
      method: "POST",
      body: {
        email: params.buyerEmail,
        amount: params.amountKobo, // Paystack takes kobo directly
        currency: "NGN",
        reference: params.reference,
        callback_url: params.callbackUrl,
        subaccount: params.providerSubaccountId,
        // Our fee PLUS the buyer-funded processing, because with
        // bearer "account" Paystack takes its cut from this number. What
        // is left after it does is exactly params.platformFeeKobo.
        transaction_charge: params.platformFeeKobo + (params.processingFeeKobo ?? 0),
        bearer: PROCESSING_FEE_BEARER,
        metadata: params.metadata,
      },
    });

    if (!json?.data?.authorization_url) {
      throw new Error("Payment provider did not return a checkout URL");
    }

    return {
      authorizationUrl: json.data.authorization_url,
      providerReference: json.data.reference ?? null,
    };
  }

  async verifyTransaction(reference: string): Promise<VerifiedTransaction> {
    const json = await call(`/transaction/verify/${encodeURIComponent(reference)}`);
    const d = json?.data ?? {};

    const status =
      d.status === "success"
        ? "paid"
        : d.status === "failed"
        ? "failed"
        : d.status === "abandoned"
        ? "abandoned"
        : "pending";

    return {
      status,
      reference: d.reference ?? reference,
      providerReference: d.id ? String(d.id) : d.reference ?? null,
      amountKobo: typeof d.amount === "number" ? d.amount : 0,
      providerFeeKobo: typeof d.fees === "number" ? d.fees : 0,
      channel: mapChannel(d.channel),
      paidAt: d.paid_at ?? d.paidAt ?? null,
    };
  }

  async createSubaccount(params: CreateSubaccountParams): Promise<CreateSubaccountResult> {
    const json = await call("/subaccount", {
      method: "POST",
      body: {
        business_name: params.businessName,
        bank_code: params.bankCode,
        account_number: params.accountNumber,
        // Paystack wants a percentage here, not basis points.
        percentage_charge: params.platformFeeBps / 100,
      },
    });

    return {
      providerSubaccountId: json?.data?.subaccount_code,
      accountName: json?.data?.account_name ?? null,
    };
  }

  async listBanks(): Promise<Bank[]> {
    const json = await call("/bank?country=nigeria&perPage=100");
    return (json?.data ?? []).map((b: any) => ({ name: b.name, code: b.code }));
  }

  async resolveAccountNumber(
    accountNumber: string,
    bankCode: string
  ): Promise<ResolvedBankAccount> {
    const json = await call(
      `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`
    );
    return {
      accountName: json?.data?.account_name,
      accountNumber: json?.data?.account_number,
    };
  }

  verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
    if (!signature) return false;

    const expected = crypto.createHmac("sha512", secretKey()).update(rawBody).digest("hex");
    const received = Buffer.from(signature);
    const expectedBuf = Buffer.from(expected);

    return (
      received.length === expectedBuf.length && crypto.timingSafeEqual(received, expectedBuf)
    );
  }

  parseWebhookEvent(payload: any): NormalizedWebhookEvent {
    const d = payload?.data ?? {};
    const base = {
      providerEventId: d.id ? String(d.id) : null,
      providerSubaccountId: d.subaccount?.subaccount_code ?? null,
      reference: d.reference ?? null,
      providerReference: d.id ? String(d.id) : d.reference ?? null,
      amountKobo: typeof d.amount === "number" ? (d.amount as Kobo) : null,
      providerFeeKobo: typeof d.fees === "number" ? (d.fees as Kobo) : null,
      channel: mapChannel(d.channel),
      paidAt: d.paid_at ?? null,
      raw: payload,
    };

    switch (payload?.event) {
      case "charge.success":
        return { ...base, type: "payment.succeeded" };
      case "charge.failed":
        return { ...base, type: "payment.failed" };
      case "transfer.success":
      case "settlement.success":
        return { ...base, type: "settlement.succeeded" };
      default:
        return { ...base, type: "unhandled" };
    }
  }
}
