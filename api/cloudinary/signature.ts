import {
  createCariSessionUploadSignature,
  createCloudinaryUploadSignature,
  CLOUDINARY_RESOURCE_TYPES,
} from "../../server/cloudinary.js";

type VercelRequest = { method?: string; body?: unknown };
type VercelResponse = { status: (code: number) => VercelResponse; json: (body: unknown) => VercelResponse };

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const body = (req.body && typeof req.body === "object" ? req.body : {}) as {
    folder?: unknown;
    resourceType?: unknown;
    sessionId?: unknown;
  };

  try {
    if (typeof body.sessionId === "string") {
      return res.status(200).json(createCariSessionUploadSignature(body.sessionId));
    }

    const folder = typeof body.folder === "string" ? body.folder : "nexus/media";
    const resourceType = body.resourceType ?? "image";
    if (!CLOUDINARY_RESOURCE_TYPES.includes(resourceType as (typeof CLOUDINARY_RESOURCE_TYPES)[number])) {
      return res.status(400).json({ error: "resourceType must be image, video, or raw" });
    }
    return res.status(200).json(createCloudinaryUploadSignature({
      folder,
      resourceType: resourceType as (typeof CLOUDINARY_RESOURCE_TYPES)[number],
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create upload signature";
    const status = message.includes("invalid") || message.includes("Invalid") ? 400 : 412;
    return res.status(status).json({ error: message });
  }
}
