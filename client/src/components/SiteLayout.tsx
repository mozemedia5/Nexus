import { type ReactNode } from "react";
import { useLocation } from "wouter";
import SiteHeader from "@/components/SiteHeader";
import CartDrawer from "@/components/CartDrawer";
import SiteFooter from "@/components/SiteFooter";
import AiAssistant from "@/components/AiAssistant";

export default function SiteLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const normalizedPath = location.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  const catalogListingRoutes = new Set(["/products", "/products.html", "/new-arrivals", "/smart-office"]);
  const isProductsRoute = catalogListingRoutes.has(normalizedPath) || normalizedPath.startsWith("/products/");
  const isAdmin = normalizedPath.startsWith("/admin");

  return (
    <div className="site-frame storefront-shell">
      <SiteHeader />
      <div className="site-content">
        <main>{children}</main>
        {!isProductsRoute && !isAdmin && <SiteFooter />}
      </div>
      <CartDrawer />
      <AiAssistant />
    </div>
  );
}
