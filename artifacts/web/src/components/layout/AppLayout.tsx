import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Sidebar } from "./Sidebar";
import { useUser, useAuth } from "@clerk/react";
import PlanSelectionModal, { PLAN_SELECTED_KEY } from "@/components/PlanSelectionModal";
import { useIsAdmin } from "@/hooks/useIsAdmin";

type SubStatus = "loading" | "active" | "none" | "bypass";

function useSubscriptionStatus(
  email: string | null | undefined,
  getToken: () => Promise<string | null>,
): SubStatus {
  const [status, setStatus] = useState<SubStatus>("loading");

  useEffect(() => {
    if (email === undefined) return;
    if (localStorage.getItem(PLAN_SELECTED_KEY) === "1") { setStatus("bypass"); return; }
    if (!email) { setStatus("bypass"); return; }

    getToken()
      .then((token) =>
        fetch("/api/stripe/subscription", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
      )
      .then((r) => {
        if (!r.ok) { setStatus("bypass"); return; }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        const sub = d.subscription;
        if (sub && (sub.status === "active" || sub.status === "trialing")) {
          localStorage.setItem(PLAN_SELECTED_KEY, "1");
          setStatus("active");
        } else {
          setStatus("none");
        }
      })
      .catch(() => setStatus("bypass"));
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
  enforceSubscription?: boolean;
}

export function AppLayout({ children, activePage = "dashboard", enforceSubscription = true }: AppLayoutProps) {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const email = isLoaded ? (user?.primaryEmailAddress?.emailAddress?.trim() ?? null) : undefined;
  const subStatus = useSubscriptionStatus(email, getToken);

  // Admins are never blocked by billing — bypass is server-verified.
  // Also hold off showing the paywall until admin status is resolved, to
  // prevent a flash of the modal during the first-render race.
  const showPaywall = enforceSubscription && !isAdmin && !adminLoading && subStatus === "none";
  const userEmail = email ?? null;

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {showPaywall && <PlanSelectionModal userEmail={userEmail} />}

      <div
        style={{
          display: "flex",
          height: "100vh",
          width: "100%",
          background: "#0D1C0B",
          color: "rgba(255,255,255,0.92)",
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
            background: "#0D1C0B",
          }}
        >
          {children}
        </main>
      </div>
    </>
  );
}
