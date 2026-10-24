import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { isCloudinaryConfigured, createCloudinaryUploadSignature, createCariUploadSession, createCariSessionUploadSignature, deleteCariSessionImages, CLOUDINARY_RESOURCE_TYPES } from "./cloudinary.js";
import { parseFirebaseServiceAccount } from "./firebaseAdmin.js";
import { AdminAccountError, AdminAuthError, authenticateAdminAuthorization, requireSuperAdmin, type AdminPrincipal } from "./adminAuth.js";
import { listAdminAccounts, promoteVerifiedFirebaseUser, revokeAdminAccount } from "./adminAccounts.js";
import { generateCariReply, isHannaConfigured, type ShoppingCatalogContext, type ShoppingMessage } from "./hanna.js";
import { fetchShopifyOrderTracking } from "../api/order-tracking.js";
import { fetchShopifyAdminOrders, fetchShopifyAdminMetrics } from "./shopifyAdmin.js";
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
      shoppingAssistantModelConfigured: Boolean(process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash"),
      shopifyAdminConfigured: Boolean(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN),
    });
  });

  app.post("/api/chat/reserve", async (req, res) => {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const shoppingList = Array.isArray(req.body?.shoppingList) ? req.body.shoppingList : [];
    const sessionTitle = typeof req.body?.title === "string" ? req.body.title : "Reserved Shopping Session";

    try {
      const admin = parseFirebaseServiceAccount();
      if (admin) {
        const { firestore } = await import("./firebaseAdmin.js").then((m) => m.getFirebaseAdmin());
        const docRef = await firestore.collection("nexus_cari_conversations").add({
          title: sessionTitle,
          messages,
          shoppingList,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        res.json({ success: true, reservationId: docRef.id, storage: "firestore" });
        return;
      }
      res.json({ success: true, reservationId: `local-${Date.now()}`, storage: "client" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reserve conversation";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/order-tracking", async (req, res) => {
    const orderNumber = typeof req.body?.orderNumber === "string" ? req.body.orderNumber : "";
    const emailOrPhone = typeof req.body?.emailOrPhone === "string" ? req.body.emailOrPhone : "";

    try {
      const order = await fetchShopifyOrderTracking(orderNumber, emailOrPhone);
      if (!order) {
        res.status(404).json({ error: "Order not found. Please check your order details." });
        return;
      }
      res.json({ order });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to lookup order";
      const status = message.includes("Verification failed") ? 403 : message.includes("required") ? 400 : 500;
      res.status(status).json({ error: message });
    }
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
        imageUrls: Array.isArray((message as unknown as { imageUrls?: unknown }).imageUrls)
          ? ((message as unknown as { imageUrls: unknown[] }).imageUrls).filter((url): url is string => typeof url === "string").slice(0, 4)
          : undefined,
      }));

    const catalog = (req.body?.catalog && typeof req.body.catalog === "object"
      ? req.body.catalog
      : {}) as ShoppingCatalogContext;

    try {
      const reply = await generateCariReply(messages, {
        currentPath: typeof catalog.currentPath === "string" ? catalog.currentPath.slice(0, 300) : "/",
        products: Array.isArray(catalog.products) ? catalog.products.slice(0, 120) : [],
        collections: Array.isArray(catalog.collections) ? catalog.collections.slice(0, 40) : [],
        shoppingList: Array.isArray(catalog.shoppingList) ? catalog.shoppingList.slice(0, 100) : [],
      });
      res.json({ reply });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Shopping assistant unavailable";
      const status = message.includes("not configured") || message.includes("needs a shopper") ? 412 : 502;
      res.status(status).json({ error: message });
    }
  });

  const verifyAdminAuth: express.RequestHandler = (req, res, next) => {
    void authenticateAdminAuthorization(req.headers.authorization)
      .then((admin) => { res.locals.admin = admin; next(); })
      .catch((error) => {
        const status = error instanceof AdminAuthError ? error.status : 500;
        res.status(status).json({ error: error instanceof AdminAuthError ? error.message : "Administrator authentication failed." });
      });
  };

  const verifySuperAdminAuth: express.RequestHandler = (_req, res, next) => {
    try {
      requireSuperAdmin(res.locals.admin as AdminPrincipal);
      next();
    } catch (error) {
      const status = error instanceof AdminAuthError ? error.status : 403;
      res.status(status).json({ error: error instanceof AdminAuthError ? error.message : "Superadministrator access is required." });
    }
  };

  app.get("/api/admin/session", verifyAdminAuth, (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ admin: res.locals.admin });
  });

  app.post("/api/admin/logout", verifyAdminAuth, async (_req, res) => {
    try {
      const { auth } = await import("./firebaseAdmin.js").then((m) => m.getFirebaseAdmin());
      await auth.revokeRefreshTokens((res.locals.admin as AdminPrincipal).uid);
      res.status(204).end();
    } catch {
      res.status(503).json({ error: "Could not revoke the administrator session." });
    }
  });

  app.get("/api/admin/admins", verifyAdminAuth, verifySuperAdminAuth, async (_req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      res.json({ admins: await listAdminAccounts() });
    } catch (error) {
      const status = error instanceof AdminAccountError ? error.status : 500;
      res.status(status).json({ error: error instanceof AdminAccountError ? error.message : "Unable to list administrator accounts." });
    }
  });

  app.post("/api/admin/create-admin", verifyAdminAuth, verifySuperAdminAuth, async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
    try {
      const admin = await promoteVerifiedFirebaseUser({
        email: typeof body.email === "string" ? body.email : "",
        fullName: typeof body.fullName === "string" ? body.fullName : undefined,
        actor: res.locals.admin as AdminPrincipal,
      });
      res.status(201).json({ success: true, admin, message: "Verified Firebase account promoted. The user must sign in again to receive admin access." });
    } catch (error) {
      const status = error instanceof AdminAccountError ? error.status : 500;
      res.status(status).json({ error: error instanceof AdminAccountError ? error.message : "Could not promote this Firebase account." });
    }
  });

  app.delete("/api/admin/admins/:uid", verifyAdminAuth, verifySuperAdminAuth, async (req, res) => {
    try {
      await revokeAdminAccount(req.params.uid, res.locals.admin as AdminPrincipal);
      res.status(204).end();
    } catch (error) {
      const status = error instanceof AdminAccountError ? error.status : 500;
      res.status(status).json({ error: error instanceof AdminAccountError ? error.message : "Could not revoke administrator access." });
    }
  });

  // Cari may read Firebase account emails only after this request passes Firebase admin auth.
  app.get("/api/admin/cari/user-emails", verifyAdminAuth, async (_req, res) => {
    try {
      const { auth } = await import("./firebaseAdmin.js").then((m) => m.getFirebaseAdmin());
      const users: Array<{ uid: string; email: string; displayName: string }> = [];
      let pageToken: string | undefined;
      do {
        const page = await auth.listUsers(1000, pageToken);
        users.push(...page.users.filter((user) => user.email).map((user) => ({
          uid: user.uid, email: user.email!, displayName: user.displayName || "",
        })));
        pageToken = page.pageToken;
      } while (pageToken);
      res.json({ users });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to read Firebase account emails";
      res.status(500).json({ error: message });
    }
  });

  // Admin Orders received endpoint using Shopify Admin Access Token
  app.get("/api/admin/orders", verifyAdminAuth, async (_req, res) => {
    try {
      const orders = await fetchShopifyAdminOrders();
      res.json({ orders });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch admin orders";
      res.status(500).json({ error: message });
    }
  });

  // Admin Analytics & Metrics endpoint
  app.get("/api/admin/metrics", verifyAdminAuth, async (_req, res) => {
    try {
      const orders = await fetchShopifyAdminOrders();
      const metrics = await fetchShopifyAdminMetrics(orders);
      res.json({ metrics });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to calculate analytics metrics";
      res.status(500).json({ error: message });
    }
  });

  // Memory/Firestore subscriber and interaction stores
  const inMemorySubscribers: Array<{ id: string; email: string; source: string; subscribedAt: string }> = [];
  const inMemoryInteractions: Array<{ id: string; userEmail?: string; action: string; productTitle: string; category?: string; timestamp: string }> = [];

  // Newsletter Subscription API
  app.post("/api/newsletter/subscribe", async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const source = typeof req.body?.source === "string" ? req.body.source : "Newsletter Modal";

    if (!email || !email.includes("@")) {
      res.status(400).json({ error: "Valid email address is required" });
      return;
    }

    try {
      const admin = parseFirebaseServiceAccount();
      if (admin) {
        const { firestore } = await import("./firebaseAdmin.js").then((m) => m.getFirebaseAdmin());
        await firestore.collection("nexus_subscribers").doc(email).set({
          email,
          source,
          subscribedAt: new Date().toISOString(),
        }, { merge: true });
      }

      if (!inMemorySubscribers.some((s) => s.email === email)) {
        inMemorySubscribers.unshift({
          id: `sub-${Date.now()}`,
          email,
          source,
          subscribedAt: new Date().toISOString(),
        });
      }

      res.json({ success: true, message: "Successfully subscribed to Nexus updates" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Subscription failed";
      res.status(500).json({ error: message });
    }
  });

  // Track User Interaction / Likes API
  app.post("/api/user/interactions", async (req, res) => {
    const { userEmail, action, productTitle, category } = req.body || {};
    if (!productTitle) {
      res.status(400).json({ error: "productTitle is required" });
      return;
    }

    const interaction = {
      id: `int-${Date.now()}`,
      userEmail: typeof userEmail === "string" ? userEmail.toLowerCase() : "anonymous",
      action: typeof action === "string" ? action : "view",
      productTitle: String(productTitle),
      category: typeof category === "string" ? category : "all",
      timestamp: new Date().toISOString(),
    };

    try {
      const admin = parseFirebaseServiceAccount();
      if (admin) {
        const { firestore } = await import("./firebaseAdmin.js").then((m) => m.getFirebaseAdmin());
        await firestore.collection("nexus_user_interactions").add(interaction);
      }
      inMemoryInteractions.unshift(interaction);
      res.json({ success: true, interaction });
    } catch (error) {
      res.status(500).json({ error: "Failed to record interaction" });
    }
  });

  // Admin Leads and Tracked Interests API
  app.get("/api/admin/leads", verifyAdminAuth, async (_req, res) => {
    try {
      let subscribers = [...inMemorySubscribers];
      let interactions = [...inMemoryInteractions];

      const admin = parseFirebaseServiceAccount();
      if (admin) {
        try {
          const { firestore } = await import("./firebaseAdmin.js").then((m) => m.getFirebaseAdmin());
          const subSnap = await firestore.collection("nexus_subscribers").get();
          if (!subSnap.empty) {
            subscribers = subSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
          }
          const intSnap = await firestore.collection("nexus_user_interactions").limit(100).get();
          if (!intSnap.empty) {
            interactions = intSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
          }
        } catch {}
      }

      res.json({ subscribers, interactions });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  // Admin Tracked Users Endpoint
  app.get("/api/admin/users", verifyAdminAuth, async (_req, res) => {
    try {
      let subscribers = [...inMemorySubscribers];
      let interactions = [...inMemoryInteractions];

      const admin = parseFirebaseServiceAccount();
      if (admin) {
        try {
          const { firestore } = await import("./firebaseAdmin.js").then((m) => m.getFirebaseAdmin());
          const subSnap = await firestore.collection("nexus_subscribers").get();
          if (!subSnap.empty) {
            subscribers = subSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
          }
          const intSnap = await firestore.collection("nexus_user_interactions").limit(100).get();
          if (!intSnap.empty) {
            interactions = intSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
          }
        } catch {}
      }

      const orders = await fetchShopifyAdminOrders();

      const usersMap: Record<string, any> = {};

      subscribers.forEach((sub, idx) => {
        const email = sub.email.toLowerCase();
        const userOrders = orders.filter((o) => o.customerEmail?.toLowerCase() === email);
        const totalSpent = userOrders.reduce((sum, o) => sum + (parseFloat(o.totalPrice?.amount) || 0), 0);
        const userInts = interactions.filter((i) => i.userEmail?.toLowerCase() === email);
        const smartCount = userInts.filter((i) => i.category === "smart-home").length;
        const workCount = userInts.filter((i) => i.category === "workspace-productivity").length;
        const totalInts = userInts.length || 1;

        const smartScore = Math.round((smartCount / totalInts) * 100) || 50;
        const workScore = 100 - smartScore;

        usersMap[email] = {
          id: `usr-${idx + 1}`,
          fullName: userOrders[0]?.customerName || email.split("@")[0].replace(".", " "),
          email,
          location: "Global Customer",
          totalOrders: userOrders.length,
          totalSpent,
          primaryInterest: smartScore >= workScore ? "Smart Home Automation" : "Workspace Productivity",
          smartHomeScore: smartScore,
          workspaceScore: workScore,
          searchedKeywords: userInts.map((i) => i.productTitle).slice(0, 5),
          likedProducts: userInts.filter((i) => i.action === "like").map((i) => i.productTitle),
          lastActive: sub.subscribedAt || new Date().toISOString(),
        };
      });

      res.json({ users: Object.values(usersMap) });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Admin Single User Profile Endpoint
  app.get("/api/admin/users/:id", verifyAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const orders = await fetchShopifyAdminOrders();
      let subscribers = [...inMemorySubscribers];
      let interactions = [...inMemoryInteractions];

      const admin = parseFirebaseServiceAccount();
      if (admin) {
        try {
          const { firestore } = await import("./firebaseAdmin.js").then((m) => m.getFirebaseAdmin());
          const subSnap = await firestore.collection("nexus_subscribers").get();
          if (!subSnap.empty) {
            subscribers = subSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
          }
          const intSnap = await firestore.collection("nexus_user_interactions").limit(100).get();
          if (!intSnap.empty) {
            interactions = intSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
          }
        } catch {}
      }

      const matchedSub = subscribers.find((_, idx) => `usr-${idx + 1}` === id) || subscribers[0];
      if (!matchedSub) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const email = matchedSub.email.toLowerCase();
      const userOrders = orders.filter((o) => o.customerEmail?.toLowerCase() === email);
      const totalSpent = userOrders.reduce((sum, o) => sum + (parseFloat(o.totalPrice?.amount) || 0), 0);
      const userInts = interactions.filter((i) => i.userEmail?.toLowerCase() === email);
      const smartCount = userInts.filter((i) => i.category === "smart-home").length;
      const workCount = userInts.filter((i) => i.category === "workspace-productivity").length;
      const totalInts = userInts.length || 1;

      const smartScore = Math.round((smartCount / totalInts) * 100) || 50;
      const workScore = 100 - smartScore;

      const user = {
        id,
        fullName: userOrders[0]?.customerName || email.split("@")[0].replace(".", " "),
        email,
        location: "Global Customer",
        totalOrders: userOrders.length,
        totalSpent,
        primaryInterest: smartScore >= workScore ? "Smart Home Automation" : "Workspace Productivity",
        smartHomeScore: smartScore,
        workspaceScore: workScore,
        searchedKeywords: userInts.map((i) => i.productTitle).slice(0, 5),
        likedProducts: userInts.filter((i) => i.action === "like").map((i) => i.productTitle),
        lastActive: matchedSub.subscribedAt || new Date().toISOString(),
      };

      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user details" });
    }
  });

  app.post("/api/cloudinary/session", (_req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      res.status(201).json(createCariUploadSession());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create a temporary image session";
      res.status(412).json({ error: message });
    }
  });

  app.post("/api/cloudinary/signature", (req, res, next) => {
    if (typeof req.body?.sessionId === "string") return next();
    return verifyAdminAuth(req, res, next);
  }, (req, res) => {
    if (typeof req.body?.sessionId === "string") {
      try {
        if (typeof req.body?.cleanupToken !== "string") {
          res.status(400).json({ error: "A valid Cari session capability is required." });
          return;
        }
        res.json(createCariSessionUploadSignature(req.body.sessionId, req.body.cleanupToken));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to create upload signature";
        res.status(message.includes("Invalid") ? 403 : 412).json({ error: message });
      }
      return;
    }
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

  app.post("/api/cloudinary/session-cleanup", async (req, res) => {
    const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId : "";
    const cleanupToken = typeof req.body?.cleanupToken === "string" ? req.body.cleanupToken : "";
    if (!sessionId || !cleanupToken) {
      res.status(400).json({ error: "sessionId and cleanupToken are required" });
      return;
    }
    try {
      const result = await deleteCariSessionImages(sessionId, cleanupToken);
      res.json({ success: true, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to clean up Cari session images";
      res.status(message.includes("Invalid") ? 403 : 502).json({ error: message });
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
