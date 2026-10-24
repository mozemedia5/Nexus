import { createCariUploadSession } from "../../server/cloudinary.js";

type VercelRequest = { method?: string };
type VercelResponse = { status: (code: number) => VercelResponse; json: (body: unknown) => VercelResponse; setHeader?: (name: string, value: string) => void };

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    res.setHeader?.("Cache-Control", "no-store");
    return res.status(201).json(createCariUploadSession());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create a temporary image session";
    return res.status(412).json({ error: message });
  }
}
