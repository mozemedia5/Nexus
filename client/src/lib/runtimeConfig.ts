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
  let raw = import.meta.env.VITE_FIREBASE_CONFIG_JSON;

  if (raw && typeof raw === "string") {
    raw = raw.trim();
    // Clean wrapping single/double quotes if added by environment variable setups (e.g., Vercel)
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      raw = raw.slice(1, -1).trim();
    }
  }

  if (raw) {
    try {
      const parsedAny = JSON.parse(raw) as Record<string, any>;
      // Support both camelCase and snake_case field names from Firebase JSON configs
      const config: FirebaseConfig = {
        apiKey: parsedAny.apiKey || parsedAny.api_key || "",
        authDomain: parsedAny.authDomain || parsedAny.auth_domain || (parsedAny.projectId || parsedAny.project_id ? `${parsedAny.projectId || parsedAny.project_id}.firebaseapp.com` : ""),
        projectId: parsedAny.projectId || parsedAny.project_id || "",
        storageBucket: parsedAny.storageBucket || parsedAny.storage_bucket || "",
        messagingSenderId: parsedAny.messagingSenderId || parsedAny.messaging_sender_id || "",
        appId: parsedAny.appId || parsedAny.app_id || parsedAny.client?.[0]?.client_info?.mobilesdk_app_id || "",
      };

      const missing = REQUIRED_FIREBASE_FIELDS.filter((field) => !config[field]);
      if (missing.length > 0) {
        firebaseConfigError = `VITE_FIREBASE_CONFIG_JSON is missing required fields: ${missing.join(", ")}`;
        return fallback;
      }
      firebaseConfigError = null;
      return config;
    } catch (e) {
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
