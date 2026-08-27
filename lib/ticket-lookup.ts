import "server-only";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeTicketCode } from "@/lib/tickets";

/**
 * Reading a ticket for the person holding it.
 *
 * Buyers have no account, so there is no session to authorise this — the
 * ticket code IS the credential, which is why it is long and random and
 * why `tickets` has no public read policy. Everything here goes through
 * the service role and returns only what belongs to the code presented.
 */

export interface TicketView {
  code: string;
  seatIndex: number;
  totalOnOrder: number;
  ticketTypeName: string | null;
  priceKobo: number;
  holderName: string | null;
  status: "valid" | "checked_in" | "void" | "refunded";
  checkedInAt: string | null;
  orderReference: string;
  event: {
    id: string;
    title: string;
    date: string | null;
    time: string | null;
    location: string | null;
    mapLink: string | null;
    coverImageUrl: string | null;
  };
  organiserName: string | null;
}

/** An SVG QR code for a ticket, rendered server-side. */
export async function ticketQrSvg(code: string): Promise<string> {
  return QRCode.toString(code, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    // Fixed colours rather than theme ones: a scanner needs dark modules
    // on a light ground whatever the page around it is doing.
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}

export async function getTicketByCode(rawCode: string): Promise<TicketView | null> {
  const code = normalizeTicketCode(rawCode);
  if (!code) return null;

  const admin = createAdminClient();

  const { data: ticket } = await admin
    .from("tickets")
    .select(
      "code, seat_index, ticket_type_name, price_kobo, holder_name, status, checked_in_at, order_id, event_id"
    )
    .eq("code", code)
    .maybeSingle();

  if (!ticket) return null;

  const [{ count }, view] = await Promise.all([
    admin
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("order_id", ticket.order_id),
    loadEventAndOrder(ticket.event_id, ticket.order_id),
  ]);

  if (!view) return null;

  return {
    code: ticket.code,
    seatIndex: Number(ticket.seat_index ?? 1),
    totalOnOrder: count ?? 1,
    ticketTypeName: ticket.ticket_type_name,
    priceKobo: Number(ticket.price_kobo ?? 0),
    holderName: ticket.holder_name,
    status: ticket.status,
    checkedInAt: ticket.checked_in_at,
    orderReference: view.orderReference,
    event: view.event,
    organiserName: view.organiserName,
  };
}

/** Every ticket on one purchase — what the email's main link opens. */
export async function getTicketsByOrderReference(
  reference: string
): Promise<{ tickets: TicketView[]; orderReference: string } | null> {
  if (!reference) return null;

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, reference, event_id, status")
    .eq("reference", reference)
    .maybeSingle();

  if (!order || !order.event_id) return null;
  if (order.status !== "paid") return { tickets: [], orderReference: order.reference };

  const { data: rows } = await admin
    .from("tickets")
    .select("code, seat_index, ticket_type_name, price_kobo, holder_name, status, checked_in_at")
    .eq("order_id", order.id)
    .order("seat_index");

  const view = await loadEventAndOrder(order.event_id, order.id);
  if (!view) return null;

  const tickets: TicketView[] = (rows ?? []).map((t) => ({
    code: t.code,
    seatIndex: Number(t.seat_index ?? 1),
    totalOnOrder: rows?.length ?? 1,
    ticketTypeName: t.ticket_type_name,
    priceKobo: Number(t.price_kobo ?? 0),
    holderName: t.holder_name,
    status: t.status,
    checkedInAt: t.checked_in_at,
    orderReference: order.reference,
    event: view.event,
    organiserName: view.organiserName,
  }));

  return { tickets, orderReference: order.reference };
}

async function loadEventAndOrder(eventId: string, orderId: string) {
  const admin = createAdminClient();

  const [{ data: event }, { data: order }] = await Promise.all([
    admin
      .from("events")
      .select("id, title, date, time, location, map_link, cover_image_url, creator_id")
      .eq("id", eventId)
      .maybeSingle(),
    admin.from("orders").select("reference").eq("id", orderId).maybeSingle(),
  ]);

  if (!event) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", event.creator_id)
    .maybeSingle();

  return {
    orderReference: order?.reference ?? "",
    organiserName:
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || null,
    event: {
      id: event.id,
      title: event.title,
      date: event.date,
      time: event.time,
      location: event.location,
      mapLink: event.map_link,
      coverImageUrl: event.cover_image_url,
    },
  };
}
