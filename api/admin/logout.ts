import { AdminAuthError, authenticateAdminAuthorization } from "../../server/adminAuth.js";
import { getFirebaseAdmin } from "../../server/firebaseAdmin.js";

type VercelRequest = { method?: string; headers: { authorization?: string | string[] } };
type VercelResponse = { status: (code: number) => VercelResponse; json: (body: unknown) => VercelResponse };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const authorization = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization;
    const admin = await authenticateAdminAuthorization(authorization);
    const { auth } = getFirebaseAdmin();
    await auth.revokeRefreshTokens(admin.uid);
    return res.status(200).json({ success: true });
  } catch (error) {
    const status = error instanceof AdminAuthError ? error.status : 503;
    const message = error instanceof AdminAuthError ? error.message : "Could not revoke the administrator session.";
    return res.status(status).json({ error: message });
  }
}
