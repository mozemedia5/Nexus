/* LongTail Parisian Atelier Editorial — society signup is a small, calm atelier invitation. */

import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

export default function SocietyModal() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const openModal = () => setOpen(true);
    window.addEventListener("open-society", openModal);
    return () => window.removeEventListener("open-society", openModal);
  }, []);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    toast.success("You are on the list", { description: "We will save a place for you at the next preview." });
    setEmail("");
    setOpen(false);
  };

  return (
    <div className={`society-modal ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <button className="modal-scrim" type="button" aria-label="Close society sign-up" onClick={() => setOpen(false)} />
      <section className="society-dialog" role="dialog" aria-modal="true" aria-labelledby="society-title">
        <button type="button" className="icon-button modal-close" onClick={() => setOpen(false)} aria-label="Close"><X size={20} /></button>
        <span className="eyebrow">The LongTail Society</span>
        <h2 id="society-title">A little more ceremony for the everyday walk.</h2>
        <p>Join for first looks at new collections, private styling notes, and invitations made for dachshund people.</p>
        <form onSubmit={handleSubmit} className="society-form">
          <label htmlFor="society-email">Email address</label>
          <div className="society-input-row"><input id="society-email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" required /><button type="submit" className="button button-dark">Join <span aria-hidden="true">↗</span></button></div>
        </form>
        <small>By joining, you agree to occasional notes from LongTail. No noise, only the good things.</small>
      </section>
    </div>
  );
}
