import { ArrowUpRight } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <section className="not-found">
      <div>
        <span className="eyebrow">Nexus A Liverton Store / 404</span>
        <h1>Page not<br /><em>found.</em></h1>
        <p>The page you are looking for is not in our current Smart Home &amp; Beauty collection.</p>
        <Link href="/" className="button button-dark">Return home <ArrowUpRight size={15} /></Link>
      </div>
    </section>
  );
}
