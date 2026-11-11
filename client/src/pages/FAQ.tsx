import { ArrowUpRight, PackageCheck, Truck } from "lucide-react";
import { Link } from "wouter";
import SEO from "@/components/SEO";

const faqs = [
  ["Where does Nexus Store ship?", "Available destinations and shipping conditions are defined by the current Shipping Policy. Enter your delivery address at checkout to confirm whether delivery is available for your order."],
  ["How long does delivery take?", "Estimated delivery information depends on your location, product availability, and selected shipping method. The applicable estimate is shown during checkout and in your order confirmation."],
  ["How much does shipping cost?", "Shipping costs depend on your delivery destination, product, and selected shipping method. We display applicable shipping charges at checkout before you complete your purchase. See the live Shipping Policy for the store's shipping conditions."],
  ["What payment methods do you accept?", "Available payment methods are displayed at checkout. You can select from the payment options supported for your country and complete your purchase through our secure checkout process."],
  ["How can I track my order?", "After we fulfill your order, the carrier tracking number and tracking link are shown in the Order Tracking page and our shipping updates are sent to the email used at checkout when available."],
  ["Can I change or cancel my order after placing it?", "Contact our support team as soon as possible. Whether a change or cancellation is possible depends on the order status and the current store policies."],
  ["What should I do if my product arrives damaged or defective?", "Contact our support team with your order number and clear photographs of the issue. Eligibility and next steps are handled under the current Refund Policy."],
  ["What is your return and refund policy?", "Returns and refunds follow the current policy published in our store settings. If you receive an incorrect, damaged, or defective product, contact our support team for assistance and read the live Refund Policy before sending anything back."],
  ["Are the products on Nexus Store genuine and as described?", "We aim to offer carefully selected products with descriptions and product images that help you make informed purchasing decisions. Review the product specifications, features, and compatibility information before ordering."],
  ["How can I contact Nexus Store?", "Contact our customer support team through the contact options available on our website. Please include your order number when asking about an existing purchase."],
] as const;

function renderFaqAnswer(question: string, answer: string) {
  if (question === "How much does shipping cost?") {
    return <>{answer.replace(" See the live Shipping Policy for the store's shipping conditions.", " ")}<Link href="/policies/shipping-policy" className="font-semibold text-amber-700 hover:underline">Read the live Shipping Policy.</Link></>;
  }
  if (question === "What is your return and refund policy?") {
    return <>{answer.replace(" and read the live Refund Policy before sending anything back.", ".")} <Link href="/policies/refund-policy" className="font-semibold text-amber-700 hover:underline">Read the live Refund Policy.</Link></>;
  }
  if (question === "What should I do if my product arrives damaged or defective?") {
    return <>{answer.replace(" under the current Refund Policy.", ".")} <Link href="/policies/refund-policy" className="font-semibold text-amber-700 hover:underline">Review the Refund Policy.</Link></>;
  }
  return answer;
}

export default function FAQ() {
  return <>
    <SEO title="Frequently Asked Questions — Nexus Store" description="Nexus Store answers about delivery, shipping costs, secure checkout, payments, returns, and order tracking." canonicalPath="/faq" />
    <section className="page-intro section-pad">
      <span className="eyebrow">Nexus Store / Support</span>
      <h1>Frequently Asked <em>Questions.</em></h1>
      <p>Find answers about shopping with us, placing orders, shipping, payments, product support, and the order tracking experience.</p>
    </section>
    <section className="section-pad max-w-4xl mx-auto">
      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        <Link href="/track-order" className="rounded-2xl border border-amber-300/60 bg-amber-50 p-5 text-slate-900 hover:border-amber-500 transition-colors">
          <PackageCheck size={22} className="text-amber-700 mb-3" />
          <strong className="block text-base">Track an order</strong>
          <span className="block text-sm mt-1 text-slate-600">See our fulfillment timeline, carrier, tracking number, and live status.</span>
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <Truck size={22} className="text-amber-700 mb-3" />
          <strong className="block text-base">Delivery is shown by us</strong>
          <span className="block text-sm mt-1 text-slate-600">Shipping rates and estimated delivery dates are calculated from your address and shipping method at checkout.</span>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        <Link href="/policies/shipping-policy" className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 hover:border-amber-400 transition-colors">
          <strong className="block text-base">Shipping Policy</strong>
          <span className="block text-sm mt-1 text-slate-600">Read the current shipping terms from our live store policy.</span>
        </Link>
        <Link href="/policies/refund-policy" className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 hover:border-amber-400 transition-colors">
          <strong className="block text-base">Refund Policy</strong>
          <span className="block text-sm mt-1 text-slate-600">Read the current return and refund terms before you order.</span>
        </Link>
      </div>
      <div className="space-y-3">
        {faqs.map(([question, answer]) => <details key={question} className="group bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <summary className="font-semibold text-slate-900 dark:text-white cursor-pointer list-none flex justify-between items-center text-sm tracking-wide">{question}<ArrowUpRight size={14} className="transition-transform group-open:rotate-90" /></summary>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{renderFaqAnswer(question, answer)}</p>
        </details>)}
      </div>
    </section>
  </>;
}
