import { authenticateAdminAuthorization, AdminAuthError } from "../../server/adminAuth.js";
import { createCariSessionUploadSignature, createCloudinaryUploadSignature, CLOUDINARY_RESOURCE_TYPES } from "../../server/cloudinary.js";

type VercelRequest = { method?: string; body?: unknown; headers: { authorization?: string | string[] } };
type VercelResponse = { status: (code: number) => VercelResponse; json: (body: unknown) => VercelResponse };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const body = (req.body && typeof req.body === "object" ? req.body : {}) as {
    folder?: unknown; resourceType?: unknown; sessionId?: unknown; cleanupToken?: unknown;
  };

  try {
    if (typeof body.sessionId === "string") {
      if (typeof body.cleanupToken !== "string") return res.status(400).json({ error: "A valid Cari session capability is required." });
      return res.status(200).json(createCariSessionUploadSignature(body.sessionId, body.cleanupToken));
    }

    const authorization = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization;
    await authenticateAdminAuthorization(authorization);
    const folder = typeof body.folder === "string" ? body.folder : "nexus/media";
    const resourceType = body.resourceType ?? "image";
    if (!CLOUDINARY_RESOURCE_TYPES.includes(resourceType as (typeof CLOUDINARY_RESOURCE_TYPES)[number])) {
      return res.status(400).json({ error: "resourceType must be image, video, or raw" });
    }
    return res.status(200).json(createCloudinaryUploadSignature({ folder, resourceType: resourceType as (typeof CLOUDINARY_RESOURCE_TYPES)[number] }));
  } catch (error) {
    if (error instanceof AdminAuthError) return res.status(error.status).json({ error: error.message });
    const message = error instanceof Error ? error.message : "Unable to create upload signature";
    const status = message.includes("Invalid") || message.includes("invalid") ? 403 : 412;
    return res.status(status).json({ error: message });
  }
}
