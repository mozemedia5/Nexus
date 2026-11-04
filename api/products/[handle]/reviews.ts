import { createHash } from "node:crypto";
import { getFirebaseAdmin, parseFirebaseServiceAccount } from "../../../server/firebaseAdmin.js";

type VercelRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
};
type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => VercelResponse;
};

const HANDLE_PATTERN = /^[a-z0-9][a-z0-9-]{0,254}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function getHandle(req: VercelRequest) {
  const value = req.query?.handle;
  return (Array.isArray(value) ? value[0] : value)?.trim().toLowerCase() ?? "";
}

function getBearer(req: VercelRequest) {
  const value = req.headers?.authorization ?? req.headers?.Authorization;
  const header = Array.isArray(value) ? value[0] : value;
  return header?.match(/^Bearer\s+(.+)$/i)?.[1] ?? "";
}

async function hasPaidPurchase(email: string, productHandle: string) {
  const domain = (process.env.SHOPIFY_STORE_DOMAIN || process.env.VITE_SHOPIFY_STORE_DOMAIN || "")
    .replace(/^https?:\/\//, "").replace(/\/$/, "");
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim() || "";
  const version = process.env.SHOPIFY_API_VERSION || process.env.VITE_SHOPIFY_API_VERSION || "2026-07";
  if (!domain || !token) throw new Error("PURCHASE_VERIFICATION_NOT_CONFIGURED");

  const search = `email:"${email.replace(/["\\]/g, "\\$&")}" AND financial_status:paid`;
  let cursor: string | null = null;
  for (let page = 0; page < 10; page += 1) {
    const response = await fetch(`https://${domain}/admin/api/${version}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({
        query: `query PaidPurchases($search: String!, $after: String) {
          orders(first: 25, after: $after, query: $search, sortKey: CREATED_AT, reverse: true) {
            nodes { displayFinancialStatus lineItems(first: 25) { nodes { product { handle } } } }
            pageInfo { hasNextPage endCursor }
          }
        }`,
        variables: { search, after: cursor },
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error("SHOPIFY_PURCHASE_LOOKUP_FAILED");
    const payload = await response.json() as {
      errors?: Array<{ message?: string }>;
      data?: {
        orders?: {
          nodes?: Array<{
            displayFinancialStatus?: string;
            lineItems?: {
              nodes?: Array<{ product?: { handle?: string } | null }>;
            };
          }>;
          pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
        };
      };
    };
    if (payload.errors?.length || !payload.data?.orders) throw new Error("SHOPIFY_PURCHASE_LOOKUP_FAILED");
    const orders = payload.data.orders.nodes ?? [];
    if (orders.some(order => order.displayFinancialStatus === "PAID" &&
      (order.lineItems?.nodes ?? []).some(item => item.product?.handle?.toLowerCase() === productHandle))) return true;
    const info = payload.data.orders.pageInfo;
    if (!info?.hasNextPage || !info.endCursor) return false;
    cursor = info.endCursor;
  }
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const handle = getHandle(req);
  if (!HANDLE_PATTERN.test(handle)) return res.status(400).json({ error: "A valid product handle is required." });
  if (!parseFirebaseServiceAccount()) return res.status(503).json({ error: "Product reviews are not configured on this store." });

  const { firestore, auth } = getFirebaseAdmin();
  const collection = firestore.collection("nexus_product_reviews");

  if (req.method === "GET") {
    try {
      const snapshot = await collection.where("productHandle", "==", handle).limit(100).get();
      const reviews = snapshot.docs.map(document => {
        const data = document.data();
        return {
          id: document.id,
          rating: data.rating,
          title: data.title,
          body: data.body,
          reviewerName: "Verified customer",
          createdAt: data.createdAt,
        };
      }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      return res.status(200).json({ reviews });
    } catch (error) {
      console.error("Failed to load product reviews.", error);
      return res.status(503).json({ error: "Product reviews are temporarily unavailable." });
    }
  }

  const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
  const rating = body.rating;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const reviewBody = typeof body.body === "string" ? body.body.trim() : "";
  if (!Number.isInteger(rating) || Number(rating) < 1 || Number(rating) > 5 || !title || title.length > 80 || !reviewBody || reviewBody.length > 1500) {
    return res.status(400).json({ error: "Provide a 1–5 star rating, a title up to 80 characters, and a review up to 1,500 characters." });
  }

  const bearer = getBearer(req);
  if (!bearer) return res.status(401).json({ error: "Sign in with the account used for your purchase to write a review." });
  let identity: { uid: string; email?: string; email_verified?: boolean };
  try {
    identity = await auth.verifyIdToken(bearer);
  } catch {
    return res.status(401).json({ error: "Your sign-in session could not be verified. Please sign in again." });
  }
  const email = identity.email?.trim().toLowerCase() ?? "";
  if (!identity.email_verified || !EMAIL_PATTERN.test(email)) return res.status(403).json({ error: "A verified email address is required to write a review." });

  try {
    if (!(await hasPaidPurchase(email, handle))) {
      return res.status(403).json({ error: "Reviews are available only to customers with a paid purchase of this product." });
    }
    const id = createHash("sha256").update(`${handle}:${identity.uid}`).digest("hex");
    const reference = collection.doc(id);
    const existing = await reference.get();
    const now = new Date().toISOString();
    await reference.set({
      productHandle: handle,
      uid: identity.uid,
      rating: Number(rating),
      title,
      body: reviewBody,
      verifiedPurchase: true,
      createdAt: existing.exists ? existing.data()?.createdAt ?? now : now,
      updatedAt: now,
    }, { merge: true });
    return res.status(existing.exists ? 200 : 201).json({ success: true, message: "Your verified-purchase review has been saved." });
  } catch (error) {
    if (error instanceof Error && error.message === "PURCHASE_VERIFICATION_NOT_CONFIGURED") {
      return res.status(503).json({ error: "Purchase verification is not configured. Contact the store before submitting a review." });
    }
    console.error("Failed to verify purchase or save product review.", error);
    return res.status(503).json({ error: "Purchase verification is temporarily unavailable. Please try again later." });
  }
}
