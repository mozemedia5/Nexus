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

  if (raw?.trim()) {
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

  // Fallback to individual env variables if VITE_FIREBASE_CONFIG_JSON is not provided
  const envConfig: FirebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  };

  const missingIndividual = REQUIRED_FIREBASE_FIELDS.filter((field) => !envConfig[field]);
  if (missingIndividual.length === 0) {
    firebaseConfigError = null;
    return envConfig;
  }

  firebaseConfigError = "Firebase configuration is missing (VITE_FIREBASE_CONFIG_JSON or individual VITE_FIREBASE_* variables)";
  return fallback;
}

export const firebaseConfig = readFirebaseConfig();

export function getFirebaseConfigError(): string | null {
  return firebaseConfigError;
}

export function isFirebaseClientConfigured(): boolean {
  return getFirebaseConfigError() === null;
}
