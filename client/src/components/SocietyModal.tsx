import { FormEvent, useEffect, useState } from "react";
import { X, UserPlus, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function SocietyModal() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    const checkMembership = () => {
      const isSubscribed = localStorage.getItem("nexus_newsletter_subscribed") === "true";
      const userSession = localStorage.getItem("nexus_user_profile");
      const isUserSignedIn = Boolean(userSession);
      const memberStatus = isSubscribed || isUserSignedIn;
      setIsMember(memberStatus);
      return memberStatus;
    };

    if (checkMembership()) {
      setOpen(false);
      return;
    }

    const openModal = () => {
      if (!checkMembership()) {
        setOpen(true);
      }
    };

    window.addEventListener("open-society", openModal);
    window.addEventListener("nexus-member-updated", checkMembership);

    // Auto-trigger after 60 seconds (1 minute) if not previously shown in this session & user not a member
    const hasBeenShown = sessionStorage.getItem("nexus_society_modal_shown");
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (!hasBeenShown && !checkMembership()) {
      timer = setTimeout(() => {
        if (!checkMembership()) {
          setOpen(true);
          sessionStorage.setItem("nexus_society_modal_shown", "true");
        }
      }, 60000); // 60,000 ms = 1 minute
    }

    return () => {
      window.removeEventListener("open-society", openModal);
      window.removeEventListener("nexus-member-updated", checkMembership);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (isMember) {
    return null;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, source: "Newsletter Modal" }),
      });

      if (res.ok) {
        toast.success("Subscribed!", {
          description: "Thank you for subscribing to Nexus drops and deals.",
        });
        localStorage.setItem("nexus_newsletter_subscribed", "true");
        setEmail("");
        setOpen(false);
      } else {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error || "Failed to subscribe. Please try again.");
      }
    } catch {
      toast.error("Subscription failed. Please check your connection.");
    }
  };

  return (
    <div className={`society-modal ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <button className="modal-scrim" type="button" aria-label="Close newsletter sign-up" onClick={() => setOpen(false)} />
      <section className="society-dialog" role="dialog" aria-modal="true" aria-labelledby="society-title">
        <button type="button" className="icon-button modal-close" onClick={() => setOpen(false)} aria-label="Close"><X size={20} /></button>
        <span className="eyebrow">Nexus Insider</span>
        <h2 id="society-title">Get new drops &amp; deals.</h2>
        <p>Subscribe for early access to new product drops, technological insights, and exclusive updates from Nexus.</p>
        <form onSubmit={handleSubmit} className="society-form">
          <label htmlFor="society-email">Email address</label>
          <div className="society-input-row">
            <input id="society-email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" required />
            <button type="submit" className="button button-dark">Subscribe <span aria-hidden="true">↗</span></button>
          </div>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">Want a full store account?</p>
          <Link
            href="/register"
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs rounded-xl transition-colors"
          >
            <UserPlus size={14} />
            Register or Sign Up for Nexus Store Instead
            <ArrowRight size={12} />
          </Link>
        </div>

        <small className="mt-2 block">By joining, you agree to occasional updates from Nexus A Liverton Store. No spam, only value.</small>
      </section>
    </div>
  );
}
