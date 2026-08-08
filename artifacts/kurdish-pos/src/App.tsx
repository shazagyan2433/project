import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { AdminLayout } from "@/components/AdminLayout";
import { AdminRouteGuard } from "@/components/AdminRouteGuard";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SectorProvider } from "@/contexts/SectorContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import {
  isMerchantMode,
  isMerchantBypass,
  isMerchantAppPath,
  ONBOARDING_RESET_KEY,
  MERCHANT_APP_PATH,
  isLogoutEntry,
  hasAuthenticatedAppAccess,
  ONBOARDING_ENTRY_PATH,
  LOGIN_ENTRY_PATH,
  normalizeAppPath,
  isLoginEntryPath,
} from "@/lib/auth-session";
import "@/i18n";
import i18n from "@/i18n";

// Pages
import Dashboard from "@/pages/dashboard";
import Settings from "@/pages/settings";
import Products from "@/pages/products";
import Customers from "@/pages/customers";
import POS from "@/pages/pos";
import Sales from "@/pages/sales";
import Debts from "@/pages/debts";
import Reports from "@/pages/reports";
import NotFound from "@/pages/not-found";
import Register from "@/pages/register";
import Login from "@/pages/login";
import UsersPage from "@/pages/users";
import SupplierPortal from "@/pages/supplier-portal";
import BuyerPortal    from "@/pages/buyer-portal";
import DriverPortal   from "@/pages/driver-portal";
import HistoryPage from "@/pages/history";
import MasterAdminPanel from "@/pages/master-admin";
import AdminVerification from "@/pages/admin-verification";

// Terminal B2B pages
import Marketplace from "@/pages/marketplace";
import AIAssistant from "@/pages/ai-assistant";
import Inventory from "@/pages/inventory";
import Logistics from "@/pages/logistics";
import Negotiation from "@/pages/negotiation";
import Financial from "@/pages/financial";
import MarketIntel from "@/pages/market-intel";
import SupplierDirectory from "@/pages/supplier-directory";
import SupplierProfilePage from "@/pages/supplier-profile";
import Procurement from "@/pages/procurement";
import NotificationCenter from "@/pages/notifications";
import RewardsCenter from "@/pages/rewards";
import { SectorRouteGuard } from "@/components/SectorRouteGuard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (_failureCount: number, _error: unknown) => {
        if (!navigator.onLine) return false;
        return _failureCount < 1;
      },
      staleTime: 1000 * 60 * 60,
      gcTime: 1000 * 60 * 60 * 24,
      networkMode: "offlineFirst",
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
});

const LEGACY_ADMIN_ALIASES: Record<string, string> = {
  "/admin-panel": "/admin/dashboard",
  "/linqi-owner": "/admin/dashboard",
  "/master-admin": "/admin/dashboard",
  "/users": "/admin/users",
};

function isAdminPath(path: string): boolean {
  return path === "/admin" || path.startsWith("/admin/");
}

/* Admin keyboard shortcut — hidden when merchant bypass is active */
function AdminShortcut() {
  const [, navigate] = useLocation();
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (isMerchantBypass() || isMerchantMode()) return;

    const handler = (e: KeyboardEvent) => {
      if (!isAdmin) return;
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        navigate("/admin/dashboard");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, isAdmin]);

  return null;
}

function ConditionalAdminShortcut() {
  const [location] = useLocation();
  if (isMerchantBypass() || isMerchantMode() || isMerchantAppPath(location)) {
    return null;
  }
  return <AdminShortcut />;
}

function DirectionSync() {
  useEffect(() => {
    const apply = (lang: string) => {
      const rtl = lang === "ku" || lang === "ar";
      document.documentElement.dir = rtl ? "rtl" : "ltr";
      document.documentElement.lang = lang;
      localStorage.setItem("linqi_lang", lang);
    };
    apply(i18n.language);
    i18n.on("languageChanged", apply);
    return () => { i18n.off("languageChanged", apply); };
  }, []);
  return null;
}

function wantsOnboardingWizard(): boolean {
  try {
    return sessionStorage.getItem(ONBOARDING_RESET_KEY) === "1";
  } catch {
    return false;
  }
}

function wantsPublicEntry(): boolean {
  return wantsOnboardingWizard() || isLogoutEntry();
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AdminRouter() {
  return (
    <AdminRouteGuard>
      <AdminLayout>
        <Switch>
          <Route path="/admin/dashboard" component={MasterAdminPanel} />
          <Route path="/admin/verification-queue" component={AdminVerification} />
          <Route path="/admin/users" component={UsersPage} />
          <Route>
            <Redirect to="/admin/dashboard" />
          </Route>
        </Switch>
      </AdminLayout>
    </AdminRouteGuard>
  );
}

function MerchantRouter() {
  const { user } = useAuth();

  if (user?.role === "supplier") {
    return <SupplierPortal />;
  }

  if (user?.role === "buyer") {
    return <BuyerPortal />;
  }

  if (user?.role === "driver") {
    return <DriverPortal />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/">
          <Redirect to={MERCHANT_APP_PATH} />
        </Route>
        <Route path="/merchant">
          <Redirect to={MERCHANT_APP_PATH} />
        </Route>
        <Route path="/app">
          <Redirect to={MERCHANT_APP_PATH} />
        </Route>

        <Route path="/marketplace">
          <SectorRouteGuard feature="marketplace"><Marketplace /></SectorRouteGuard>
        </Route>
        <Route path="/ai-assistant">
          <SectorRouteGuard feature="ai-assistant"><AIAssistant /></SectorRouteGuard>
        </Route>
        <Route path="/inventory">
          <SectorRouteGuard feature="inventory"><Inventory /></SectorRouteGuard>
        </Route>
        <Route path="/logistics">
          <SectorRouteGuard feature="logistics"><Logistics /></SectorRouteGuard>
        </Route>
        <Route path="/negotiation">
          <SectorRouteGuard feature="negotiation"><Negotiation /></SectorRouteGuard>
        </Route>
        <Route path="/financial">
          <SectorRouteGuard feature="financial"><Financial /></SectorRouteGuard>
        </Route>
        <Route path="/market-intel">
          <SectorRouteGuard feature="market-intel"><MarketIntel /></SectorRouteGuard>
        </Route>
        <Route path="/supplier-directory">
          <SectorRouteGuard feature="supplier-directory"><SupplierDirectory /></SectorRouteGuard>
        </Route>
        <Route path="/marketplace/seller/:id">
          <SectorRouteGuard feature="supplier-directory"><SupplierProfilePage /></SectorRouteGuard>
        </Route>
        <Route path="/procurement">
          <SectorRouteGuard feature="procurement"><Procurement /></SectorRouteGuard>
        </Route>
        <Route path="/notifications"      component={NotificationCenter} />
        <Route path="/rewards"            component={RewardsCenter}      />

        <Route path="/products"  component={Products}    />
        <Route path="/customers" component={Customers}   />
        <Route path="/pos"       component={POS}         />
        <Route path="/sales"     component={Sales}       />
        <Route path="/history"   component={HistoryPage} />
        <Route path="/debts"     component={Debts}       />
        <Route path="/reports"   component={Reports}     />

        <Route path="/settings" component={Settings} />

        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function Router() {
  const { isLoading } = useAuth();
  const [location] = useLocation();
  const path = normalizeAppPath(location);

  /* Public auth entry — never redirect away; must render login UI */
  if (isLoginEntryPath(path)) {
    return <Login />;
  }

  if (path === "/merchant" || path === "/app") {
    return <Redirect to={MERCHANT_APP_PATH} />;
  }

  if (path === "/" && !hasAuthenticatedAppAccess()) {
    return <Redirect to={ONBOARDING_ENTRY_PATH} />;
  }

  if (path === "/onboarding" || path === "/register") {
    if (hasAuthenticatedAppAccess() && !wantsPublicEntry()) {
      return <Redirect to={MERCHANT_APP_PATH} />;
    }
    return <Register />;
  }

  const legacyTarget = LEGACY_ADMIN_ALIASES[path];
  if (legacyTarget) {
    return <Redirect to={legacyTarget} />;
  }

  if (path === "/admin") {
    return <Redirect to="/admin/dashboard" />;
  }

  if (isAdminPath(path)) {
    if (isLoading) return <LoadingScreen />;
    return <AdminRouter />;
  }

  if (!hasAuthenticatedAppAccess()) {
    return <Redirect to={LOGIN_ENTRY_PATH} />;
  }

  return <MerchantRouter />;
}

function App() {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SectorProvider>
            <TooltipProvider>
              <DirectionSync />
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <ConditionalAdminShortcut />
                <Router />
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
            </SectorProvider>
          </AuthProvider>
        </QueryClientProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}

export default App;
