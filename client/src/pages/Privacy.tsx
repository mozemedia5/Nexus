import React from "react";
import { Link } from "wouter";

export default function Privacy() {
  return (
    <div className="section-pad max-w-4xl mx-auto text-foreground">
      <div className="mb-8">
        <span className="eyebrow">Nexus A Liverton Store</span>
        <h1 className="text-3xl font-serif font-medium mt-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mt-1">Last Updated: 2026</p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">1. Personal Information We Collect</h2>
          <p>
            When you visit Nexus A Liverton Store or place an order, we collect certain information about your device, interaction with the site, and information necessary to process your purchases, including contact details and shipping address.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">2. How We Use Your Information</h2>
          <p>
            We use your personal information to fulfill orders, process payments, arrange global shipping, communicate with you regarding your orders, and provide updates on new Smart Home & Beauty product releases when subscribed.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">3. Data Sharing & Third Parties</h2>
          <p>
            We share your Personal Information with trusted service providers like Shopify to power our storefront and handle secure payment and order fulfillment. We do not sell or rent your personal data to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">4. Your Rights</h2>
          <p>
            You have the right to access the personal information we hold about you, to request corrections, or to ask for your personal information to be deleted. To exercise these rights, please contact our support team.
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
