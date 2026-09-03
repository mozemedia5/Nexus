import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { isCloudinaryConfigured, createCloudinaryUploadSignature, CLOUDINARY_RESOURCE_TYPES } from "./cloudinary.js";
import { parseFirebaseServiceAccount } from "./firebaseAdmin.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.json({ limit: "2mb" }));
  app.get("/api/health/config", (_req, res) => {
    res.json({
      firebaseClientConfigured: Boolean(process.env.VITE_FIREBASE_CONFIG_JSON),
      firebaseAdminConfigured: Boolean(parseFirebaseServiceAccount()),
      cloudinaryConfigured: isCloudinaryConfigured(),
      cloudinaryUploadPresetConfigured: Boolean(process.env.CLOUDINARY_UPLOAD_PRESET),
    });
  });
  app.post("/api/cloudinary/signature", (req, res) => {
    const folder = typeof req.body?.folder === "string" ? req.body.folder : "nexus/media";
    const resourceType = req.body?.resourceType ?? "image";
    if (!CLOUDINARY_RESOURCE_TYPES.includes(resourceType)) {
      res.status(400).json({ error: "resourceType must be image, video, or raw" });
      return;
    }
    try {
      res.json(createCloudinaryUploadSignature({ folder, resourceType }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create upload signature";
      const status = message.includes("invalid") ? 400 : 412;
      res.status(status).json({ error: message });
    }
  });
  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
