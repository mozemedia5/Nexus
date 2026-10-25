import { createCariSessionUploadSignature } from "../../server/cloudinary.js";

type VercelRequest = { method?: string; body?: unknown };
type VercelResponse = { status: (code: number) => VercelResponse; json: (body: unknown) => VercelResponse };

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = (req.body && typeof req.body === "object" ? req.body : {}) as {
    sessionId?: unknown;
    cleanupToken?: unknown;
  };
  if (typeof body.sessionId !== "string" || typeof body.cleanupToken !== "string") {
    return res.status(400).json({ error: "A valid Cari session capability is required." });
  }

  try {
    return res.status(200).json(createCariSessionUploadSignature(body.sessionId, body.cleanupToken));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create Cari image upload signature";
    const status = message.toLowerCase().includes("invalid") ? 403 : 412;
    return res.status(status).json({ error: message });
  }
}
