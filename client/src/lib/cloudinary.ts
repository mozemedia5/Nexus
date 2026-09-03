export type CloudinaryResourceType = "image" | "video" | "raw";

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
  [key: string]: unknown;
};

export async function requestCloudinaryUploadSignature(
  folder = "nexus/media",
  resourceType: CloudinaryResourceType = "image",
): Promise<UploadSignature> {
  const response = await fetch("/api/cloudinary/signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder, resourceType }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Unable to prepare Cloudinary upload");
  }
  return (await response.json()) as UploadSignature;
}

export async function uploadToCloudinary(
  file: File,
  options: { folder?: string; resourceType?: CloudinaryResourceType } = {},
): Promise<CloudinaryUploadResult> {
  const resourceType = options.resourceType ?? "image";
  const signature = await requestCloudinaryUploadSignature(options.folder, resourceType);
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
  return (await response.json()) as CloudinaryUploadResult;
}
