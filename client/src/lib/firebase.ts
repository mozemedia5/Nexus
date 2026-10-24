import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth, type User } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { firebaseConfig, getFirebaseConfigError } from "./runtimeConfig";

export type VerifiedAdminSession = {
  authenticated: true;
  uid: string;
  email: string;
  name: string;
  role: "admin" | "superadmin";
};

type AdminSessionResponse = {
  admin?: VerifiedAdminSession & { claimsRefreshRequired?: boolean };
  error?: string;
};

export function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || !firebaseConfig.appId) {
    return null;
  }
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig as FirebaseOptions);
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

export function getFirebaseFirestore(): Firestore | null {
  const app = getFirebaseApp();
  return app ? getFirestore(app) : null;
}

export function getFirebaseStatus() {
  const app = getFirebaseApp();
  return {
    configured: getFirebaseConfigError() === null,
    projectId: firebaseConfig.projectId || null,
    authReady: Boolean(app),
    firestoreReady: Boolean(app),
  };
}

export async function verifyAdminSession(user: User): Promise<VerifiedAdminSession | null> {
  const token = await user.getIdToken();
  const response = await fetch("/api/admin/session", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as AdminSessionResponse;
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok || !payload.admin) {
    throw new Error(payload.error || "Administrator access could not be verified.");
  }
  if (payload.admin.claimsRefreshRequired) await user.getIdToken(true);
  return { ...payload.admin, authenticated: true };
}

export async function getAdminAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const auth = getFirebaseAuth();
  if (auth?.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch {}
  }
  return headers;
}
