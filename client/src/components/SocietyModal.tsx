import { FormEvent, useEffect, useState } from "react";
import { X, ArrowRight } from "lucide-react";
import { Link } from "wouter";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function SocietyModal() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isMember, setIsMember] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const checkMembership = () => {
      const subscribed = localStorage.getItem("nexus_newsletter_subscribed") === "true";
      let signedIn = false;
      try { signedIn = Boolean(JSON.parse(localStorage.getItem("nexus_user_profile") || "null")?.uid); } catch {}
      setIsMember(subscribed || signedIn);
      if (subscribed || signedIn) setOpen(false);
    };
    const openModal = () => {
      checkMembership();
      if (localStorage.getItem("nexus_newsletter_subscribed") !== "true") setOpen(true);
    };
    window.addEventListener("open-society", openModal);
    window.addEventListener("nexus-member-updated", checkMembership);
    checkMembership();
    return () => {
      window.removeEventListener("open-society", openModal);
      window.removeEventListener("nexus-member-updated", checkMembership);
    };
  }, []);

  if (isMember) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
        body: JSON.stringify({ email: cleanEmail, source: "Newsletter modal" }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Subscription failed. Please try again.");
      localStorage.setItem("nexus_newsletter_subscribed", "true");
      localStorage.setItem("nexus_newsletter_email", cleanEmail);
      window.dispatchEvent(new CustomEvent("nexus-member-updated"));
      setOpen(false);
      setEmail("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Subscription failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`society-modal ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <button className="modal-scrim" type="button" aria-label="Close newsletter sign-up" onClick={() => setOpen(false)} />
      <section className="society-dialog" role="dialog" aria-modal="true" aria-labelledby="society-title">
        <button type="button" className="icon-button modal-close" onClick={() => setOpen(false)} aria-label="Close"><X size={20} /></button>
        <span className="eyebrow">Nexus notes</span>
        <h2 id="society-title">Good ideas for home and work.</h2>
        <p>Get occasional product launches and useful updates from Nexus.</p>
        <form onSubmit={handleSubmit} className="society-form">
          <label htmlFor="society-email">Email address</label>
          <div className="society-input-row">
            <input id="society-email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" autoComplete="email" inputMode="email" required />
            <button type="submit" className="button button-dark" disabled={submitting}>{submitting ? "Joining…" : "Subscribe"} <ArrowRight size={14} /></button>
          </div>
          {error && <p className="society-error" role="alert">{error}</p>}
        </form>
        <div className="society-modal-signin">
          <span>Already have an account?</span>
          <Link href="/login" onClick={() => setOpen(false)}>Sign in</Link>
        </div>
        <small>By subscribing, you agree to occasional Nexus updates. Unsubscribe at any time.</small>
      </section>
    </div>
  );
}
