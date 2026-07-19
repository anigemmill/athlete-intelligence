import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Shield, Users, CreditCard, Zap, Activity, Server,
  GitBranch, MessageSquare, Mail, Loader2, RefreshCw,
  CheckCircle2, Clock, XCircle,
} from "lucide-react";

const FOUNDER_EMAIL = "anigemmill@theoutsidein.nz";

type Tab = "customers" | "enquiries" | "licences" | "ai-usage" | "crawl" | "health" | "flags";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "customers", label: "Customers", icon: <Users size={13} /> },
  { id: "enquiries", label: "Enquiries", icon: <Mail size={13} /> },
  { id: "licences", label: "Licences", icon: <CreditCard size={13} /> },
  { id: "ai-usage", label: "AI Usage", icon: <Zap size={13} /> },
  { id: "crawl", label: "Crawl Monitor", icon: <Activity size={13} /> },
  { id: "health", label: "Health", icon: <Server size={13} /> },
  { id: "flags", label: "Feature Flags", icon: <GitBranch size={13} /> },
];

const PLAN_COLORS: Record<string, string> = {
  Starter: "bg-[#F0F2F8] text-[#6B7080]",
  Pro: "bg-[rgba(52,79,159,0.10)] text-[#344F9F]",
  Enterprise: "bg-[rgba(231,93,80,0.10)] text-[#E75D50]",
  None: "bg-[#F5F5F5] text-[#AAAAAA]",
  Unknown: "bg-[#F5F5F5] text-[#AAAAAA]",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-600",
  trialing: "bg-amber-50 text-amber-600",
  canceled: "bg-red-50 text-red-600",
  none: "bg-[#F0F2F8] text-[#8A90A8]",
  past_due: "bg-red-50 text-red-500",
};

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="p-5 rounded-xl bg-white border border-[#DCE2EF] shadow-sm">
      <div className="text-[12px] font-medium text-[#6B7080] mb-2">{label}</div>
      <div className={`text-2xl font-bold mb-1 ${color ?? "text-[#1C1F3A]"}`}>{value}</div>
      {sub && <div className="text-[11px] text-[#A0A8C0]">{sub}</div>}
    </div>
  );
}

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 2) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
}

// ── Customers tab ─────────────────────────────────────────────────────────────

type Customer = {
  id: string; name: string; email: string;
  plan: string; subscriptionStatus: string; mrr: number;
  trialEnd: number | null; signedUpAt: string;
  lastActiveAt: string | null; imageUrl: string;
};

function CustomersTab() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch("/api/admin/customers");
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json();
      setCustomers(d.customers ?? []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const active = customers.filter((c) => c.subscriptionStatus === "active");
  const trialing = customers.filter((c) => c.subscriptionStatus === "trialing");
  const mrr = active.reduce((s, c) => s + c.mrr, 0);

  if (loading) return (
    <div className="flex items-center gap-2 text-[13px] text-[#8A90A8] py-8">
      <Loader2 size={14} className="animate-spin" /> Loading customers from Clerk + Stripe…
    </div>
  );

  if (error) return (
    <div className="py-8 text-[13px] text-red-500">Error: {error}</div>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total sign-ups" value={String(customers.length)} sub={`${trialing.length} in trial`} />
        <StatCard label="Monthly recurring revenue" value={`$${mrr.toLocaleString()}`} sub="Active subscriptions only" color="text-emerald-600" />
        <StatCard label="Active subscribers" value={String(active.length)} />
        <StatCard label="Trialling" value={String(trialing.length)} color="text-amber-600" />
      </div>

      <div className="rounded-xl border border-[#DCE2EF] bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-[#DCE2EF] flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-[#1C1F3A]">All sign-ups ({customers.length})</h3>
          <button onClick={load} className="flex items-center gap-1.5 text-[12px] text-[#8A90A8] hover:text-[#6B7080] transition-colors">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {customers.length === 0 ? (
          <div className="px-5 py-10 text-center text-[13px] text-[#8A90A8]">No sign-ups yet.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#DCE2EF] bg-[#FAFBFF]">
                {["User", "Plan", "Status", "MRR", "Signed up", "Last active", "Trial ends"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-[#8A90A8] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-[#F0F2F8] last:border-0 hover:bg-[#FAFBFF]">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      {c.imageUrl ? (
                        <img src={c.imageUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#EEF0F8] flex items-center justify-center text-[11px] font-bold text-[#6B7080]">
                          {c.name.charAt(0) || c.email.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="text-[13px] font-medium text-[#1C1F3A]">{c.name || "—"}</div>
                        <div className="text-[11px] text-[#8A90A8]">{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${PLAN_COLORS[c.plan] ?? PLAN_COLORS.None}`}>
                      {c.plan}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[c.subscriptionStatus] ?? STATUS_COLORS.none}`}>
                      {c.subscriptionStatus}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] font-medium text-[#1C1F3A]">
                    {c.mrr ? `$${c.mrr}` : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-[#8A90A8]">{formatDate(c.signedUpAt)}</td>
                  <td className="px-5 py-3.5 text-[12px] text-[#8A90A8]">
                    {c.lastActiveAt ? timeAgo(c.lastActiveAt) : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-[#8A90A8]">
                    {c.trialEnd ? formatDate(new Date(c.trialEnd * 1000).toISOString()) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Enquiries tab ─────────────────────────────────────────────────────────────

type Enquiry = {
  id: number; type: string; name: string; org: string;
  email: string; role: string | null; athletes: string | null;
  message: string | null; status: string; createdAt: string;
};

const ENQUIRY_TYPE_LABELS: Record<string, string> = {
  demo: "Demo request",
  sales: "Enterprise",
  general: "General",
};

const ENQUIRY_TYPE_COLORS: Record<string, string> = {
  demo: "bg-[rgba(52,79,159,0.10)] text-[#344F9F]",
  sales: "bg-[rgba(231,93,80,0.10)] text-[#E75D50]",
  general: "bg-[#F0F2F8] text-[#6B7080]",
};

const ENQUIRY_STATUS_OPTIONS = ["new", "read", "replied"];
const ENQUIRY_STATUS_COLORS: Record<string, string> = {
  new: "bg-amber-50 text-amber-600",
  read: "bg-blue-50 text-blue-600",
  replied: "bg-emerald-50 text-emerald-600",
};

function EnquiriesTab() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/enquiries");
      const d = await r.json();
      setEnquiries(d.enquiries ?? []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: number, status: string) => {
    setEnquiries((prev) => prev.map((e) => e.id === id ? { ...e, status } : e));
    await fetch(`/api/admin/enquiries/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  };

  if (loading) return (
    <div className="flex items-center gap-2 text-[13px] text-[#8A90A8] py-8">
      <Loader2 size={14} className="animate-spin" /> Loading enquiries…
    </div>
  );

  const newCount = enquiries.filter((e) => e.status === "new").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total enquiries" value={String(enquiries.length)} />
        <StatCard label="New (unread)" value={String(newCount)} color={newCount > 0 ? "text-amber-600" : undefined} />
        <StatCard label="Replied" value={String(enquiries.filter((e) => e.status === "replied").length)} color="text-emerald-600" />
      </div>

      {enquiries.length === 0 ? (
        <div className="rounded-xl border border-[#DCE2EF] bg-white p-10 text-center text-[13px] text-[#8A90A8]">
          No enquiries yet. Submissions from the contact form will appear here.
        </div>
      ) : (
        <div className="space-y-2">
          {enquiries.map((e) => (
            <div key={e.id} className="rounded-xl border border-[#DCE2EF] bg-white shadow-sm overflow-hidden">
              {/* Header row */}
              <div
                className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-[#FAFBFF] transition-colors"
                onClick={() => setExpanded(expanded === e.id ? null : e.id)}
              >
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${ENQUIRY_TYPE_COLORS[e.type] ?? ENQUIRY_TYPE_COLORS.general}`}>
                  {ENQUIRY_TYPE_LABELS[e.type] ?? e.type}
                </span>

                <div className="flex-1 min-w-0">
                  <span className="text-[13px] font-medium text-[#1C1F3A]">{e.name}</span>
                  <span className="text-[12px] text-[#8A90A8] ml-2">{e.org}</span>
                  {e.message && (
                    <span className="text-[12px] text-[#A0A8C0] ml-2 truncate hidden sm:inline">
                      — {e.message.slice(0, 80)}{e.message.length > 80 ? "…" : ""}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-[#A0A8C0]">{timeAgo(e.createdAt)}</span>
                  <select
                    value={e.status}
                    onClick={(ev) => ev.stopPropagation()}
                    onChange={(ev) => updateStatus(e.id, ev.target.value)}
                    className={`text-[11px] font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${ENQUIRY_STATUS_COLORS[e.status] ?? ""}`}
                  >
                    {ENQUIRY_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === e.id && (
                <div className="border-t border-[#F0F2F8] px-5 py-4 space-y-3 bg-[#FAFBFF]">
                  <div className="grid grid-cols-3 gap-4 text-[12px]">
                    <div>
                      <div className="text-[10px] font-semibold text-[#8A90A8] uppercase tracking-wider mb-1">Email</div>
                      <a href={`mailto:${e.email}`} className="text-[#344F9F] hover:underline">{e.email}</a>
                    </div>
                    {e.role && (
                      <div>
                        <div className="text-[10px] font-semibold text-[#8A90A8] uppercase tracking-wider mb-1">Role</div>
                        <div className="text-[#1C1F3A]">{e.role}</div>
                      </div>
                    )}
                    {e.athletes && (
                      <div>
                        <div className="text-[10px] font-semibold text-[#8A90A8] uppercase tracking-wider mb-1">Roster size</div>
                        <div className="text-[#1C1F3A]">{e.athletes}</div>
                      </div>
                    )}
                  </div>
                  {e.message && (
                    <div>
                      <div className="text-[10px] font-semibold text-[#8A90A8] uppercase tracking-wider mb-1">Message</div>
                      <p className="text-[13px] text-[#3D426A] leading-relaxed whitespace-pre-wrap">{e.message}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-3 pt-1">
                    <a
                      href={`mailto:${e.email}?subject=Re: Your Athlete Intelligence enquiry`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#293055] text-white text-[12px] font-medium hover:bg-[#1e2440] transition-colors"
                    >
                      <Mail size={12} /> Reply by email
                    </a>
                    <span className="text-[11px] text-[#A0A8C0]">Received {formatDate(e.createdAt)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Placeholder tabs (mock data kept) ─────────────────────────────────────────

function AiUsageTab() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="LLM calls today" value="—" sub="Not yet wired" />
        <StatCard label="Tokens used (MTok)" value="—" sub="Not yet wired" color="text-[#344F9F]" />
        <StatCard label="Crawler requests" value="—" sub="Not yet wired" />
        <StatCard label="Avg response time" value="—" sub="Not yet wired" color="text-emerald-600" />
      </div>
      <div className="rounded-xl border border-[#DCE2EF] bg-white p-6 text-[13px] text-[#8A90A8]">
        AI usage tracking will be wired to real telemetry in a future release.
      </div>
    </div>
  );
}

function CrawlTab() {
  return (
    <div className="rounded-xl border border-[#DCE2EF] bg-white p-6 text-[13px] text-[#8A90A8]">
      Crawl monitor will show live agent job status when the background crawl service is running.
    </div>
  );
}

function HealthTab() {
  const services = [
    { name: "API Server", status: "healthy" },
    { name: "Database (PostgreSQL)", status: "healthy" },
    { name: "Auth (Clerk)", status: "healthy" },
    { name: "Payments (Stripe)", status: "healthy" },
    { name: "AI Gateway (OpenAI)", status: "healthy" },
  ];
  const colors = { healthy: "bg-emerald-50 text-emerald-600", degraded: "bg-amber-50 text-amber-600", down: "bg-red-50 text-red-600" };

  return (
    <div className="grid grid-cols-3 gap-4">
      {services.map((s) => (
        <div key={s.name} className="p-4 rounded-xl bg-white border border-[#DCE2EF] shadow-sm flex items-center justify-between">
          <span className="text-[13px] font-medium text-[#1C1F3A]">{s.name}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${(colors as any)[s.status]}`}>{s.status}</span>
        </div>
      ))}
    </div>
  );
}

function FlagsTab() {
  const [flags, setFlags] = useState([
    { key: "ai_chat", label: "AI Chat", desc: "Natural language chat interface", enabled: true, env: "all" },
    { key: "intelligence_centre", label: "Intelligence Centre", desc: "Proactive insights panel", enabled: false, env: "internal" },
    { key: "bulk_import", label: "Bulk spreadsheet import", desc: "CSV / XLSX athlete import", enabled: true, env: "all" },
    { key: "relationship_explorer", label: "Relationship Explorer", desc: "Graph view of athlete connections", enabled: false, env: "internal" },
    { key: "saved_searches", label: "Saved Searches", desc: "Save and auto-refresh search queries", enabled: false, env: "beta" },
    { key: "api_keys", label: "API Key management", desc: "Generate and manage REST API keys", enabled: false, env: "enterprise" },
  ]);

  const toggle = (key: string) => setFlags((f) => f.map((flag) => flag.key === key ? { ...flag, enabled: !flag.enabled } : flag));

  return (
    <div className="max-w-2xl space-y-3">
      {flags.map((flag) => (
        <div key={flag.key} className="flex items-center justify-between p-4 rounded-xl bg-white border border-[#DCE2EF] shadow-sm">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[13px] font-medium text-[#1C1F3A]">{flag.label}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F0F2F8] text-[#8A90A8] font-mono">{flag.env}</span>
            </div>
            <p className="text-[12px] text-[#8A90A8]">{flag.desc}</p>
          </div>
          <button
            onClick={() => toggle(flag.key)}
            className="relative rounded-full transition-colors ml-4 shrink-0"
            style={{ width: 40, height: 22, background: flag.enabled ? "#293055" : "#DCE2EF" }}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${flag.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("customers");

  // Role gate — redirect non-founders immediately
  useEffect(() => {
    if (!isLoaded) return;
    const email = user?.primaryEmailAddress?.emailAddress ?? "";
    if (email.toLowerCase() !== FOUNDER_EMAIL) {
      navigate("/dashboard");
    }
  }, [isLoaded, user, navigate]);

  if (!isLoaded) return null;

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  if (email.toLowerCase() !== FOUNDER_EMAIL) return null;

  return (
    <AppLayout activePage="admin">
      <div className="flex flex-col h-full bg-[#FCFAFA]">
        <header className="flex-shrink-0 px-8 pt-8 pb-6 border-b border-[#DCE2EF]">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={16} className="text-[#E75D50]" />
            <h1 className="text-2xl font-semibold tracking-tight text-[#1C1F3A]">Admin</h1>
            <span className="px-2 py-0.5 rounded-full bg-[rgba(231,93,80,0.10)] text-[#E75D50] text-[11px] font-semibold">Founder only</span>
          </div>
          <p className="text-sm text-[#6B7080]">Platform management. Not visible to customers.</p>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <nav className="w-48 flex-shrink-0 border-r border-[#DCE2EF] pt-4 px-3">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-[13px] mb-1 transition-all ${activeTab === tab.id ? "bg-[rgba(231,93,80,0.08)] text-[#E75D50] font-medium" : "text-[#6B7080] hover:bg-[#F0F2F8] hover:text-[#1C1F3A]"}`}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto p-8">
            {activeTab === "customers" && <CustomersTab />}
            {activeTab === "enquiries" && <EnquiriesTab />}
            {activeTab === "licences" && (
              <div className="text-[13px] text-[#8A90A8] rounded-xl border border-[#DCE2EF] bg-white p-6">
                Licence management — plan overrides and custom contracts. Coming soon.
              </div>
            )}
            {activeTab === "ai-usage" && <AiUsageTab />}
            {activeTab === "crawl" && <CrawlTab />}
            {activeTab === "health" && <HealthTab />}
            {activeTab === "flags" && <FlagsTab />}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
