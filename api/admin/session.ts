import { AdminAuthError, authenticateAdminAuthorization } from "../../server/adminAuth.js";

type VercelRequest = { method?: string; headers: { authorization?: string | string[] } };
type VercelResponse = { status: (code: number) => VercelResponse; json: (body: unknown) => VercelResponse; setHeader?: (name: string, value: string) => void };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const authorization = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization;
    const admin = await authenticateAdminAuthorization(authorization);
    res.setHeader?.("Cache-Control", "no-store");
    return res.status(200).json({ admin });
  } catch (error) {
    const status = error instanceof AdminAuthError ? error.status : 500;
    const message = error instanceof AdminAuthError ? error.message : "Administrator session could not be verified.";
    return res.status(status).json({ error: message });
  }
}
