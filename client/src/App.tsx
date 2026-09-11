/* Nexus A Liverton Store — routes. */

import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CartProvider } from "@/contexts/CartContext";
import SiteLayout from "@/components/SiteLayout";
import SocietyModal from "@/components/SocietyModal";
import Home from "@/pages/Home";
import Collections from "@/pages/Collections";
import Heritage from "@/pages/Heritage";
import OrderTracking from "@/pages/OrderTracking";
import NotFound from "@/pages/NotFound";
import ProductDetail from "@/pages/ProductDetail";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import NexusClub from "@/pages/NexusClub";
import AdminLayout from "@/components/AdminLayout";
import Admin from "@/pages/Admin";
import Login from "@/pages/Login";
import Register from "@/pages/Register";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }), [location]);
  return null;
}

function HomeRoute() { return <SiteLayout><Home /></SiteLayout>; }
function CollectionsRoute() { return <SiteLayout><Collections /></SiteLayout>; }
function HeritageRoute() { return <SiteLayout><Heritage /></SiteLayout>; }
function OrderTrackingRoute() { return <SiteLayout><OrderTracking /></SiteLayout>; }
function NotFoundRoute() { return <SiteLayout><NotFound /></SiteLayout>; }

function Router() {
  const [location] = useLocation();

  if (location.startsWith("/admin")) {
    return (
      <AdminLayout>
        <Admin />
      </AdminLayout>
    );
  }

  return (
    <Switch>
      <Route path="/" component={HomeRoute} />
      <Route path="/products" component={CollectionsRoute} />
      <Route path="/products/:handle" component={() => <SiteLayout><ProductDetail /></SiteLayout>} />
      <Route path="/products.html" component={CollectionsRoute} />
      <Route path="/new-arrivals" component={CollectionsRoute} />
      <Route path="/smart-office" component={CollectionsRoute} />
      <Route path="/about" component={HeritageRoute} />
      <Route path="/about.html" component={HeritageRoute} />
      <Route path="/track-order" component={OrderTrackingRoute} />
      <Route path="/order-tracking" component={OrderTrackingRoute} />
      <Route path="/nexus-club" component={() => <SiteLayout><NexusClub /></SiteLayout>} />
      <Route path="/login" component={() => <SiteLayout><Login /></SiteLayout>} />
      <Route path="/register" component={() => <SiteLayout><Register /></SiteLayout>} />
      <Route path="/terms" component={() => <SiteLayout><Terms /></SiteLayout>} />
      <Route path="/privacy" component={() => <SiteLayout><Privacy /></SiteLayout>} />
      <Route path="/404" component={NotFoundRoute} />
      <Route component={NotFoundRoute} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <CartProvider>
          <TooltipProvider>
            <ScrollToTop />
            <Toaster position="bottom-right" />
            <Router />
            <SocietyModal />
          </TooltipProvider>
        </CartProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
