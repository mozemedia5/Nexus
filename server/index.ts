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
      .slice(-80)
      .map((message): ShoppingMessage => {
        const candidate = message as typeof message & { attachments?: unknown; imageUrls?: unknown };
        const attachments = Array.isArray(candidate.attachments)
          ? candidate.attachments.slice(0, 4).flatMap((attachment: unknown) => {
              if (!attachment || typeof attachment !== "object") return [];
              const item = attachment as { url?: unknown; mimeType?: unknown; resourceType?: unknown };
              if (
                typeof item.url !== "string" || item.url.length > 2048 ||
                typeof item.mimeType !== "string" || item.mimeType.length > 100 ||
                (item.resourceType !== "image" && item.resourceType !== "raw")
              ) return [];
              return [{ url: item.url, mimeType: item.mimeType, resourceType: item.resourceType as "image" | "raw" }];
            })
          : undefined;
        return {
          role: message.role as ShoppingMessage["role"],
          content: message.content.slice(0, 4000),
          attachments,
          imageUrls: Array.isArray(candidate.imageUrls)
            ? candidate.imageUrls.filter((url): url is string => typeof url === "string" && url.length <= 2048).slice(0, 4)
            : undefined,
        };
      });

    const catalog = (req.body?.catalog && typeof req.body.catalog === "object"
      ? req.body.catalog
      : {}) as ShoppingCatalogContext;

    try {
      const reply = await generateCariReply(messages, {
        currentPath: typeof catalog.currentPath === "string" ? catalog.currentPath.slice(0, 300) : "/",
        products: Array.isArray(catalog.products) ? catalog.products.slice(0, 1000) : [],
        collections: Array.isArray(catalog.collections) ? catalog.collections.slice(0, 250) : [],
        shoppingList: Array.isArray(catalog.shoppingList) ? catalog.shoppingList.slice(0, 100) : [],
      });
      res.json({ reply });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Shopping assistant unavailable";
      const status = message.includes("no larger than 10 MB") ? 413 : message.includes("not configured") || message.includes("needs a shopper") ? 412 : 502;
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
  const inMemoryCustomers: Array<{ uid: string; email: string; fullName: string; lastSeenAt: string }> = [];
  const inMemoryInteractions: Array<{ id: string; userEmail?: string; action: string; productTitle: string; productHandle?: string; category?: string; timestamp: string }> = [];

  // Newsletter Subscription API
  app.post("/api/newsletter/subscribe", async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const source = typeof req.body?.source === "string" ? req.body.source : "Newsletter Modal";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
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

  // Store signed-in customer emails only after verifying their Firebase ID token.
  app.post("/api/store/account", async (req, res) => {
    const bearer = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
    if (!bearer) {
      res.status(401).json({ error: "A signed-in customer session is required" });
      return;
    }
    try {
      if (!parseFirebaseServiceAccount()) {
        res.status(503).json({ error: "Customer email sync is not configured on this server" });
        return;
      }
      const { auth, firestore } = await import("./firebaseAdmin.js").then((m) => m.getFirebaseAdmin());
      const identity = await auth.verifyIdToken(bearer);
      const email = identity.email?.trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        res.status(401).json({ error: "Verified account email is required" });
        return;
      }
      const suppliedName = typeof req.body?.fullName === "string" ? req.body.fullName.trim().slice(0, 120) : "";
      const customer = { uid: identity.uid, email, fullName: suppliedName || identity.name || email.split("@")[0], lastSeenAt: new Date().toISOString() };
      await firestore.collection("nexus_customer_accounts").doc(identity.uid).set(customer, { merge: true });
      const existing = inMemoryCustomers.find((item) => item.uid === customer.uid);
      if (existing) Object.assign(existing, customer);
      else inMemoryCustomers.unshift(customer);
      res.json({ success: true });
    } catch (error) {
      res.status(401).json({ error: error instanceof Error ? error.message : "Customer account could not be verified" });
    }
  });

  // Track User Interaction / Likes API
  app.post("/api/user/interactions", async (req, res) => {
    const { userEmail, action, productTitle, productHandle, category } = req.body || {};
    const cleanTitle = typeof productTitle === "string" ? productTitle.trim().slice(0, 200) : "";
    const cleanEmail = typeof userEmail === "string" ? userEmail.trim().toLowerCase() : "";
    if (!cleanTitle) {
      res.status(400).json({ error: "productTitle is required" });
      return;
    }
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      res.status(400).json({ error: "A valid email address is required for identified product interests" });
      return;
    }

    const interaction = {
      id: `int-${Date.now()}`,
      userEmail: cleanEmail || "anonymous",
      action: typeof action === "string" && ["view", "add_to_cart", "newsletter_product_interest"].includes(action) ? action : "view",
      productTitle: cleanTitle,
      productHandle: typeof productHandle === "string" ? productHandle.trim().slice(0, 200) : undefined,
      category: typeof category === "string" ? category.trim().slice(0, 120) : "all",
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
      let customers = [...inMemoryCustomers];

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
          const customerSnap = await firestore.collection("nexus_customer_accounts").get();
          if (!customerSnap.empty) customers = customerSnap.docs.map((doc) => doc.data() as any);
        } catch {}
      }

      res.json({ subscribers, interactions, customers });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  // Admin Tracked Users Endpoint
  app.get("/api/admin/users", verifyAdminAuth, async (_req, res) => {
    try {
      let subscribers = [...inMemorySubscribers];
      let interactions = [...inMemoryInteractions];
      let customers = [...inMemoryCustomers];

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
          const customerSnap = await firestore.collection("nexus_customer_accounts").get();
          if (!customerSnap.empty) customers = customerSnap.docs.map((doc) => doc.data() as any);
        } catch {}
      }

      const orders = await fetchShopifyAdminOrders();

      const usersMap: Record<string, any> = {};
      const emails = new Set<string>();
      subscribers.forEach((subscriber) => { if (subscriber.email) emails.add(subscriber.email.toLowerCase()); });
      customers.forEach((customer) => { if (customer.email) emails.add(customer.email.toLowerCase()); });
      interactions.forEach((interaction) => {
        if (interaction.userEmail && interaction.userEmail !== "anonymous" && interaction.userEmail.includes("@")) {
          emails.add(interaction.userEmail.toLowerCase());
        }
      });

      Array.from(emails).forEach((email, idx) => {
        const subscriber = subscribers.find((item) => item.email?.toLowerCase() === email);
        const customer = customers.find((item) => item.email?.toLowerCase() === email);
        const userOrders = orders.filter((order) => order.customerEmail?.toLowerCase() === email);
        const totalSpent = userOrders.reduce((sum, order) => sum + (parseFloat(order.totalPrice?.amount) || 0), 0);
        const userInts = interactions.filter((interaction) => interaction.userEmail?.toLowerCase() === email);
        const smartCount = userInts.filter((interaction) => /smart|home/i.test(interaction.category || "")).length;
        const workCount = userInts.filter((interaction) => /workspace|desk/i.test(interaction.category || "")).length;
        const totalInts = smartCount + workCount;
        const smartScore = totalInts ? Math.round((smartCount / totalInts) * 100) : 50;
        const workScore = 100 - smartScore;
        const productTitles = Array.from(new Set(userInts.map((interaction) => interaction.productTitle).filter(Boolean)));
        const categories = userInts.reduce((counts: Record<string, number>, interaction) => {
          const label = interaction.category || "Other";
          counts[label] = (counts[label] || 0) + 1;
          return counts;
        }, {});
        const primaryInterest = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0]
          || (userOrders.length ? "Customer" : "Newsletter subscriber");

        usersMap[email] = {
          id: `usr-${idx + 1}`,
          fullName: customer?.fullName || userOrders[0]?.customerName || email.split("@")[0].replace(/[._-]/g, " "),
          email,
          location: "Not provided",
          totalOrders: userOrders.length,
          totalSpent,
          primaryInterest,
          smartHomeScore: smartScore,
          workspaceScore: workScore,
          searchedKeywords: productTitles.slice(0, 10),
          likedProducts: userInts.filter((interaction) => interaction.action === "like").map((interaction) => interaction.productTitle),
          lastActive: customer?.lastSeenAt || userInts.at(-1)?.timestamp || subscriber?.subscribedAt || new Date().toISOString(),
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
      let customers = [...inMemoryCustomers];

      if (parseFirebaseServiceAccount()) {
        try {
          const { firestore } = await import("./firebaseAdmin.js").then((m) => m.getFirebaseAdmin());
          const [subSnap, intSnap, customerSnap] = await Promise.all([
            firestore.collection("nexus_subscribers").get(),
            firestore.collection("nexus_user_interactions").limit(100).get(),
            firestore.collection("nexus_customer_accounts").get(),
          ]);
          if (!subSnap.empty) subscribers = subSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
          if (!intSnap.empty) interactions = intSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
          if (!customerSnap.empty) customers = customerSnap.docs.map((doc) => doc.data() as any);
        } catch {}
      }

      const emails = new Set<string>();
      subscribers.forEach((subscriber) => { if (subscriber.email) emails.add(subscriber.email.toLowerCase()); });
      customers.forEach((customer) => { if (customer.email) emails.add(customer.email.toLowerCase()); });
      interactions.forEach((interaction) => {
        if (interaction.userEmail && interaction.userEmail !== "anonymous" && interaction.userEmail.includes("@")) emails.add(interaction.userEmail.toLowerCase());
      });
      const userIndex = Number(id.replace(/^usr-/, "")) - 1;
      const email = Array.from(emails)[userIndex];
      if (!email) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const customer = customers.find((item) => item.email?.toLowerCase() === email);
      const subscriber = subscribers.find((item) => item.email?.toLowerCase() === email);
      const userOrders = orders.filter((order) => order.customerEmail?.toLowerCase() === email);
      const userInts = interactions.filter((interaction) => interaction.userEmail?.toLowerCase() === email);
      const categories = userInts.reduce((counts: Record<string, number>, interaction) => {
        const label = interaction.category || "Other";
        counts[label] = (counts[label] || 0) + 1;
        return counts;
      }, {});
      const productInterests = Array.from(new Set(userInts.map((interaction) => interaction.productTitle).filter(Boolean))).slice(0, 30);
      const totalSpent = userOrders.reduce((sum, order) => sum + (parseFloat(order.totalPrice?.amount) || 0), 0);
      const user = {
        id,
        fullName: customer?.fullName || userOrders[0]?.customerName || email.split("@")[0].replace(/[._-]/g, " "),
        email,
        location: "Not provided",
        totalOrders: userOrders.length,
        totalSpent,
        primaryInterest: Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || (userOrders.length ? "Customer" : "Newsletter subscriber"),
        productInterests,
        searchedKeywords: productInterests,
        likedProducts: userInts.filter((interaction) => interaction.action === "like").map((interaction) => interaction.productTitle),
        lastActive: customer?.lastSeenAt || userInts.at(-1)?.timestamp || subscriber?.subscribedAt || new Date().toISOString(),
      };
      res.json({ user });
    } catch {
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
        const resourceType = req.body?.resourceType ?? "image";
        if (resourceType !== "image" && resourceType !== "raw") {
          res.status(400).json({ error: "Cari uploads support only images and PDF files." });
          return;
        }
        res.json(createCariSessionUploadSignature(req.body.sessionId, req.body.cleanupToken, resourceType));
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
