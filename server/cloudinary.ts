import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

export const CLOUDINARY_RESOURCE_TYPES = ["image", "video", "raw"] as const;
export type CloudinaryResourceType = (typeof CLOUDINARY_RESOURCE_TYPES)[number];

function getCloudinaryConfig() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME?.trim() || "",
    apiKey: process.env.CLOUDINARY_API_KEY?.trim() || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET?.trim() || "",
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET?.trim() || "",
  };
}

function ensureConfigured() {
  const config = getCloudinaryConfig();
  if (!config.cloudName || !config.apiKey || !config.apiSecret) {
    throw new Error("Cloudinary server configuration is incomplete");
  }
  cloudinary.config({ cloud_name: config.cloudName, api_key: config.apiKey, api_secret: config.apiSecret, secure: true });
  return config;
}

export function isCloudinaryConfigured(): boolean {
  const config = getCloudinaryConfig();
  return Boolean(config.cloudName && config.apiKey && config.apiSecret);
}

function safeFolder(folder: string): string {
  const normalized = folder.trim().replace(/^\/+|\/+$/g, "");
  if (!normalized || normalized.length > 120 || !/^[a-zA-Z0-9/_-]+$/.test(normalized)) {
    throw new Error("Cloudinary folder contains invalid characters");
  }
  return normalized;
}

export function createCloudinaryUploadSignature(input: { folder: string; resourceType: CloudinaryResourceType }) {
  const config = ensureConfigured();
  const folder = safeFolder(input.folder);
  const timestamp = Math.floor(Date.now() / 1000);
  const signableParams = {
    folder,
    resource_type: input.resourceType,
    timestamp,
    ...(config.uploadPreset ? { upload_preset: config.uploadPreset } : {}),
  };
  const signature = cloudinary.utils.api_sign_request(signableParams, config.apiSecret);
  return {
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    timestamp,
    signature,
    uploadPreset: config.uploadPreset || undefined,
    folder,
    resourceType: input.resourceType,
  };
}

function validateCariSessionId(sessionId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
    throw new Error("Invalid Cari session identifier");
  }
  return `nexus/cari-sessions/${sessionId.toLowerCase()}`;
}

function createSessionCleanupToken(sessionId: string, apiSecret: string) {
  const folder = validateCariSessionId(sessionId);
  return createHmac("sha256", apiSecret).update(`cari-cleanup:${folder}`).digest("hex");
}

function verifyCariSessionCapability(sessionId: string, cleanupToken: string, apiSecret: string) {
  const expected = Buffer.from(createSessionCleanupToken(sessionId, apiSecret), "hex");
  const supplied = /^[0-9a-f]{64}$/i.test(cleanupToken) ? Buffer.from(cleanupToken, "hex") : Buffer.alloc(0);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new Error("Invalid Cari session capability");
  }
}

export function createCariUploadSession() {
  const config = ensureConfigured();
  const sessionId = randomUUID();
  return { sessionId, cleanupToken: createSessionCleanupToken(sessionId, config.apiSecret) };
}

export function createCariSessionUploadSignature(sessionId: string, cleanupToken: string) {
  const config = ensureConfigured();
  const folder = validateCariSessionId(sessionId);
  verifyCariSessionCapability(sessionId, cleanupToken, config.apiSecret);
  return { ...createCloudinaryUploadSignature({ folder, resourceType: "image" }), sessionId: sessionId.toLowerCase() };
}

export async function deleteCariSessionImages(sessionId: string, cleanupToken: string) {
  const folder = validateCariSessionId(sessionId);
  const config = ensureConfigured();
  verifyCariSessionCapability(sessionId, cleanupToken, config.apiSecret);
  return cloudinary.api.delete_resources_by_prefix(`${folder}/`, { resource_type: "image" });
}
