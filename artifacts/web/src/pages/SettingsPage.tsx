import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useUser, useClerk } from "@clerk/react";
import { useAuthFetch } from "@/lib/useAuthFetch";
import {
  User, CreditCard, Users, Bell, Zap, Key,
  CheckCircle2, Crown, Plus, Copy
} from "lucide-react";

type Tab = "profile" | "billing" | "team" | "notifications" | "integrations" | "api";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "profile",       label: "Profile",       icon: <User size={14} /> },
  { id: "billing",       label: "Billing",       icon: <CreditCard size={14} /> },
  { id: "team",          label: "Team",          icon: <Users size={14} /> },
  { id: "notifications", label: "Notifications", icon: <Bell size={14} /> },
  { id: "integrations",  label: "Integrations",  icon: <Zap size={14} /> },
  { id: "api",           label: "API Keys",      icon: <Key size={14} /> },
];

const ROLES = ["Owner", "Admin", "Analyst", "Viewer"];
const ROLE_DESC: Record<string, string> = {
  Owner:   "Full access — billing, team, all data",
  Admin:   "All features — cannot manage billing",
  Analyst: "View and edit athletes, run reports",
  Viewer:  "Read-only access to the workspace",
};

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 12,
  padding: 20,
};

const inputCls = "w-full px-3.5 py-2.5 rounded-lg text-[13px] text-white focus:outline-none transition-all placeholder:text-[rgba(255,255,255,0.30)]";
const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.12)",
};
const inputFocusStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.09)",
  border: "1px solid rgba(185,255,74,0.50)",
};

const labelCls = "block text-[11px] font-semibold uppercase tracking-wider mb-1.5";

function InputField({ label, value, onChange, placeholder, disabled }: {
  label: string; value: string; onChange?: (v: string) => void; placeholder?: string; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label className={labelCls} style={{ color: "rgba(255,255,255,0.40)" }}>{label}</label>
      <input
        value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={inputCls + (disabled ? " opacity-40 cursor-not-allowed" : "")}
        style={focused && !disabled ? inputFocusStyle : inputStyle}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
}

function ProfileTab({ user }: { user: any }) {
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName]   = useState(user?.lastName ?? "");
  const [orgName, setOrgName]     = useState((user?.unsafeMetadata as any)?.orgName ?? "");
  const [jobTitle, setJobTitle]   = useState((user?.unsafeMetadata as any)?.jobTitle ?? "");
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [saveError, setSaveError] = useState("");

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setSaveError("");
    try {
      await user.update({
        firstName,
        lastName,
        unsafeMetadata: { ...(user.unsafeMetadata as any), orgName, jobTitle },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaveError("Failed to save — please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-5">
      {/* Avatar card */}
      <div className="flex items-center gap-5 p-5 rounded-xl" style={card}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
          style={{ background: "linear-gradient(135deg, rgba(185,255,74,0.30), rgba(185,255,74,0.10))", border: "2px solid rgba(185,255,74,0.30)", color: "#B9FF4A" }}>
          {firstName?.[0]}{lastName?.[0]}
        </div>
        <div>
          <div className="text-[15px] font-semibold text-white">
            {[firstName, lastName].filter(Boolean).join(" ") || "User"}
          </div>
          <div className="text-[13px]" style={{ color: "rgba(255,255,255,0.45)" }}>{user?.primaryEmailAddress?.emailAddress}</div>
        </div>
      </div>

      {/* Form */}
      <div className="p-5 rounded-xl space-y-4" style={card}>
        <h3 className="text-[13px] font-semibold text-white">Personal information</h3>
        <div className="grid grid-cols-2 gap-4">
          <InputField label="First name" value={firstName} onChange={setFirstName} />
          <InputField label="Last name"  value={lastName}  onChange={setLastName} />
        </div>
        <InputField label="Email address" value={user?.primaryEmailAddress?.emailAddress || ""} disabled />
        <InputField label="Organisation name" value={orgName} onChange={setOrgName} placeholder="e.g. Athletics New Zealand" />
        <InputField label="Job title" value={jobTitle} onChange={setJobTitle} placeholder="e.g. Performance Director" />
        {saveError && <p className="text-[12px]" style={{ color: "#f87171" }}>{saveError}</p>}
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors"
          style={{ background: saving ? "rgba(255,255,255,0.10)" : "#B9FF4A", color: saving ? "rgba(255,255,255,0.40)" : "#0D1C0B", cursor: saving ? "not-allowed" : "pointer" }}
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function BillingTab() {
  const [sub, setSub]                 = useState<any>(undefined);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError]     = useState("");
  const authFetch = useAuthFetch();

  useEffect(() => {
    authFetch("/api/stripe/subscription")
      .then((r) => r.json())
      .then((d) => setSub(d.subscription ?? null))
      .catch(() => setSub(null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openPortal = async () => {
    setPortalLoading(true);
    setPortalError("");
    try {
      const res = await authFetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      if (!res.ok) throw new Error("Portal request failed");
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error("No portal URL returned");
    } catch {
      setPortalError("Could not open billing portal. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  };

  if (sub === undefined) {
    return (
      <div className="max-w-2xl space-y-5">
        {[0, 1].map((i) => (
          <div key={i} className="p-6 rounded-xl space-y-3" style={card}>
            <div className="h-5 w-48 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.10)" }} />
            <div className="h-4 w-64 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.07)" }} />
          </div>
        ))}
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="max-w-2xl">
        <div className="p-10 rounded-xl text-center" style={card}>
          <Crown size={32} className="mx-auto mb-3" style={{ color: "rgba(255,255,255,0.20)" }} />
          <h3 className="text-[15px] font-semibold text-white mb-1">No active subscription</h3>
          <p className="text-[13px] mb-5" style={{ color: "rgba(255,255,255,0.45)" }}>
            Start a 3-day free trial to unlock all features. No charge until the trial ends.
          </p>
          <a href="/pricing" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-colors"
            style={{ background: "#B9FF4A", color: "#0D1C0B" }}>
            View plans
          </a>
        </div>
      </div>
    );
  }

  const status: string    = sub.status ?? "unknown";
  const isTrialing        = status === "trialing";
  const isActive          = ["active", "trialing"].includes(status);
  const periodEnd         = sub.current_period_end ? new Date((sub.current_period_end as number) * 1000) : null;
  const planName: string  = sub.items?.data?.[0]?.price?.product?.name ?? sub.plan?.nickname ?? (sub.metadata as any)?.tier ?? "Subscription";
  const amount: number | undefined = sub.items?.data?.[0]?.price?.unit_amount;
  const currency: string  = sub.items?.data?.[0]?.price?.currency ?? "usd";
  const interval: string  = sub.items?.data?.[0]?.price?.recurring?.interval ?? "month";
  const displayAmount     = amount ? `${currency.toUpperCase()} ${(amount / 100).toFixed(0)}` : null;
  const statusLabel       = isTrialing ? "Trial" : status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
  const statusStyle       = isActive
    ? { background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)", color: "#4ade80" }
    : { background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)", color: "#fbbf24" };

  const plans = [
    { name: "Starter",    price: "$299/mo", athletes: "50 athletes",      users: "5 users" },
    { name: "Pro",        price: "$799/mo", athletes: "200 athletes",     users: "15 users" },
    { name: "Enterprise", price: "Custom",  athletes: "Unlimited",        users: "Unlimited" },
  ];

  return (
    <div className="max-w-2xl space-y-5">
      {/* Active plan card */}
      <div className="p-6 rounded-xl" style={card}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown size={16} style={{ color: "#B9FF4A" }} />
              <span className="text-[15px] font-semibold text-white">{planName}</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={statusStyle}>{statusLabel}</span>
            </div>
            <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.45)" }}>
              {displayAmount ? `${displayAmount} / ${interval}` : ""}
              {periodEnd ? ` · ${isTrialing ? "trial ends" : "renews"} ${periodEnd.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}
            </p>
          </div>
          <button
            onClick={openPortal}
            disabled={portalLoading}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50"
            style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.70)", background: "rgba(255,255,255,0.05)" }}
          >
            {portalLoading ? "Opening…" : "Manage billing"}
          </button>
        </div>
        {portalError && <p className="text-[12px] mb-2" style={{ color: "#f87171" }}>{portalError}</p>}
        <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.30)" }}>
          Billing is managed via Stripe. Click "Manage billing" to update payment methods, download invoices, or cancel your subscription.
        </p>
      </div>

      {/* Plan comparison */}
      <div className="p-5 rounded-xl" style={card}>
        <h3 className="text-[13px] font-semibold text-white mb-4">Available plans</h3>
        {plans.map((p) => {
          const isCurrent = planName.toLowerCase().includes(p.name.toLowerCase());
          return (
            <div key={p.name} className="flex items-center justify-between p-3.5 rounded-xl mb-2"
              style={{ background: isCurrent ? "rgba(185,255,74,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${isCurrent ? "rgba(185,255,74,0.20)" : "rgba(255,255,255,0.07)"}` }}>
              <div className="flex items-center gap-3">
                {isCurrent
                  ? <CheckCircle2 size={14} style={{ color: "#B9FF4A" }} className="shrink-0" />
                  : <div className="w-3.5 h-3.5 rounded-full border shrink-0" style={{ borderColor: "rgba(255,255,255,0.20)" }} />}
                <div>
                  <span className="text-[13px] font-medium text-white">{p.name}</span>
                  <span className="text-[12px] ml-2" style={{ color: "rgba(255,255,255,0.40)" }}>{p.athletes} · {p.users}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-semibold text-white">{p.price}</span>
                {!isCurrent && (
                  <button onClick={openPortal} className="text-[12px] font-medium hover:underline" style={{ color: "#B9FF4A" }}>
                    {p.name === "Enterprise" ? "Contact sales" : "Upgrade"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamTab() {
  const { user } = useUser();
  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join("") || "U";
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.primaryEmailAddress?.emailAddress || "You";

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-white">Team members</h3>
          <p className="text-[12px] mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>1 seat used · Multi-user access coming soon</p>
        </div>
        <button disabled title="Team invitations are coming in a future release"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium cursor-not-allowed"
          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.30)", border: "1px solid rgba(255,255,255,0.09)" }}>
          <Plus size={14} />Invite member
        </button>
      </div>

      <div className="rounded-xl overflow-hidden" style={card}>
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
            style={{ background: "rgba(185,255,74,0.20)", color: "#B9FF4A" }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-white truncate">{displayName}</div>
            <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.40)" }}>{user?.primaryEmailAddress?.emailAddress}</div>
          </div>
          <span className="px-2.5 py-1 rounded-lg text-[12px]"
            style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.70)", background: "rgba(255,255,255,0.04)" }}>
            Owner
          </span>
        </div>
      </div>

      <div className="p-5 rounded-xl" style={card}>
        <h4 className="text-[13px] font-semibold text-white mb-1">Team management — coming soon</h4>
        <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.40)" }}>
          Multi-user access with role-based permissions will be available in a future release.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ROLES.map((r) => (
          <div key={r} className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="text-[12px] font-semibold w-16 shrink-0" style={{ color: "#B9FF4A" }}>{r}</div>
            <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.40)" }}>{ROLE_DESC[r]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    results: "immediate", media: "daily", sponsorships: "immediate", career: "immediate",
    emailDigest: true, browserPush: false, slackAlerts: false,
  });

  const selectStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    color: "white",
    fontSize: 12,
    padding: "6px 12px",
  };

  return (
    <div className="max-w-xl space-y-5">
      <div className="p-5 rounded-xl" style={card}>
        <h3 className="text-[13px] font-semibold text-white mb-4">Alert frequency by category</h3>
        {[
          { key: "results",       label: "Results & Rankings" },
          { key: "media",         label: "Media & Interviews" },
          { key: "sponsorships",  label: "Sponsorships" },
          { key: "career",        label: "Career Changes" },
        ].map((cat) => (
          <div key={cat.key} className="flex items-center justify-between py-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-[13px] text-white">{cat.label}</span>
            <select value={(prefs as any)[cat.key]}
              onChange={(e) => setPrefs((p) => ({ ...p, [cat.key]: e.target.value }))}
              className="focus:outline-none" style={selectStyle}>
              <option value="immediate">Immediate</option>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly summary</option>
              <option value="off">Off</option>
            </select>
          </div>
        ))}
      </div>

      <div className="p-5 rounded-xl space-y-4" style={card}>
        <h3 className="text-[13px] font-semibold text-white">Delivery channels</h3>
        {[
          { key: "emailDigest",  label: "Email digest",                desc: "Daily summary of all intelligence updates" },
          { key: "browserPush",  label: "Browser push notifications",  desc: "Real-time alerts in your browser" },
          { key: "slackAlerts",  label: "Slack alerts",                desc: "Requires Slack integration (Pro+)" },
        ].map((ch) => (
          <div key={ch.key} className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-medium text-white">{ch.label}</div>
              <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.40)" }}>{ch.desc}</div>
            </div>
            <button
              onClick={() => setPrefs((p) => ({ ...p, [ch.key]: !(p as any)[ch.key] }))}
              className="relative rounded-full transition-colors"
              style={{ height: 22, width: 40, background: (prefs as any)[ch.key] ? "#B9FF4A" : "rgba(255,255,255,0.15)" }}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full shadow transition-transform`}
                style={{ background: (prefs as any)[ch.key] ? "#0D1C0B" : "rgba(255,255,255,0.70)", transform: (prefs as any)[ch.key] ? "translateX(20px)" : "translateX(2px)" }} />
            </button>
          </div>
        ))}
      </div>

      <button className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors"
        style={{ background: "#B9FF4A", color: "#0D1C0B" }}>
        Save preferences
      </button>
    </div>
  );
}

function IntegrationsTab() {
  const integrations = [
    { name: "Slack",            desc: "Send alerts and intelligence updates to Slack channels.",       icon: "💬", status: "available",   plan: "Pro+" },
    { name: "Microsoft Teams",  desc: "Push notifications and daily digests to Teams channels.",       icon: "🟦", status: "available",   plan: "Pro+" },
    { name: "Email",            desc: "Customisable email digests and instant alerts.",                icon: "📧", status: "connected",   plan: "All plans" },
    { name: "Calendar",         desc: "Sync competition schedules to Google or Outlook calendar.",     icon: "📅", status: "coming-soon", plan: "Pro+" },
    { name: "HubSpot CRM",      desc: "Sync athlete contact data and intelligence to HubSpot.",        icon: "🔶", status: "coming-soon", plan: "Enterprise" },
    { name: "REST API",         desc: "Programmatic access to all intelligence data.",                 icon: "⚡", status: "coming-soon", plan: "Enterprise" },
  ];

  return (
    <div className="max-w-2xl space-y-3">
      {integrations.map((intg) => (
        <div key={intg.name} className="flex items-center gap-4 p-4 rounded-xl" style={card}>
          <span className="text-2xl shrink-0">{intg.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[13px] font-medium text-white">{intg.name}</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.40)" }}>
                {intg.plan}
              </span>
            </div>
            <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.40)" }}>{intg.desc}</p>
          </div>
          {intg.status === "connected" && (
            <span className="shrink-0 flex items-center gap-1 text-[11px] font-semibold" style={{ color: "#4ade80" }}>
              <CheckCircle2 size={12} />Connected
            </span>
          )}
          {intg.status === "available" && (
            <button className="shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.70)", background: "rgba(255,255,255,0.05)" }}>
              Connect
            </button>
          )}
          {intg.status === "coming-soon" && (
            <span className="shrink-0 text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.25)" }}>Coming soon</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ApiTab() {
  return (
    <div className="max-w-xl space-y-5">
      <div className="p-5 rounded-xl" style={card}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-[13px] font-semibold text-white mb-1">API Keys</h3>
            <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.40)" }}>
              Use API keys to access intelligence data programmatically. Available on Enterprise plans.
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.40)" }}>
            Enterprise
          </span>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg mb-4"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
          <div className="font-mono text-[12px] flex-1" style={{ color: "rgba(255,255,255,0.40)" }}>
            ai_sk_••••••••••••••••••••••••••••••••
          </div>
          <button className="p-1.5 rounded transition-colors" style={{ color: "rgba(255,255,255,0.30)" }}>
            <Copy size={13} />
          </button>
        </div>

        <div className="space-y-3">
          <button disabled className="w-full py-2.5 rounded-lg text-[13px] font-medium cursor-not-allowed flex items-center justify-center gap-2"
            style={{ border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.25)" }}>
            <Plus size={14} />Generate new key
          </button>
          <p className="text-[11px] text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
            Upgrade to Enterprise to generate API keys.
          </p>
        </div>
      </div>

      <div className="p-5 rounded-xl" style={{ ...card, background: "rgba(255,255,255,0.03)" }}>
        <h4 className="text-[12px] font-semibold mb-2" style={{ color: "rgba(255,255,255,0.50)" }}>API documentation</h4>
        <p className="text-[12px] mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
          Full REST API with OpenAPI spec, SDKs for Python and JavaScript, and webhook support.
        </p>
        <button disabled className="text-[12px] font-medium cursor-not-allowed" style={{ color: "rgba(255,255,255,0.25)" }}>
          View documentation →
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage({ initialTab }: { initialTab?: Tab }) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab ?? "profile");
  const { user } = useUser();

  return (
    <AppLayout activePage="settings">
      <div className="flex flex-col h-full" style={{ background: "#0D1C0B" }}>
        <header className="flex-shrink-0 px-8 pt-8 pb-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Settings</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
            Manage your account, team, billing, and workspace preferences.
          </p>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Tab sidebar */}
          <nav className="w-48 flex-shrink-0 pt-4 px-3" style={{ borderRight: "1px solid rgba(255,255,255,0.09)" }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-[13px] mb-1 transition-all"
                style={{
                  background: activeTab === tab.id ? "rgba(185,255,74,0.10)" : "transparent",
                  color: activeTab === tab.id ? "#B9FF4A" : "rgba(255,255,255,0.55)",
                  fontWeight: activeTab === tab.id ? 500 : 400,
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-8">
            {activeTab === "profile"       && <ProfileTab user={user} />}
            {activeTab === "billing"       && <BillingTab />}
            {activeTab === "team"          && <TeamTab />}
            {activeTab === "notifications" && <NotificationsTab />}
            {activeTab === "integrations"  && <IntegrationsTab />}
            {activeTab === "api"           && <ApiTab />}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
