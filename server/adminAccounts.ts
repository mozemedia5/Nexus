import { getFirebaseAdmin } from "./firebaseAdmin.js";
import { AdminAccountError, getInitialAdminEmail } from "./adminAuth.js";
import type { AdminRole, AdminPrincipal } from "./adminAuth.js";

export type AdminAccount = {
  uid: string;
  email: string;
  fullName: string;
  role: AdminRole;
  isAdmin: true;
  createdAt: string;
  isBootstrap?: boolean;
};

function toIsoDate(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return (value.toDate() as Date).toISOString();
  }
  return "";
}

async function getFirebaseServices() {
  try {
    return getFirebaseAdmin();
  } catch {
    throw new AdminAccountError(503, "Firebase Admin is not configured on the server.");
  }
}

export async function listAdminAccounts(): Promise<AdminAccount[]> {
  const { auth, firestore } = await getFirebaseServices();
  const records = await firestore.collection("nexus_admins").where("isAdmin", "==", true).get();
  const admins = (await Promise.all(records.docs.map(async (record) => {
    try {
      const user = await auth.getUser(record.id);
      const stored = record.data();
      if (user.disabled || !user.emailVerified || user.customClaims?.admin !== true || stored.active === false) return null;
      const role: AdminRole = user.customClaims?.role === "superadmin" ? "superadmin" : "admin";
      return {
        uid: user.uid,
        email: user.email ?? String(stored.email ?? ""),
        fullName: user.displayName || String(stored.fullName ?? user.email ?? "Administrator"),
        role,
        isAdmin: true as const,
        createdAt: toIsoDate(stored.createdAt),
      } satisfies AdminAccount;
    } catch {
      // Ignore stale registry documents which do not map to Firebase Auth users.
      return null;
    }
  }))).filter((admin): admin is AdminAccount => Boolean(admin));

  const bootstrapEmail = getInitialAdminEmail();
  if (bootstrapEmail) {
    try {
      const user = await auth.getUserByEmail(bootstrapEmail);
      if (!user.disabled && user.emailVerified && !admins.some((admin) => admin.uid === user.uid)) {
        admins.unshift({
          uid: user.uid,
          email: user.email ?? bootstrapEmail,
          fullName: user.displayName || user.email || "Initial Superadministrator",
          role: "superadmin",
          isAdmin: true,
          createdAt: "",
          isBootstrap: true,
        });
      }
    } catch {
      // The bootstrap email may be configured before its Firebase Auth user is created.
    }
  }

  return admins.sort((a, b) => (a.role === b.role ? a.email.localeCompare(b.email) : a.role === "superadmin" ? -1 : 1));
}

export async function promoteVerifiedFirebaseUser(input: {
  email: string;
  fullName?: string;
  actor: AdminPrincipal;
}): Promise<AdminAccount> {
  if (input.actor.role !== "superadmin") throw new AdminAccountError(403, "Only a superadministrator can promote accounts.");
  const email = input.email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new AdminAccountError(400, "Enter a valid email address.");

  const { auth, firestore } = await getFirebaseServices();
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch {
    throw new AdminAccountError(404, "That email must have a Firebase account before it can be promoted.");
  }
  if (user.disabled || !user.emailVerified) {
    throw new AdminAccountError(409, "The Firebase account must be active and have a verified email address.");
  }
  if (email === getInitialAdminEmail()) {
    throw new AdminAccountError(409, "The configured initial superadministrator cannot be changed here.");
  }
  if (user.customClaims?.role === "superadmin") {
    throw new AdminAccountError(409, "Superadministrator roles are managed through server configuration.");
  }

  const fullName = input.fullName?.trim().slice(0, 120) || user.displayName || email.split("@")[0];
  const ref = firestore.collection("nexus_admins").doc(user.uid);
  const priorRecord = await ref.get();
  const priorData = priorRecord.exists ? priorRecord.data() : undefined;
  const createdAt = priorData?.createdAt ?? new Date().toISOString();
  const record = {
    uid: user.uid,
    email,
    fullName,
    role: "admin" as const,
    isAdmin: true,
    active: true,
    createdAt,
    updatedAt: new Date().toISOString(),
    createdBy: input.actor.uid,
  };

  await ref.set(record, { merge: true });
  try {
    await auth.setCustomUserClaims(user.uid, {
      ...(user.customClaims ?? {}),
      admin: true,
      role: "admin",
    });
    await auth.revokeRefreshTokens(user.uid);
  } catch {
    if (priorRecord.exists && priorData) await ref.set(priorData);
    else await ref.delete();
    throw new AdminAccountError(503, "Could not securely promote the Firebase account.");
  }

  return { uid: user.uid, email, fullName, role: "admin", isAdmin: true, createdAt };
}

export async function revokeAdminAccount(uid: string, actor: AdminPrincipal): Promise<void> {
  if (actor.role !== "superadmin") throw new AdminAccountError(403, "Only a superadministrator can revoke admin access.");
  if (!uid || uid.length > 128) throw new AdminAccountError(400, "A valid Firebase UID is required.");
  if (uid === actor.uid) throw new AdminAccountError(409, "You cannot revoke your own administrator access.");

  const { auth, firestore } = await getFirebaseServices();
  let user;
  try {
    user = await auth.getUser(uid);
  } catch {
    throw new AdminAccountError(404, "Administrator account not found.");
  }
  if (user.email?.toLowerCase() === getInitialAdminEmail()) {
    throw new AdminAccountError(409, "The configured initial superadministrator cannot be revoked here.");
  }
  if (user.customClaims?.admin !== true || user.customClaims?.role === "superadmin") {
    throw new AdminAccountError(409, "This account is not a revocable store administrator.");
  }

  const { admin: _admin, role: _role, ...remainingClaims } = user.customClaims ?? {};
  await auth.setCustomUserClaims(uid, remainingClaims);
  await auth.revokeRefreshTokens(uid);
  await firestore.collection("nexus_admins").doc(uid).set({
    uid,
    email: user.email ?? "",
    isAdmin: false,
    active: false,
    updatedAt: new Date().toISOString(),
    revokedBy: actor.uid,
  }, { merge: true });
}
