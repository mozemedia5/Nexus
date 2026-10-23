import { deleteCariSessionImages } from "../../server/cloudinary.js";

type VercelRequest = { method?: string; body?: unknown };
type VercelResponse = { status: (code: number) => VercelResponse; json: (body: unknown) => VercelResponse };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const body = (req.body && typeof req.body === "object" ? req.body : {}) as {
    sessionId?: unknown;
    cleanupToken?: unknown;
  };
  if (typeof body.sessionId !== "string" || typeof body.cleanupToken !== "string") {
    return res.status(400).json({ error: "sessionId and cleanupToken are required" });
  }

  try {
    const result = await deleteCariSessionImages(body.sessionId, body.cleanupToken);
    return res.status(200).json({ success: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to clean up Cari session images";
    const status = message.includes("Invalid") ? 403 : 502;
    return res.status(status).json({ error: message });
  }
}
