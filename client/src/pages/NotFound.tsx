/* LongTail Parisian Atelier Editorial — even an empty address should feel like part of the house. */

import { ArrowUpRight } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <section className="not-found">
      <div>
        <span className="eyebrow">LongTail / 404</span>
        <h1>This path<br /><em>has wandered off.</em></h1>
        <p>The page you are looking for is not in our current edit. Let us take you back to something considered.</p>
        <Link href="/" className="button button-dark">Return home <ArrowUpRight size={15} /></Link>
      </div>
    </section>
  );
}
