import { type ReactNode } from "react";
import { useLocation } from "wouter";
import SiteHeader from "@/components/SiteHeader";
import CartDrawer from "@/components/CartDrawer";
import SiteFooter from "@/components/SiteFooter";
import AiAssistant from "@/components/AiAssistant";

export default function SiteLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const normalizedPath = location.split("?")[0].split("#")[0];

  const showFooter =
    normalizedPath === "/" ||
    normalizedPath === "/about" ||
    normalizedPath === "/about.html" ||
    normalizedPath === "/heritage" ||
    normalizedPath === "/products" ||
    normalizedPath.startsWith("/products/") ||
    normalizedPath === "/track-order" ||
    normalizedPath === "/order-tracking";

  return (
    <div className="site-frame">
      <SiteHeader />
      <main>{children}</main>
      {showFooter && <SiteFooter />}
      <CartDrawer />
      <AiAssistant />
    </div>
  );
}
