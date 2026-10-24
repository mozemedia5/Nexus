import { AdminAccountError, AdminAuthError, authenticateAdminAuthorization, requireSuperAdmin, type AdminPrincipal } from "../../server/adminAuth.js";
import { promoteVerifiedFirebaseUser } from "../../server/adminAccounts.js";

type VercelRequest = { method?: string; body?: unknown; headers: { authorization?: string | string[] } };
type VercelResponse = { status: (code: number) => VercelResponse; json: (body: unknown) => VercelResponse };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
  try {
    const authorization = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization;
    const actor = await authenticateAdminAuthorization(authorization);
    requireSuperAdmin(actor);
    const admin = await promoteVerifiedFirebaseUser({
      email: typeof body.email === "string" ? body.email : "",
      fullName: typeof body.fullName === "string" ? body.fullName : undefined,
      actor: actor as AdminPrincipal,
    });
    return res.status(201).json({ success: true, admin, message: "Verified Firebase account promoted. The user must sign in again to receive admin access." });
  } catch (error) {
    const status = error instanceof AdminAuthError || error instanceof AdminAccountError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Could not promote this Firebase account.";
    return res.status(status).json({ error: message });
  }
}
