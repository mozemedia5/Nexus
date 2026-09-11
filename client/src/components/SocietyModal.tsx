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
      const isClubMember = localStorage.getItem("nexus_club_member_v1") === "true";
      const userSession = localStorage.getItem("nexus_user_profile");
      const isUserSignedIn = Boolean(userSession);
      const memberStatus = isClubMember || isUserSignedIn;
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
      fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, source: "Nexus Society Club Modal" }),
      }).catch(() => {});

      const saved = localStorage.getItem("nexus_subscribers_v1");
      const list = saved ? JSON.parse(saved) : [];
      if (!list.some((item: any) => item.email === cleanEmail)) {
        list.unshift({ email: cleanEmail, source: "Nexus Club", subscribedAt: new Date().toISOString() });
        localStorage.setItem("nexus_subscribers_v1", JSON.stringify(list));
      }
    } catch {}

    // Store membership state so user never sees newsletter prompt again
    localStorage.setItem("nexus_club_member_v1", "true");
    localStorage.setItem("nexus_club_member_email", cleanEmail);
    window.dispatchEvent(new CustomEvent("nexus-member-updated"));

    toast.success("Welcome to Nexus Club!", {
      description: "You are now a member. Access exclusive perks and community reviews in Nexus Club.",
    });
    setEmail("");
    setOpen(false);
  };

  return (
    <div className={`society-modal ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <button className="modal-scrim" type="button" aria-label="Close newsletter sign-up" onClick={() => setOpen(false)} />
      <section className="society-dialog" role="dialog" aria-modal="true" aria-labelledby="society-title">
        <button type="button" className="icon-button modal-close" onClick={() => setOpen(false)} aria-label="Close"><X size={20} /></button>
        <span className="eyebrow">The Nexus Club</span>
        <h2 id="society-title">Smart home innovations &amp; workspace gadgets.</h2>
        <p>Join for early access to new product drops, technological insights, and exclusive member updates from Nexus A Liverton Store.</p>
        <form onSubmit={handleSubmit} className="society-form">
          <label htmlFor="society-email">Email address</label>
          <div className="society-input-row">
            <input id="society-email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" required />
            <button type="submit" className="button button-dark">Join Club <span aria-hidden="true">↗</span></button>
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
