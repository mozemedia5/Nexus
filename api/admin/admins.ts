import { AdminAccountError, AdminAuthError, authenticateAdminAuthorization, requireSuperAdmin } from "../../server/adminAuth.js";
import { listAdminAccounts } from "../../server/adminAccounts.js";

type VercelRequest = { method?: string; headers: { authorization?: string | string[] } };
type VercelResponse = { status: (code: number) => VercelResponse; json: (body: unknown) => VercelResponse; setHeader?: (name: string, value: string) => void };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const authorization = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization;
    const actor = await authenticateAdminAuthorization(authorization);
    requireSuperAdmin(actor);
    res.setHeader?.("Cache-Control", "no-store");
    return res.status(200).json({ admins: await listAdminAccounts() });
  } catch (error) {
    const status = error instanceof AdminAuthError || error instanceof AdminAccountError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unable to list administrator accounts.";
    return res.status(status).json({ error: message });
  }
}
