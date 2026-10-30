import type { TrackedOrder } from "../client/src/lib/store.js";

type VercelRequest = {
  method?: string;
  body?: unknown;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => VercelResponse;
};

export class InvalidOrderLookupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidOrderLookupError";
  }
}

export class OrderTrackingUnavailableError extends Error {
  constructor() {
    super("Order tracking is temporarily unavailable. Please try again later.");
    this.name = "OrderTrackingUnavailableError";
  }
}

function normalizeOrderQuery(orderInput: string): string {
  const trimmed = orderInput.trim().replace(/^#\s*/, "");
  if (!trimmed || trimmed.length > 64 || !/^[A-Za-z0-9-]+$/.test(trimmed)) {
    throw new InvalidOrderLookupError("Enter a valid order number, such as #1001.");
  }
  return trimmed;
}

function normalizePhone(contactInput: string): string {
  return contactInput.replace(/\D/g, "");
}

export async function fetchShopifyOrderTracking(
  orderInput: string,
  emailOrPhoneInput: string,
): Promise<TrackedOrder | null> {
  const orderNum = normalizeOrderQuery(orderInput);
  const rawContact = emailOrPhoneInput.trim();
  if (!rawContact) {
    throw new InvalidOrderLookupError("Enter the email address or phone number used for the order.");
  }

  const isEmail = rawContact.includes("@");
  let normalizedContact: string;
  if (isEmail) {
    if (rawContact.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawContact)) {
      throw new InvalidOrderLookupError("Enter a valid email address or phone number.");
    }
    normalizedContact = rawContact.toLowerCase();
  } else {
    normalizedContact = normalizePhone(rawContact);
    if (normalizedContact.length < 7 || normalizedContact.length > 15) {
      throw new InvalidOrderLookupError("Enter a valid email address or phone number.");
    }
  }

  const domain = (process.env.SHOPIFY_STORE_DOMAIN || process.env.VITE_SHOPIFY_STORE_DOMAIN || "")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim() || "";
  const apiVersion = process.env.SHOPIFY_API_VERSION || process.env.VITE_SHOPIFY_API_VERSION || "2026-07";

  if (!domain || !adminToken) {
    throw new OrderTrackingUnavailableError();
  }

  const adminEndpoint = `https://${domain}/admin/api/${apiVersion}/graphql.json`;
  const query = `
    query SearchOrders($query: String!) {
      orders(first: 10, query: $query) {
        nodes {
          id
          name
          orderNumber
          processedAt
          displayFinancialStatus
          displayFulfillmentStatus
          statusPageUrl
          email
          phone
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          shippingAddress {
            firstName
            lastName
            address1
            city
            country
            phone
          }
          lineItems(first: 20) {
            nodes {
              title
              quantity
              originalTotalSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              variant {
                title
                image {
                  url
                }
              }
            }
          }
          fulfillments {
            displayStatus
            deliveredAt
            trackingInfo {
              number
              url
              company
            }
          }
        }
      }
    }
  `;

  const searchQuery = `name:#${orderNum} OR name:${orderNum} OR order_number:${orderNum}`;
  let response: Response;
  try {
    response = await fetch(adminEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": adminToken,
      },
      body: JSON.stringify({ query, variables: { query: searchQuery } }),
    });
  } catch (error) {
    console.error("Shopify order tracking request failed.", error);
    throw new OrderTrackingUnavailableError();
  }

  if (!response.ok) {
    console.error("Shopify order tracking returned HTTP status", response.status);
    throw new OrderTrackingUnavailableError();
  }

  let payload: any;
  try {
    payload = await response.json();
  } catch (error) {
    console.error("Shopify order tracking returned invalid JSON.", error);
    throw new OrderTrackingUnavailableError();
  }
  if (payload.errors?.length || !payload.data?.orders) {
    console.error("Shopify order tracking GraphQL request failed.", payload.errors?.map((item: any) => item.message));
    throw new OrderTrackingUnavailableError();
  }

  const matchedOrders: any[] = payload.data.orders.nodes ?? [];
  const normalizedOrderNumber = orderNum.toLowerCase();
  const verifiedOrder = matchedOrders.find((order) => {
    const orderName = String(order.name || "").replace(/^#/, "").toLowerCase();
    const orderNumber = String(order.orderNumber ?? "").toLowerCase();
    const exactOrderMatch = orderName === normalizedOrderNumber || orderNumber === normalizedOrderNumber;
    if (!exactOrderMatch) return false;

    if (isEmail) {
      return String(order.email || "").trim().toLowerCase() === normalizedContact;
    }
    const orderPhones = [order.phone, order.shippingAddress?.phone]
      .filter((phone): phone is string => typeof phone === "string" && phone.length > 0)
      .map(normalizePhone);
    return orderPhones.includes(normalizedContact);
  });

  // Return the same not-found result for an absent order and a contact mismatch.
  if (!verifiedOrder) return null;

  const totalPrice = verifiedOrder.totalPriceSet?.shopMoney || { amount: "0.00", currencyCode: "USD" };
  const fulfillmentStatuses: string[] = (verifiedOrder.fulfillments ?? [])
    .map((fulfillment: any) => String(fulfillment.displayStatus || "").toUpperCase())
    .filter(Boolean);
  const statusPriority = ["DELIVERED", "OUT_FOR_DELIVERY", "IN_TRANSIT", "PICKED_UP", "READY_FOR_PICKUP", "CONFIRMED", "LABEL_PRINTED", "LABEL_PURCHASED", "SUBMITTED"];
  const trackingStatus = statusPriority.find((status) => fulfillmentStatuses.includes(status)) ?? null;
  const deliveredAt = (verifiedOrder.fulfillments ?? []).find((fulfillment: any) => fulfillment.deliveredAt)?.deliveredAt ?? null;

  return {
    id: verifiedOrder.id,
    name: verifiedOrder.name,
    orderNumber: verifiedOrder.orderNumber ?? verifiedOrder.name,
    processedAt: verifiedOrder.processedAt,
    financialStatus: verifiedOrder.displayFinancialStatus || "PAID",
    fulfillmentStatus: verifiedOrder.displayFulfillmentStatus || "IN_PROGRESS",
    trackingStatus,
    deliveredAt,
    statusUrl: verifiedOrder.statusPageUrl || null,
    totalPrice,
    shippingAddress: verifiedOrder.shippingAddress || null,
    lineItems: (verifiedOrder.lineItems?.nodes ?? []).map((item: any) => ({
      title: item.title,
      quantity: item.quantity,
      price: item.originalTotalSet?.shopMoney || { amount: "0.00", currencyCode: "USD" },
      image: item.variant?.image?.url ?? null,
      variantTitle: item.variant?.title ?? "",
    })),
    fulfillments: (verifiedOrder.fulfillments ?? []).flatMap((fulfillment: any) =>
      (fulfillment.trackingInfo ?? []).map((tracking: any) => ({
        trackingNumber: tracking.number,
        trackingUrl: tracking.url,
        company: tracking.company,
        status: fulfillment.displayStatus ?? null,
        deliveredAt: fulfillment.deliveredAt ?? null,
      })),
    ),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = (req.body && typeof req.body === "object" ? req.body : {}) as {
    orderNumber?: string;
    emailOrPhone?: string;
  };
  const orderNumber = typeof body.orderNumber === "string" ? body.orderNumber : "";
  const emailOrPhone = typeof body.emailOrPhone === "string" ? body.emailOrPhone : "";

  try {
    const order = await fetchShopifyOrderTracking(orderNumber, emailOrPhone);
    if (!order) {
      return res.status(404).json({ error: "Order not found. Check the order number and contact details, then try again." });
    }
    return res.status(200).json({ order });
  } catch (error) {
    if (error instanceof InvalidOrderLookupError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof OrderTrackingUnavailableError) {
      return res.status(503).json({ error: error.message });
    }
    console.error("Unexpected order tracking failure.", error);
    return res.status(503).json({ error: "Order tracking is temporarily unavailable. Please try again later." });
  }
}
