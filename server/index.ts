import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { isCloudinaryConfigured, createCloudinaryUploadSignature, CLOUDINARY_RESOURCE_TYPES } from "./cloudinary.js";
import { parseFirebaseServiceAccount } from "./firebaseAdmin.js";
import { generateCariReply, isHannaConfigured, type ShoppingCatalogContext, type ShoppingMessage } from "./hanna.js";
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
      shoppingAssistantConfigured: isHannaConfigured(),
      shoppingAssistantModelConfigured: Boolean(process.env.GEMINI_MODEL?.trim()),
    });
  });
  app.post("/api/chat", async (req, res) => {
    const rawMessages = req.body?.messages;
    if (!Array.isArray(rawMessages)) {
      res.status(400).json({ error: "messages must be an array" });
      return;
    }

    const messages = rawMessages
      .filter((message: unknown): message is { role: string; content: string } => {
        if (!message || typeof message !== "object") return false;
        const candidate = message as { role?: unknown; content?: unknown };
        return (
          (candidate.role === "user" || candidate.role === "assistant") &&
          typeof candidate.content === "string"
        );
      })
      .slice(-20)
      .map((message): ShoppingMessage => ({
        role: message.role as ShoppingMessage["role"],
        content: message.content.slice(0, 4000),
      }));

    const catalog = (req.body?.catalog && typeof req.body.catalog === "object"
      ? req.body.catalog
      : {}) as ShoppingCatalogContext;

    try {
      const reply = await generateCariReply(messages, {
        currentPath: typeof catalog.currentPath === "string" ? catalog.currentPath.slice(0, 300) : "/",
        products: Array.isArray(catalog.products) ? catalog.products.slice(0, 120) : [],
        collections: Array.isArray(catalog.collections) ? catalog.collections.slice(0, 40) : [],
      });
      res.json({ reply });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Shopping assistant unavailable";
      const status = message.includes("not configured") || message.includes("needs a shopper") ? 412 : 502;
      res.status(status).json({ error: message });
    }
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
