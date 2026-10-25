import { getAdminAuthHeaders } from "@/lib/firebase";

export type CloudinaryResourceType = "image" | "video" | "raw";
export type CariUploadSession = { sessionId: string; cleanupToken: string };

type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  uploadPreset?: string;
  folder: string;
  resourceType: CloudinaryResourceType;
};

type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
  resource_type: string;
  cleanupToken?: string;
  [key: string]: unknown;
};

async function readError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null) as { error?: string } | null;
  return new Error(payload?.error || fallback);
}

export async function createCariUploadSession(): Promise<CariUploadSession> {
  const response = await fetch("/api/cloudinary/session", { method: "POST", cache: "no-store" });
  if (!response.ok) throw await readError(response, "Unable to start a temporary attachment session.");
  const session = await response.json() as Partial<CariUploadSession>;
  if (!session.sessionId || !session.cleanupToken) throw new Error("The attachment session could not be verified.");
  return { sessionId: session.sessionId, cleanupToken: session.cleanupToken };
}

export async function requestCloudinaryUploadSignature(
  folder = "nexus/media",
  resourceType: CloudinaryResourceType = "image",
  session?: CariUploadSession,
): Promise<UploadSignature> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const body = session
    ? { sessionId: session.sessionId, cleanupToken: session.cleanupToken, resourceType }
    : { folder, resourceType };
  if (!session) Object.assign(headers, await getAdminAuthHeaders());

  const endpoint = session ? "/api/cloudinary/cari-signature" : "/api/cloudinary/signature";
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await readError(response, "Unable to prepare Cloudinary upload.");
  return await response.json() as UploadSignature;
}

export async function uploadToCloudinary(
  file: File,
  options: { folder?: string; resourceType?: CloudinaryResourceType; sessionId?: string; cleanupToken?: string } = {},
): Promise<CloudinaryUploadResult> {
  const resourceType = options.resourceType ?? "image";
  let session: CariUploadSession | undefined;
  if (options.sessionId || options.cleanupToken) {
    if (!options.sessionId || !options.cleanupToken) throw new Error("A complete Cari attachment-session capability is required.");
    session = { sessionId: options.sessionId, cleanupToken: options.cleanupToken };
  }

  const signature = await requestCloudinaryUploadSignature(options.folder, resourceType, session);
  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloudName)}/${resourceType}/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signature.apiKey);
  form.append("timestamp", String(signature.timestamp));
  form.append("signature", signature.signature);
  form.append("folder", signature.folder);
  if (signature.uploadPreset) form.append("upload_preset", signature.uploadPreset);

  const response = await fetch(endpoint, { method: "POST", body: form });
  if (!response.ok) throw new Error(`Cloudinary upload failed (${response.status}).`);
  return { ...await response.json() as CloudinaryUploadResult, cleanupToken: session?.cleanupToken };
}

export async function cleanupCloudinarySessionImages(sessionId: string, cleanupToken: string) {
  const response = await fetch("/api/cloudinary/session-cleanup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, cleanupToken }),
  });
  const payload = await response.json().catch(() => ({})) as { error?: string; success?: boolean };
  if (!response.ok || !payload.success) throw new Error(payload.error || "Unable to clear temporary Cari uploads.");
}
