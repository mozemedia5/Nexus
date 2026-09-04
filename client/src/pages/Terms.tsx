import React from "react";
import { Link } from "wouter";

export default function Terms() {
  return (
    <div className="section-pad max-w-4xl mx-auto text-foreground">
      <div className="mb-8">
        <span className="eyebrow">Nexus A Liverton Store</span>
        <h1 className="text-3xl font-serif font-medium mt-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mt-1">Last Updated: 2026</p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">1. Overview</h2>
          <p>
            Welcome to Nexus A Liverton Store. Throughout the site, the terms "we", "us", and "our" refer to Liverton Stores and Nexus. By accessing or purchasing from our storefront, you engage in our service and agree to be bound by the following terms and conditions.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">2. Global Shipping & Fulfillment</h2>
          <p>
            We proudly ship products globally worldwide. Orders are processed through our secure checkout platform. Shipping rates, customs duties, and estimated delivery times are calculated at checkout based on destination.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">3. Products & Services</h2>
          <p>
            Nexus A Liverton Store specializes in Smart Home automation devices and Beauty & Wellness products. Prices and availability of products are subject to change without notice. We reserve the right to limit sales to any geographical region.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">4. Payments & Security</h2>
          <p>
            All checkout transactions are processed through encrypted, secure Shopify Storefront payment processing channels. Your payment details are protected using industry-standard security protocols.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">5. Governing Law</h2>
          <p>
            These Terms of Service and any separate agreements shall be governed by and construed in accordance with applicable commercial business laws under Liverton Stores jurisdiction.
          </p>
        </section>
      </div>

      <div className="mt-10 pt-6 border-t border-border">
        <Link href="/" className="text-sm font-medium hover:underline text-foreground">
          ← Return to Home
        </Link>
      </div>
    </div>
  );
}
