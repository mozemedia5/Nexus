import { type ReactNode } from "react";
import { useLocation } from "wouter";
import SiteHeader from "@/components/SiteHeader";
import CartDrawer from "@/components/CartDrawer";
import SiteFooter from "@/components/SiteFooter";
import AiAssistant from "@/components/AiAssistant";

export default function SiteLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const normalizedPath = location.split("?")[0].split("#")[0];
  const isProductDetail = /^\/products\/[^/]+\/?$/.test(normalizedPath);
  const isAdmin = normalizedPath.startsWith("/admin");

  return (
    <div className="site-frame storefront-shell">
      <SiteHeader />
      <div className="site-content">
        <div className="announcement-bar storefront-announcement">
          <span>Nexus A Liverton Store</span><i aria-hidden="true">·</i><span>Useful finds for home and work</span>
        </div>
        <main>{children}</main>
        {!isProductDetail && !isAdmin && <SiteFooter />}
      </div>
      <CartDrawer />
      <AiAssistant />
    </div>
  );
}
