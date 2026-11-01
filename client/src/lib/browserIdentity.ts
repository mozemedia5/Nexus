export type BrowserProductEvent = {
  action: "view" | "click" | "like" | "add_to_cart";
  productHandle: string;
  productTitle: string;
  category?: string;
  timestamp: string;
};

const BROWSER_ID_KEY = "nexus_browser_id_v1";

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `browser-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

/** A first-party random ID, stored in this browser only (no fingerprinting). */
export function getBrowserId(): string {
  if (typeof window === "undefined") return "server-render";
  try {
    const saved = window.localStorage.getItem(BROWSER_ID_KEY);
    if (saved) return saved;
    const created = createId();
    window.localStorage.setItem(BROWSER_ID_KEY, created);
    return created;
  } catch {
    return createId();
  }
}

export function getCartStorageKey(browserId = getBrowserId(), accountId?: string | null) {
  const owner = accountId?.trim() || "guest";
  return `nexus_shopify_cart_v2:${browserId}:${encodeURIComponent(owner)}`;
}

function getHistoryOwner() {
  try {
    const profile = JSON.parse(window.localStorage.getItem("nexus_user_profile") || "null");
    if (typeof profile?.uid === "string" && profile.uid.trim()) return profile.uid.trim();
  } catch {}
  return "guest";
}

/** Keep a small, user-local record so guest browsing is remembered on this browser. */
export function rememberProductEvent(event: Omit<BrowserProductEvent, "timestamp">) {
  if (typeof window === "undefined" || !event.productHandle) return;
  try {
    const key = `nexus_browsing_history_v1:${getBrowserId()}:${encodeURIComponent(getHistoryOwner())}`;
    const previous = JSON.parse(window.localStorage.getItem(key) || "[]");
    const history: BrowserProductEvent[] = Array.isArray(previous) ? previous : [];
    history.unshift({ ...event, timestamp: new Date().toISOString() });
    window.localStorage.setItem(key, JSON.stringify(history.slice(0, 100)));
  } catch {}
}

export function getRecentProductHandles(limit = 4): string[] {
  if (typeof window === "undefined") return [];
  try {
    const key = `nexus_browsing_history_v1:${getBrowserId()}:${encodeURIComponent(getHistoryOwner())}`;
    const saved = JSON.parse(window.localStorage.getItem(key) || "[]");
    if (!Array.isArray(saved)) return [];
    return Array.from(new Set(saved
      .filter((event): event is BrowserProductEvent => typeof event?.productHandle === "string" && Boolean(event.productHandle))
      .map((event) => event.productHandle))).slice(0, Math.max(0, limit));
  } catch {
    return [];
  }
}
