import {
  generateCariReply,
  type CariAttachment,
  type ShoppingCatalogContext,
  type ShoppingMessage,
} from "../server/hanna.js";

type VercelRequest = {
  method?: string;
  body?: unknown;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => VercelResponse;
};

type ApiMessage = {
  role: "user" | "assistant";
  content: string;
  attachments?: unknown;
  imageUrls?: unknown;
};

function isMessage(value: unknown): value is ApiMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ApiMessage>;
  return (
    (candidate.role === "user" || candidate.role === "assistant") &&
    typeof candidate.content === "string"
  );
}

function isCariAttachment(value: unknown): value is CariAttachment {
  if (!value || typeof value !== "object") return false;
  const attachment = value as Partial<CariAttachment>;
  return (
    typeof attachment.url === "string" &&
    typeof attachment.mimeType === "string" &&
    (attachment.resourceType === "image" || attachment.resourceType === "raw")
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = (req.body && typeof req.body === "object" ? req.body : {}) as {
    messages?: unknown;
    catalog?: unknown;
  };

  if (!Array.isArray(body.messages)) {
    return res.status(400).json({ error: "messages must be an array" });
  }

  const rawMessages = body.messages.filter(isMessage).slice(-80);
  for (const message of rawMessages) {
    if (
      message.attachments !== undefined &&
      (!Array.isArray(message.attachments) ||
        message.attachments.length > 4 ||
        !message.attachments.every(isCariAttachment))
    ) {
      return res.status(400).json({ error: "attachments must contain up to 4 valid Cari uploads" });
    }
  }

  const messages: ShoppingMessage[] = rawMessages.map((message) => ({
    role: message.role,
    content: message.content.slice(0, 4000),
    attachments: Array.isArray(message.attachments)
      ? (message.attachments as CariAttachment[])
      : undefined,
    imageUrls: Array.isArray(message.imageUrls)
      ? message.imageUrls.filter((url): url is string => typeof url === "string").slice(0, 4)
      : undefined,
  }));

  const rawCatalog = body.catalog && typeof body.catalog === "object" ? body.catalog : {};
  const catalog = rawCatalog as ShoppingCatalogContext;

  try {
    const reply = await generateCariReply(messages, {
      currentPath: typeof catalog.currentPath === "string" ? catalog.currentPath.slice(0, 300) : "/",
      products: Array.isArray(catalog.products) ? catalog.products.slice(0, 1000) : [],
      collections: Array.isArray(catalog.collections) ? catalog.collections.slice(0, 250) : [],
      shoppingList: Array.isArray(catalog.shoppingList) ? catalog.shoppingList.slice(0, 100) : [],
    });
    return res.status(200).json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Shopping assistant unavailable";
    const status = message.includes("not configured") || message.includes("needs a shopper") ? 412 : 502;
    return res.status(status).json({ error: message });
  }
}
