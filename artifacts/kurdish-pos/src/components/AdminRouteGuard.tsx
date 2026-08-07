import { useAuth } from "@/contexts/AuthContext";
import { Redirect } from "wouter";
import {
  LOGIN_ENTRY_PATH,
  clearMerchantBypass,
  MERCHANT_MODE_KEY,
} from "@/lib/auth-session";

/**
 * Strict guard for `/admin*` routes — only platform owners (role === "admin").
 * Non-admins are sent to login (not onboarding) so admin credentials can be entered.
 */
export function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070d1a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    clearMerchantBypass();
    try {
      sessionStorage.removeItem(MERCHANT_MODE_KEY);
    } catch {
      /* ignore */
    }
    return <Redirect to={LOGIN_ENTRY_PATH} />;
  }

  return <>{children}</>;
}
