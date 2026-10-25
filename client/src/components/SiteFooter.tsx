import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { ArrowUpRight, Check } from "lucide-react";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function SiteFooter() {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubscribe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setStatus("error");
      setMessage("Enter a valid email address to subscribe.");
      return;
    }
    setStatus("submitting");
    setMessage("");
    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, source: "Store footer" }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to subscribe right now.");
      localStorage.setItem("nexus_newsletter_subscribed", "true");
      localStorage.setItem("nexus_newsletter_email", cleanEmail);
      window.dispatchEvent(new CustomEvent("nexus-member-updated"));
      setStatus("success");
      setMessage("You’re on the list. Watch your inbox for Nexus updates.");
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Subscription failed. Please try again.");
    }
  };

  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand-column">
          <Link href="/" className="brand-lockup" aria-label="Nexus home">
            <img src="/logo.png" alt="" className="brand-logo-img h-7 w-auto object-contain" />
            <div className="brand-text-stack">
              <span className="brand-name">Nexus</span>
              <span className="brand-sub">A Liverton Store</span>
            </div>
          </Link>
          <p>Useful finds for connected homes, more comfortable workspaces, and everyday life.</p>
        </div>
        <div className="footer-column">
          <span className="eyebrow">Shop</span>
          <Link href="/products">All products</Link>
          <Link href="/products">Browse collections</Link>
        </div>
        <div className="footer-column">
          <span className="eyebrow">Help</span>
          <Link href="/track-order">Track an order</Link>
          <Link href="/about">Our story</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
        </div>
        <div className="footer-newsletter">
          <span className="eyebrow">Nexus notes</span>
          <h3>Good ideas for home and work.</h3>
          <p>Occasional product launches and useful updates. No noise.</p>
          <form className="footer-newsletter-form" onSubmit={handleSubscribe}>
            <label className="sr-only" htmlFor="footer-newsletter-email">Email address</label>
            <input
              id="footer-newsletter-email"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(event) => { setEmail(event.target.value); if (status !== "submitting") setStatus("idle"); }}
              placeholder="Your email address"
              aria-describedby="footer-newsletter-status"
            />
            <button type="submit" disabled={status === "submitting"} aria-label="Subscribe to Nexus newsletter">
              {status === "success" ? <Check size={17} /> : <ArrowUpRight size={17} />}
            </button>
          </form>
          <p id="footer-newsletter-status" className={`footer-newsletter-status ${status === "error" ? "is-error" : ""}`} aria-live="polite">
            {status === "submitting" ? "Subscribing…" : message}
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {currentYear} Nexus A Liverton Store</span>
        <span>Shop with confidence. Product details and availability come from our Shopify catalogue.</span>
      </div>
    </footer>
  );
}
