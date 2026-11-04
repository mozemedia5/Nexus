import { getFirebaseAdmin, parseFirebaseServiceAccount } from "../../server/firebaseAdmin.js";

type VercelRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => VercelResponse;
};

const ACTIONS = new Set([
  "view",
  "click",
  "like",
  "add_to_cart",
  "newsletter_product_interest",
]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body && typeof req.body === "object"
    ? req.body as Record<string, unknown>
    : {};
  const productTitle = typeof body.productTitle === "string"
    ? body.productTitle.trim().slice(0, 200)
    : "";
  if (!productTitle) {
    return res.status(400).json({ error: "productTitle is required" });
  }

  const action = typeof body.action === "string" && ACTIONS.has(body.action)
    ? body.action
    : "view";
  const productHandle = typeof body.productHandle === "string"
    ? body.productHandle.trim().slice(0, 200)
    : "";
  const category = typeof body.category === "string"
    ? body.category.trim().slice(0, 120)
    : "all";

  const header = req.headers?.authorization ?? req.headers?.Authorization;
  const authorization = Array.isArray(header) ? header[0] : header;
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  let verifiedEmail = "anonymous";
  if (bearer) {
    try {
      const { auth } = getFirebaseAdmin();
      const identity = await auth.verifyIdToken(bearer);
      const email = identity.email?.trim().toLowerCase() ?? "";
      if (identity.email_verified && EMAIL_PATTERN.test(email)) verifiedEmail = email;
    } catch {
      return res.status(401).json({ error: "The signed-in session could not be verified." });
    }
  }

  const interaction = {
    userEmail: verifiedEmail,
    action,
    productTitle,
    ...(productHandle ? { productHandle } : {}),
    category,
    timestamp: new Date().toISOString(),
  };

  try {
    if (parseFirebaseServiceAccount()) {
      const { firestore } = getFirebaseAdmin();
      const saved = await firestore.collection("nexus_user_interactions").add(interaction);
      return res.status(200).json({ success: true, id: saved.id });
    }
    // Keep the storefront action non-blocking in deployments where Firebase Admin
    // is intentionally disabled; no caller-supplied email is persisted.
    return res.status(200).json({ success: true, storage: "disabled" });
  } catch (error) {
    console.error("Failed to record product interaction.", error);
    return res.status(503).json({ error: "Interaction tracking is temporarily unavailable." });
  }
}
