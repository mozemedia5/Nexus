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

  // AI Assistant Endpoint for Customer Shopping
  app.post("/api/chat", async (req, res) => {
    const { messages } = req.body || {};
    if (!Array.isArray(messages)) {
      res.status(400).json({ error: "Invalid request payload. 'messages' must be an array." });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";

    if (!apiKey) {
      res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      return;
    }

    // System context giving full store details
    const storeContext = `You are Cari, the warm, helpful, and sophisticated AI Shopping Assistant at Liverton Store (By Hanna).
Liverton Store is a premier destination in Uganda offering "Smart finds for everyday living".
Key Store Information:
- Product Categories: Beauty & Personal Care, Kitchen & Gadgets, Home Essentials, Fashion & Lifestyle.
- Currency: Ugandan Shillings (UGX).
- Shipping: Fast delivery within Kampala and across Uganda. Standard delivery takes 1-3 business days.
- Customer Care: Friendly support, easy return & exchange policies within 7 days for eligible items.
- Your Persona: You are named Cari (developed By Hanna), elegant, knowledgeable, polite, and enthusiastic about helping customers find the perfect products for their needs, budget, and lifestyle.
- Guidelines:
  1. Always be welcoming and introduce yourself as Cari if asked or at the start.
  2. Assist customers with product recommendations, order questions, beauty tips, kitchen gadget suggestions, and store info.
  3. When recommending items, highlight their utility and value in UGX.
  4. Keep answers concise, helpful, clear, and formatted nicely with bullet points where helpful.`;

    try {
      // Map message structure to Gemini contents format
      const contents = messages.map((m: { role: string; content: string }) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));

      const payload = {
        systemInstruction: {
          parts: [{ text: storeContext }],
        },
        contents,
      };

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error response:", errorText);
        res.status(response.status).json({ error: "Failed to communicate with Gemini AI." });
        return;
      }

      const data = await response.json();
      const textResponse =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I'm sorry, I couldn't process your request right now. How else can I assist you at Liverton Store?";

      res.json({ reply: textResponse });
    } catch (err) {
      console.error("Chat API exception:", err);
      res.status(500).json({ error: "Internal server error during chat processing." });
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
