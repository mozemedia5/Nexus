import type { TrackedOrder } from "../client/src/lib/store.js";

type VercelRequest = {
  method?: string;
  body?: unknown;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => VercelResponse;
};

function normalizeOrderQuery(orderInput: string): string {
  const trimmed = orderInput.trim().replace(/^#/, "");
  if (!trimmed) return "";
  return trimmed;
}

function normalizeContact(contactInput: string): string {
  return contactInput.trim().toLowerCase().replace(/[\s\-\(\)]/g, "");
}

export async function fetchShopifyOrderTracking(
  orderInput: string,
  emailOrPhoneInput: string
): Promise<TrackedOrder | null> {
  const orderNum = normalizeOrderQuery(orderInput);
  const contact = normalizeContact(emailOrPhoneInput);

  if (!orderNum) {
    throw new Error("Order number or Order ID is required.");
  }
  if (!contact) {
    throw new Error("Customer Email Address or Phone Number is required for verification.");
  }

  const domain = (process.env.SHOPIFY_STORE_DOMAIN || process.env.VITE_SHOPIFY_STORE_DOMAIN || "")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "";
  const storefrontToken =
    process.env.SHOPIFY_STOREFRONT_API_ACCESS_TOKEN ||
    process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ||
    process.env.VITE_SHOPIFY_STOREFRONT_API_ACCESS_TOKEN ||
    process.env.VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN ||
    "";
  const apiVersion = process.env.SHOPIFY_API_VERSION || process.env.VITE_SHOPIFY_API_VERSION || "2026-07";

  if (!domain) {
    throw new Error("Shopify store domain is not configured.");
  }

  // Preferred route: Shopify Admin GraphQL API (if SHOPIFY_ADMIN_ACCESS_TOKEN is provided)
  if (adminToken) {
    const adminEndpoint = `https://${domain}/admin/api/${apiVersion}/graphql.json`;
    const query = `
      query SearchOrders($query: String!) {
        orders(first: 5, query: $query) {
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

    // Query for name or order_number
    const searchQuery = `name:#${orderNum} OR name:${orderNum} OR order_number:${orderNum}`;
    const response = await fetch(adminEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": adminToken,
      },
      body: JSON.stringify({ query, variables: { query: searchQuery } }),
    });

    if (!response.ok) {
      throw new Error(`Shopify Admin API query failed (${response.status})`);
    }

    const payload = (await response.json()) as any;
    if (payload.errors?.length) {
      throw new Error(payload.errors[0].message || "Shopify Admin API returned an error.");
    }

    const matchedOrders: any[] = payload.data?.orders?.nodes ?? [];
    if (!matchedOrders.length) {
      return null;
    }

    // Secure verification: Verify that the provided email or phone matches the order record
    const verifiedOrder = matchedOrders.find((o) => {
      const orderEmail = (o.email || "").toLowerCase();
      const orderPhone = normalizeContact(o.phone || "");
      return (orderEmail && orderEmail === contact) || (orderPhone && orderPhone === contact);
    });

    if (!verifiedOrder) {
      throw new Error("Verification failed. The email or phone number does not match this order.");
    }

    const totalPrice = verifiedOrder.totalPriceSet?.shopMoney || { amount: "0.00", currencyCode: "USD" };

    return {
      id: verifiedOrder.id,
      name: verifiedOrder.name,
      orderNumber: verifiedOrder.orderNumber ?? verifiedOrder.name,
      processedAt: verifiedOrder.processedAt,
      financialStatus: verifiedOrder.displayFinancialStatus || "PAID",
      fulfillmentStatus: verifiedOrder.displayFulfillmentStatus || "IN_PROGRESS",
      statusUrl: verifiedOrder.statusPageUrl || null,
      totalPrice,
      shippingAddress: verifiedOrder.shippingAddress || null,
      lineItems: (verifiedOrder.lineItems?.nodes ?? []).map((li: any) => ({
        title: li.title,
        quantity: li.quantity,
        price: li.originalTotalSet?.shopMoney || { amount: "0.00", currencyCode: "USD" },
        image: li.variant?.image?.url ?? null,
        variantTitle: li.variant?.title ?? "",
      })),
      fulfillments: (verifiedOrder.fulfillments ?? []).flatMap((f: any) =>
        (f.trackingInfo ?? []).map((ti: any) => ({
          trackingNumber: ti.number,
          trackingUrl: ti.url,
          company: ti.company,
        }))
      ),
    };
  }

  // Secondary route: Storefront API node query if GID provided
  if (storefrontToken && (orderInput.startsWith("gid://") || !isNaN(Number(orderNum)))) {
    const storefrontEndpoint = `https://${domain}/api/${apiVersion}/graphql.json`;
    const gid = orderInput.startsWith("gid://")
      ? orderInput
      : `gid://shopify/Order/${orderNum}`;

    const query = `
      query GetOrderDetails($id: ID!) {
        node(id: $id) {
          ... on Order {
            id
            name
            orderNumber
            processedAt
            financialStatus
            fulfillmentStatus
            statusUrl
            totalPrice { amount currencyCode }
            shippingAddress {
              firstName
              lastName
              address1
              city
              country
            }
            lineItems(first: 20) {
              nodes {
                title
                quantity
                originalTotalPrice { amount currencyCode }
                variant {
                  title
                  image { url }
                }
              }
            }
            successfulFulfillments(first: 5) {
              trackingInfo(first: 5) {
                number
                url
                company
              }
            }
          }
        }
      }
    `;

    const response = await fetch(storefrontEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontToken,
      },
      body: JSON.stringify({ query, variables: { id: gid } }),
    });

    if (response.ok) {
      const payload = (await response.json()) as any;
      const o = payload.data?.node;
      if (o && o.name) {
        return {
          id: o.id,
          name: o.name,
          orderNumber: o.orderNumber ?? o.name,
          processedAt: o.processedAt,
          financialStatus: o.financialStatus || "PAID",
          fulfillmentStatus: o.fulfillmentStatus || "IN_PROGRESS",
          statusUrl: o.statusUrl,
          totalPrice: o.totalPrice,
          shippingAddress: o.shippingAddress,
          lineItems: (o.lineItems?.nodes ?? []).map((li: any) => ({
            title: li.title,
            quantity: li.quantity,
            price: li.originalTotalPrice,
            image: li.variant?.image?.url ?? null,
            variantTitle: li.variant?.title ?? "",
          })),
          fulfillments: (o.successfulFulfillments ?? []).flatMap((f: any) =>
            (f.trackingInfo ?? []).map((ti: any) => ({
              trackingNumber: ti.number,
              trackingUrl: ti.url,
              company: ti.company,
            }))
          ),
        };
      }
    }
  }

  throw new Error("Secure order tracking server credential (SHOPIFY_ADMIN_ACCESS_TOKEN) is not configured.");
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
      return res.status(404).json({ error: "Order not found. Please check your order details." });
    }
    return res.status(200).json({ order });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to lookup order";
    const status = message.includes("Verification failed") ? 403 : message.includes("required") ? 400 : 500;
    return res.status(status).json({ error: message });
  }
}
