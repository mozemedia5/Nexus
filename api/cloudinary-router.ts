import {
  AdminAuthError,
  authenticateAdminAuthorization,
} from "../server/adminAuth.js";
import {
  CLOUDINARY_RESOURCE_TYPES,
  createCariSessionUploadSignature,
  createCariUploadSession,
  createCloudinaryUploadSignature,
  deleteCariSessionImages,
} from "../server/cloudinary.js";

type VercelRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => VercelResponse;
  setHeader?: (name: string, value: string) => void;
};

const ACTIONS = new Set([
  "signature",
  "cari-signature",
  "session",
  "session-cleanup",
]);

function getAction(req: VercelRequest) {
  const value = req.query?.action;
  return Array.isArray(value) ? value[0] : value;
}

function getBody(req: VercelRequest) {
  return req.body && typeof req.body === "object"
    ? (req.body as Record<string, unknown>)
    : {};
}

function getAuthorization(req: VercelRequest) {
  const value = req.headers?.authorization ?? req.headers?.Authorization;
  return Array.isArray(value) ? value[0] : value;
}

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function isInvalidCapability(error: unknown) {
  return error instanceof Error && /invalid/i.test(error.message);
}

function handleSession(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    res.setHeader?.("Cache-Control", "no-store");
    return res.status(201).json(createCariUploadSession());
  } catch (error) {
    return res.status(412).json({
      error: messageOf(error, "Unable to create a temporary image session"),
    });
  }
}

function handleCariSignature(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = getBody(req);
  if (
    typeof body.sessionId !== "string" ||
    typeof body.cleanupToken !== "string"
  ) {
    return res
      .status(400)
      .json({ error: "A valid Cari session capability is required." });
  }

  try {
    return res
      .status(200)
      .json(
        createCariSessionUploadSignature(body.sessionId, body.cleanupToken)
      );
  } catch (error) {
    const message = messageOf(
      error,
      "Unable to create Cari image upload signature"
    );
    return res
      .status(isInvalidCapability(error) ? 403 : 412)
      .json({ error: message });
  }
}

async function handleSignature(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = getBody(req);
  try {
    if (typeof body.sessionId === "string") {
      if (typeof body.cleanupToken !== "string") {
        return res
          .status(400)
          .json({ error: "A valid Cari session capability is required." });
      }
      return res
        .status(200)
        .json(
          createCariSessionUploadSignature(body.sessionId, body.cleanupToken)
        );
    }

    await authenticateAdminAuthorization(getAuthorization(req));
    const folder =
      typeof body.folder === "string" ? body.folder : "nexus/media";
    const resourceType = body.resourceType ?? "image";
    if (
      !CLOUDINARY_RESOURCE_TYPES.includes(
        resourceType as (typeof CLOUDINARY_RESOURCE_TYPES)[number]
      )
    ) {
      return res
        .status(400)
        .json({ error: "resourceType must be image, video, or raw" });
    }
    return res.status(200).json(
      createCloudinaryUploadSignature({
        folder,
        resourceType:
          resourceType as (typeof CLOUDINARY_RESOURCE_TYPES)[number],
      })
    );
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return res.status(error.status).json({ error: error.message });
    }
    const message = messageOf(error, "Unable to create upload signature");
    const status = /invalid/i.test(message) ? 403 : 412;
    return res.status(status).json({ error: message });
  }
}

async function handleSessionCleanup(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = getBody(req);
  if (
    typeof body.sessionId !== "string" ||
    typeof body.cleanupToken !== "string"
  ) {
    return res
      .status(400)
      .json({ error: "sessionId and cleanupToken are required" });
  }

  try {
    const result = await deleteCariSessionImages(
      body.sessionId,
      body.cleanupToken
    );
    return res.status(200).json({ success: true, result });
  } catch (error) {
    const message = messageOf(error, "Unable to clean up Cari session images");
    return res
      .status(message.includes("Invalid") ? 403 : 502)
      .json({ error: message });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = getAction(req);
  if (!action || !ACTIONS.has(action)) {
    return res.status(404).json({ error: "Cloudinary action not found." });
  }

  switch (action) {
    case "signature":
      return handleSignature(req, res);
    case "cari-signature":
      return handleCariSignature(req, res);
    case "session":
      return handleSession(req, res);
    case "session-cleanup":
      return handleSessionCleanup(req, res);
  }
}
