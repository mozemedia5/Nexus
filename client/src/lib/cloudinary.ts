export type CloudinaryResourceType = "image" | "video" | "raw";

type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  uploadPreset?: string;
  folder: string;
  resourceType: CloudinaryResourceType;
  cleanupToken?: string;
};

type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
  resource_type: string;
  cleanupToken?: string;
  [key: string]: unknown;
};

export async function requestCloudinaryUploadSignature(
  folder = "nexus/media",
  resourceType: CloudinaryResourceType = "image",
  sessionId?: string,
): Promise<UploadSignature> {
  const response = await fetch("/api/cloudinary/signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder, resourceType, ...(sessionId ? { sessionId } : {}) }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Unable to prepare Cloudinary upload");
  }
  return (await response.json()) as UploadSignature;
}

export async function uploadToCloudinary(
  file: File,
  options: { folder?: string; resourceType?: CloudinaryResourceType; sessionId?: string } = {},
): Promise<CloudinaryUploadResult> {
  const resourceType = options.resourceType ?? "image";
  const signature = await requestCloudinaryUploadSignature(options.folder, resourceType, options.sessionId);
  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloudName)}/${resourceType}/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signature.apiKey);
  form.append("timestamp", String(signature.timestamp));
  form.append("signature", signature.signature);
  form.append("folder", signature.folder);
  if (signature.uploadPreset) form.append("upload_preset", signature.uploadPreset);

  const response = await fetch(endpoint, { method: "POST", body: form });
  if (!response.ok) throw new Error(`Cloudinary upload failed (${response.status})`);
  return { ...(await response.json()) as CloudinaryUploadResult, cleanupToken: signature.cleanupToken };
}

export async function cleanupCloudinarySessionImages(sessionId: string, cleanupToken: string) {
  const response = await fetch("/api/cloudinary/session-cleanup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, cleanupToken }),
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string; success?: boolean };
  if (!response.ok || !payload.success) throw new Error(payload.error || "Unable to clear temporary image uploads.");
}
