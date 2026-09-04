import { generateLumiReply, type ShoppingCatalogContext, type ShoppingMessage } from "../server/hanna.js";

type VercelRequest = {
  method?: string;
  body?: unknown;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => VercelResponse;
};

function isMessage(value: unknown): value is { role: "user" | "assistant"; content: string } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { role?: unknown; content?: unknown };
  return (
    (candidate.role === "user" || candidate.role === "assistant") &&
    typeof candidate.content === "string"
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

  const messages: ShoppingMessage[] = body.messages
    .filter(isMessage)
    .slice(-20)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 4000),
    }));

  const rawCatalog = body.catalog && typeof body.catalog === "object" ? body.catalog : {};
  const catalog = rawCatalog as ShoppingCatalogContext;

  try {
    const reply = await generateLumiReply(messages, {
      currentPath: typeof catalog.currentPath === "string" ? catalog.currentPath.slice(0, 300) : "/",
      products: Array.isArray(catalog.products) ? catalog.products.slice(0, 120) : [],
      collections: Array.isArray(catalog.collections) ? catalog.collections.slice(0, 40) : [],
    });
    return res.status(200).json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Shopping assistant unavailable";
    const status = message.includes("not configured") || message.includes("needs a shopper") ? 412 : 502;
    return res.status(status).json({ error: message });
  }
}
