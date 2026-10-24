import { getFirebaseAdmin } from "./firebaseAdmin.js";

export type AdminRole = "admin" | "superadmin";

export type AdminPrincipal = {
  uid: string;
  email: string;
  name: string;
  role: AdminRole;
  claimsRefreshRequired?: boolean;
};

export class AdminAuthError extends Error {
  constructor(public readonly status: 401 | 403 | 503, message: string) {
    super(message);
    this.name = "AdminAuthError";
  }
}

export class AdminAccountError extends Error {
  constructor(public readonly status: 400 | 403 | 404 | 409 | 503, message: string) {
    super(message);
    this.name = "AdminAccountError";
  }
}

function getBootstrapEmail() {
  return process.env.NEXUS_INITIAL_ADMIN_EMAIL?.trim().toLowerCase() || "";
}

export function getInitialAdminEmail() {
  return getBootstrapEmail();
}

export async function authenticateAdminToken(idToken: string): Promise<AdminPrincipal> {
  if (!idToken || idToken.length > 12_000) {
    throw new AdminAuthError(401, "Sign in again to continue.");
  }

  let services: ReturnType<typeof getFirebaseAdmin>;
  try {
    services = getFirebaseAdmin();
  } catch {
    throw new AdminAuthError(503, "Administrator authentication is not configured on the server.");
  }

  let decoded: Awaited<ReturnType<typeof services.auth.verifyIdToken>>;
  try {
    decoded = await services.auth.verifyIdToken(idToken, true);
  } catch {
    throw new AdminAuthError(401, "Your sign-in has expired. Sign in again.");
  }

  const email = typeof decoded.email === "string" ? decoded.email.trim().toLowerCase() : "";
  if (!email || decoded.email_verified !== true) {
    throw new AdminAuthError(403, "A verified administrator account is required.");
  }

  const bootstrapEmail = getBootstrapEmail();
  const isBootstrapAdmin = Boolean(bootstrapEmail && email === bootstrapEmail);
  if (!isBootstrapAdmin && decoded.admin !== true) {
    throw new AdminAuthError(403, "Administrator access is not assigned to this account.");
  }

  let claimsRefreshRequired = false;
  if (isBootstrapAdmin && (decoded.admin !== true || decoded.role !== "superadmin")) {
    try {
      const user = await services.auth.getUser(decoded.uid);
      await services.auth.setCustomUserClaims(decoded.uid, {
        ...(user.customClaims ?? {}),
        admin: true,
        role: "superadmin",
      });
      claimsRefreshRequired = true;
    } catch {
      throw new AdminAuthError(503, "Could not initialize the administrator account.");
    }
  }

  return {
    uid: decoded.uid,
    email,
    name: typeof decoded.name === "string" && decoded.name.trim() ? decoded.name.trim() : email.split("@")[0],
    role: isBootstrapAdmin || decoded.role === "superadmin" ? "superadmin" : "admin",
    ...(claimsRefreshRequired ? { claimsRefreshRequired: true } : {}),
  };
}

export async function authenticateAdminAuthorization(authorization?: string): Promise<AdminPrincipal> {
  const match = typeof authorization === "string" ? authorization.match(/^Bearer\s+([^\s]+)$/i) : null;
  if (!match) throw new AdminAuthError(401, "A Firebase sign-in token is required.");
  return authenticateAdminToken(match[1]);
}

export function requireSuperAdmin(principal: AdminPrincipal) {
  if (principal.role !== "superadmin") {
    throw new AdminAuthError(403, "Superadministrator access is required for this operation.");
  }
}
