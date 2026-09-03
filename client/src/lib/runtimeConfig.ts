export type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  databaseURL?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
};

const REQUIRED_FIREBASE_FIELDS = ["apiKey", "authDomain", "projectId", "appId"] as const;
let firebaseConfigError: string | null = null;

function readFirebaseConfig(): FirebaseConfig {
  const fallback: FirebaseConfig = { apiKey: "", authDomain: "", projectId: "", appId: "" };
  const raw = import.meta.env.VITE_FIREBASE_CONFIG_JSON;
  if (!raw?.trim()) {
    firebaseConfigError = "VITE_FIREBASE_CONFIG_JSON is missing";
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<FirebaseConfig>;
    const missing = REQUIRED_FIREBASE_FIELDS.filter((field) => !parsed[field]);
    if (missing.length > 0) {
      firebaseConfigError = `VITE_FIREBASE_CONFIG_JSON is missing: ${missing.join(", ")}`;
      return fallback;
    }
    firebaseConfigError = null;
    return parsed as FirebaseConfig;
  } catch {
    firebaseConfigError = "VITE_FIREBASE_CONFIG_JSON must be valid JSON";
    return fallback;
  }
}

export const firebaseConfig = readFirebaseConfig();

export function getFirebaseConfigError(): string | null {
  return firebaseConfigError;
}

export function isFirebaseClientConfigured(): boolean {
  return getFirebaseConfigError() === null;
}
