import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, FileText, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import SEO from "@/components/SEO";
import { getStorePolicies, type StorePolicy, type StorePolicies } from "@/lib/store";

type PolicyKey = keyof StorePolicies;

type PolicyPageProps = {
  policyKey: PolicyKey;
  fallbackTitle: string;
  description: string;
  canonicalPath: string;
};

function sanitizePolicyHtml(html: string): string {
  if (typeof DOMParser === "undefined") return html;
  const document = new DOMParser().parseFromString(html, "text/html");
  document.querySelectorAll("script, style, iframe, object, embed, link, meta").forEach(node => node.remove());
  document.querySelectorAll("*").forEach(element => {
    Array.from(element.attributes).forEach(attribute => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith("on")) element.removeAttribute(attribute.name);
      if ((name === "href" || name === "src") && !/^(https?:|mailto:|#|\/)/.test(value)) {
        element.removeAttribute(attribute.name);
      }
    });
  });
  return document.body.innerHTML;
}

function PolicyContent({ policy, fallbackTitle }: { policy: StorePolicy | null; fallbackTitle: string }) {
  const safeBody = useMemo(() => policy?.body ? sanitizePolicyHtml(policy.body) : "", [policy?.body]);

  if (!policy) {
    return (
      <div className="policy-empty-state">
        <FileText size={22} aria-hidden="true" />
        <div>
          <h2>{fallbackTitle} is not available yet.</h2>
          <p>Our store policy has not been published in the live store settings. Please contact support before placing an order if you need clarification.</p>
        </div>
      </div>
    );
  }

  return <div className="policy-body" dangerouslySetInnerHTML={{ __html: safeBody }} />;
}

export default function PolicyPage({ policyKey, fallbackTitle, description, canonicalPath }: PolicyPageProps) {
  const [policies, setPolicies] = useState<StorePolicies | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getStorePolicies()
      .then(result => { if (!cancelled) setPolicies(result); })
      .catch(cause => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load the live store policy.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const policy = policies?.[policyKey] ?? null;
  const title = policy?.title || fallbackTitle;

  return (
    <>
      <SEO title={`${title} — Nexus Store`} description={description} canonicalPath={canonicalPath} />
      <section className="page-intro section-pad">
        <span className="eyebrow">Nexus Store / Policy</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>
      <main className="section-pad policy-page-shell">
        <div className="policy-page-header">
          <span className="policy-live-badge"><FileText size={13} aria-hidden="true" /> Live store policy</span>
          {policy?.url && <a href={policy.url} target="_blank" rel="noopener noreferrer">Open source policy <ArrowUpRight size={14} /></a>}
        </div>
        {loading ? (
          <div className="policy-empty-state"><RefreshCw size={22} className="animate-spin" aria-hidden="true" /><p>Loading the latest policy from our store…</p></div>
        ) : error ? (
          <div className="policy-empty-state"><FileText size={22} aria-hidden="true" /><div><h2>We couldn’t load this policy.</h2><p>{error} Please try again later or contact support.</p></div></div>
        ) : (
          <PolicyContent policy={policy} fallbackTitle={fallbackTitle} />
        )}
        <div className="mt-10 pt-6 border-t border-border flex flex-wrap gap-4 text-sm">
          <Link href="/faq" className="font-medium hover:underline text-foreground">Read FAQs</Link>
          <Link href="/track-order" className="font-medium hover:underline text-foreground">Track an order</Link>
          <Link href="/" className="font-medium hover:underline text-foreground">← Return home</Link>
        </div>
      </main>
    </>
  );
}
