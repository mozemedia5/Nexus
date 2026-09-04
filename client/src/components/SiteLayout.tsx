import { type ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";
import CartDrawer from "@/components/CartDrawer";
import SiteFooter from "@/components/SiteFooter";
import AiAssistant from "@/components/AiAssistant";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="site-frame">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <CartDrawer />
      <AiAssistant />
    </div>
  );
}
