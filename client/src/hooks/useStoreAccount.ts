import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";

export type StoreProfile = {
  email: string;
  name: string;
  uid: string;
};

const accountSyncInFlight = new Set<string>();

function readProfile(): StoreProfile | null {
  try {
    const raw = localStorage.getItem("nexus_user_profile");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoreProfile>;
    if (typeof parsed.email !== "string" || !parsed.email.includes("@")) return null;
    return {
      email: parsed.email,
      name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name : parsed.email.split("@")[0],
      uid: typeof parsed.uid === "string" ? parsed.uid : parsed.email.toLowerCase(),
    };
  } catch {
    return null;
  }
}

export function saveStoreProfile(profile: StoreProfile) {
  localStorage.setItem("nexus_user_profile", JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent("nexus-member-updated"));
}

export function clearStoreProfile() {
  localStorage.removeItem("nexus_user_profile");
  window.dispatchEvent(new CustomEvent("nexus-member-updated"));
}

function profileFromFirebase(user: User): StoreProfile | null {
  const email = user.email?.trim();
  if (!email) return null;
  return {
    email,
    name: user.displayName?.trim() || email.split("@")[0],
    uid: user.uid,
  };
}

export function useStoreAccount() {
  const [profile, setProfile] = useState<StoreProfile | null>(() => readProfile());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncStoredProfile = () => setProfile(readProfile());
    window.addEventListener("nexus-member-updated", syncStoredProfile);
    window.addEventListener("storage", syncStoredProfile);

    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return () => {
        window.removeEventListener("nexus-member-updated", syncStoredProfile);
        window.removeEventListener("storage", syncStoredProfile);
      };
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const nextProfile = user ? profileFromFirebase(user) : null;
      if (user && nextProfile) {
        localStorage.setItem("nexus_user_profile", JSON.stringify(nextProfile));
        const syncKey = `nexus_account_synced_at:${user.uid}`;
        const lastSynced = Number(localStorage.getItem(syncKey) || 0);
        if (Date.now() - lastSynced > 15 * 60 * 1000 && !accountSyncInFlight.has(user.uid)) {
          accountSyncInFlight.add(user.uid);
          void user.getIdToken().then((token) => fetch("/api/store/account", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ fullName: user.displayName || nextProfile.name }),
          })).then((response) => {
            if (response.ok) localStorage.setItem(syncKey, String(Date.now()));
          }).catch(() => {}).finally(() => accountSyncInFlight.delete(user.uid));
        }
      } else {
        localStorage.removeItem("nexus_user_profile");
      }
      setProfile(nextProfile);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      window.removeEventListener("nexus-member-updated", syncStoredProfile);
      window.removeEventListener("storage", syncStoredProfile);
    };
  }, []);

  return { profile, loading, signedIn: Boolean(profile) };
}
