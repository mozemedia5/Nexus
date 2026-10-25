import { useEffect, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { ArrowRight, X } from "lucide-react";
import type { Product } from "@/lib/store";
import { useStoreAccount } from "@/hooks/useStoreAccount";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function getVisitorId() {
  const key = "nexus_shop_visitor_id";
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "session";
  }
}

async function recordProductInterest(product: Product, email: string, action = "view") {
  try {
    await fetch("/api/user/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        userEmail: email || undefined,
        productTitle: product.name,
        productHandle: product.handle,
        category: product.categoryLabel,
      }),
    });
  } catch {}
}

export default function ProductInterestPrompt({ product }: { product: Product }) {
  const { profile, loading } = useStoreAccount();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem("nexus_newsletter_email") || ""; } catch { return ""; }
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    const visitorId = getVisitorId();
    const isSubscribed = localStorage.getItem("nexus_newsletter_subscribed") === "true";
    const promptIdentity = profile?.uid || visitorId;
    const promptKey = `nexus_interest_prompt_seen:${promptIdentity}`;

    const timer = window.setTimeout(() => {
      if (cancelled) return;
      void recordProductInterest(product, profile?.email || localStorage.getItem("nexus_newsletter_email") || "");
      if (profile || isSubscribed || localStorage.getItem(promptKey) === "true") return;
      localStorage.setItem(promptKey, "true");
      setOpen(true);
    }, 15_000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [product.handle, product.name, product.categoryLabel, profile?.uid, profile?.email, loading]);

  useEffect(() => {
    if (profile) setOpen(false);
  }, [profile]);

  const handleSubscribe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, source: "Product interest prompt" }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to subscribe right now.");
      localStorage.setItem("nexus_newsletter_subscribed", "true");
      localStorage.setItem("nexus_newsletter_email", cleanEmail);
      localStorage.setItem(`nexus_interest_prompt_seen:${cleanEmail}`, "true");
      await recordProductInterest(product, cleanEmail, "newsletter_product_interest");
      window.dispatchEvent(new CustomEvent("nexus-member-updated"));
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Subscription failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const returnTo = `/products/${product.handle}`;
  return (
    <div className="product-interest-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="product-interest-dialog" role="dialog" aria-modal="true" aria-labelledby="product-interest-title">
        <button type="button" className="product-interest-close" onClick={() => setOpen(false)} aria-label="Close sign-up prompt"><X size={18} /></button>
        <span className="eyebrow">A little more from Nexus</span>
        <h2 id="product-interest-title">Keep this find in mind.</h2>
        <p>Get thoughtful product updates, or sign in to keep your shopping journey connected.</p>
        <form onSubmit={handleSubscribe} className="product-interest-form">
          <label htmlFor="product-interest-email">Email address</label>
          <div className="product-interest-input-row">
            <input
              id="product-interest-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              aria-describedby="product-interest-error"
            />
            <button type="submit" disabled={submitting}>{submitting ? "Joining…" : "Subscribe"} <ArrowRight size={15} /></button>
          </div>
          {error && <p id="product-interest-error" className="product-interest-error" role="alert">{error}</p>}
        </form>
        <div className="product-interest-divider"><span>or</span></div>
        <Link className="product-interest-signin" href={`/login?returnTo=${encodeURIComponent(returnTo)}&product=${encodeURIComponent(product.handle)}`} onClick={() => setOpen(false)}>
          Sign in to your account <ArrowRight size={15} />
        </Link>
        <button type="button" className="product-interest-dismiss" onClick={() => setOpen(false)}>Maybe later</button>
        <small>We’ll only use your email for Nexus updates and your requested shopping experience.</small>
      </section>
    </div>
  );
}
