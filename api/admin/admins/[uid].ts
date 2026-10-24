import { AdminAccountError, AdminAuthError, authenticateAdminAuthorization, requireSuperAdmin, type AdminPrincipal } from "../../../server/adminAuth.js";
import { revokeAdminAccount } from "../../../server/adminAccounts.js";

type VercelRequest = { method?: string; query: { uid?: string | string[] }; headers: { authorization?: string | string[] } };
type VercelResponse = { status: (code: number) => VercelResponse; json: (body: unknown) => VercelResponse };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });
  try {
    const authorization = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization;
    const actor = await authenticateAdminAuthorization(authorization);
    requireSuperAdmin(actor);
    const uid = Array.isArray(req.query.uid) ? req.query.uid[0] : req.query.uid;
    await revokeAdminAccount(uid ?? "", actor as AdminPrincipal);
    return res.status(200).json({ success: true });
  } catch (error) {
    const status = error instanceof AdminAuthError || error instanceof AdminAccountError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Could not revoke administrator access.";
    return res.status(status).json({ error: message });
  }
}
