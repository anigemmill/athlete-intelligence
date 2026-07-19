import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Sidebar } from "./Sidebar";
import { useUser, useAuth } from "@clerk/react";
import PlanSelectionModal, { PLAN_SELECTED_KEY } from "@/components/PlanSelectionModal";

const FOUNDER_EMAIL = "anigemmill@theoutsidein.nz";

/**
 * Checks whether the current user has an active Stripe subscription.
 * Returns:
 *   "loading"  — not yet determined
 *   "active"   — trialing or active subscription (no paywall)
 *   "none"     — no subscription found (show paywall)
 *   "bypass"   — founder or already marked paid in localStorage (skip check)
 */
type SubStatus = "loading" | "active" | "none" | "bypass";

function useSubscriptionStatus(
  email: string | null | undefined,
  getToken: () => Promise<string | null>,
): SubStatus {
  const [status, setStatus] = useState<SubStatus>("loading");

  useEffect(() => {
    if (email === undefined) return; // Clerk not yet loaded

    // Founder always bypasses
    if (email?.toLowerCase() === FOUNDER_EMAIL) {
      setStatus("bypass");
      return;
    }

    // If the user completed billing (stored by BillingSuccessPage), skip the server check
    if (localStorage.getItem(PLAN_SELECTED_KEY) === "1") {
      setStatus("bypass");
      return;
    }

    // No email means not signed in — ProtectedRoute will handle redirect
    if (!email) {
      setStatus("bypass");
      return;
    }

    // Server-side check — attach Clerk JWT so the request never gets a 401
    getToken()
      .then((token) =>
        fetch("/api/stripe/subscription", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
      )
      .then((r) => {
        // If the API rejects the request for any reason, fail open — don't block access
        if (!r.ok) {
          setStatus("bypass");
          return;
        }
        return r.json();
      })
      .then((d) => {
        if (!d) return; // already handled above (non-ok)
        const sub = d.subscription;
        if (sub && (sub.status === "active" || sub.status === "trialing")) {
          // Cache locally so we don't hit the server every navigation
          localStorage.setItem(PLAN_SELECTED_KEY, "1");
          setStatus("active");
        } else {
          setStatus("none");
        }
      })
      .catch(() => {
        // On network error, don't block access — fail open
        setStatus("bypass");
      });
  }, [email]);

  return status;
}

export type ActivePage =
  | "dashboard"
  | "intelligence"
  | "chat"
  | "schedule"
  | "alerts"
  | "settings"
  | "admin"
  | "athletes"
  | "sources"
  | "compare";

interface AppLayoutProps {
  children: React.ReactNode;
  activePage?: ActivePage;
  /** Set to false on pages where a subscription should never be enforced (e.g. admin). */
  enforceSubscription?: boolean;
}

export function AppLayout({ children, activePage = "dashboard", enforceSubscription = true }: AppLayoutProps) {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const email = isLoaded ? (user?.primaryEmailAddress?.emailAddress?.trim() ?? null) : undefined;
  const subStatus = useSubscriptionStatus(email, getToken);

  const showPaywall = enforceSubscription && subStatus === "none";
  const userEmail = email ?? null;

  return (
    <>
      {/* All authenticated pages must not be indexed by search engines */}
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Non-dismissible paywall — rendered above everything when subscription is required */}
      {showPaywall && <PlanSelectionModal userEmail={userEmail} />}

      <div
        style={{
          display: "flex",
          height: "100vh",
          width: "100%",
          background: "#FCFAFA",
          color: "#1C1F3A",
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          overflow: "hidden",
        }}
        className="athlete-intelligence-root"
      >
        <Sidebar activePage={activePage} />
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
            background: "#FCFAFA",
          }}
        >
          {children}
        </main>
      </div>
    </>
  );
}
