import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Shield, Users, CreditCard, Zap, Activity, Server, GitBranch, MessageSquare } from "lucide-react";

type Tab = "customers" | "licences" | "ai-usage" | "crawl" | "health" | "flags" | "feedback";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "customers", label: "Customers", icon: <Users size={13} /> },
  { id: "licences", label: "Licences", icon: <CreditCard size={13} /> },
  { id: "ai-usage", label: "AI Usage", icon: <Zap size={13} /> },
  { id: "crawl", label: "Crawl Monitor", icon: <Activity size={13} /> },
  { id: "health", label: "Health", icon: <Server size={13} /> },
  { id: "flags", label: "Feature Flags", icon: <GitBranch size={13} /> },
  { id: "feedback", label: "Feedback", icon: <MessageSquare size={13} /> },
];

const MOCK_ORGS = [
  { id: 1, name: "Athletics New Zealand", plan: "Pro", users: 4, athletes: 5, status: "active", mrr: 799, joined: "Jun 2026" },
  { id: 2, name: "Swimming Australia", plan: "Starter", users: 2, athletes: 12, status: "trial", mrr: 0, joined: "Jul 2026" },
  { id: 3, name: "British Athletics", plan: "Enterprise", users: 18, athletes: 87, status: "active", mrr: 2400, joined: "May 2026" },
  { id: 4, name: "Cycling Canada", plan: "Pro", users: 6, athletes: 31, status: "active", mrr: 799, joined: "Jun 2026" },
  { id: 5, name: "Triathlon NZ", plan: "Starter", users: 1, athletes: 8, status: "active", mrr: 299, joined: "Jul 2026" },
];

const PLAN_COLORS: Record<string, string> = {
  Starter: "bg-[#F0F2F8] text-[#6B7080]",
  Pro: "bg-[rgba(52,79,159,0.10)] text-[#344F9F]",
  Enterprise: "bg-[rgba(231,93,80,0.10)] text-[#E75D50]",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-600",
  trial: "bg-amber-50 text-amber-600",
  churned: "bg-red-50 text-red-600",
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

function CustomersTab() {
  const mrr = MOCK_ORGS.filter((o) => o.status === "active").reduce((s, o) => s + o.mrr, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total organisations" value={String(MOCK_ORGS.length)} sub="2 in trial" />
        <StatCard label="Monthly recurring revenue" value={`$${mrr.toLocaleString()}`} sub="All active plans" color="text-emerald-600" />
        <StatCard label="Total athletes tracked" value={String(MOCK_ORGS.reduce((s, o) => s + o.athletes, 0))} sub="Across all orgs" />
        <StatCard label="Total users" value={String(MOCK_ORGS.reduce((s, o) => s + o.users, 0))} sub="Across all orgs" />
      </div>

      <div className="rounded-xl border border-[#DCE2EF] bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-[#DCE2EF]">
          <h3 className="text-[13px] font-semibold text-[#1C1F3A]">All organisations</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#DCE2EF] bg-[#FAFBFF]">
              {["Organisation", "Plan", "Users", "Athletes", "MRR", "Status", "Joined", ""].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-[#8A90A8] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_ORGS.map((org) => (
              <tr key={org.id} className="border-b border-[#F0F2F8] last:border-0 hover:bg-[#FAFBFF]">
                <td className="px-5 py-3.5 text-[13px] font-medium text-[#1C1F3A]">{org.name}</td>
                <td className="px-5 py-3.5"><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${PLAN_COLORS[org.plan]}`}>{org.plan}</span></td>
                <td className="px-5 py-3.5 text-[13px] text-[#6B7080]">{org.users}</td>
                <td className="px-5 py-3.5 text-[13px] text-[#6B7080]">{org.athletes}</td>
                <td className="px-5 py-3.5 text-[13px] font-medium text-[#1C1F3A]">{org.mrr ? `$${org.mrr}` : "—"}</td>
                <td className="px-5 py-3.5"><span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[org.status]}`}>{org.status}</span></td>
                <td className="px-5 py-3.5 text-[12px] text-[#8A90A8]">{org.joined}</td>
                <td className="px-5 py-3.5"><button className="text-[12px] text-[#344F9F] hover:underline font-medium">View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AiUsageTab() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="LLM calls today" value="1,284" sub="↑ 12% vs yesterday" />
        <StatCard label="Tokens used (MTok)" value="4.2" sub="$0.84 est. cost" color="text-[#344F9F]" />
        <StatCard label="Crawler requests" value="8,431" sub="Last 24 hours" />
        <StatCard label="Avg response time" value="1.3s" sub="P95: 3.1s" color="text-emerald-600" />
      </div>

      <div className="rounded-xl border border-[#DCE2EF] bg-white shadow-sm p-5">
        <h3 className="text-[13px] font-semibold text-[#1C1F3A] mb-4">Usage by operation (today)</h3>
        {[
          { op: "Intelligence classification", calls: 642, tokens: "1.8M", cost: "$0.36" },
          { op: "Chat responses", calls: 43, tokens: "0.9M", cost: "$0.18" },
          { op: "Source summarisation", calls: 312, tokens: "0.7M", cost: "$0.14" },
          { op: "Alert generation", calls: 287, tokens: "0.8M", cost: "$0.16" },
        ].map((row) => (
          <div key={row.op} className="flex items-center justify-between py-3 border-b border-[#F0F2F8] last:border-0 text-[13px]">
            <span className="text-[#1C1F3A]">{row.op}</span>
            <div className="flex items-center gap-8 text-right">
              <span className="text-[#6B7080] w-20">{row.calls} calls</span>
              <span className="text-[#6B7080] w-16">{row.tokens}</span>
              <span className="font-medium text-[#1C1F3A] w-12">{row.cost}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CrawlTab() {
  const crawls = [
    { source: "World Athletics", status: "running", queue: 0, failed: 0, last: "2 min ago", interval: "15 min" },
    { source: "Athletics Australia", status: "running", queue: 3, failed: 0, last: "8 min ago", interval: "30 min" },
    { source: "Athletics NZ", status: "idle", queue: 0, failed: 0, last: "22 min ago", interval: "30 min" },
    { source: "World Aquatics", status: "running", queue: 7, failed: 1, last: "4 min ago", interval: "15 min" },
    { source: "UCI Cycling", status: "idle", queue: 0, failed: 2, last: "41 min ago", interval: "1 hr" },
    { source: "Social Media Monitor", status: "running", queue: 14, failed: 0, last: "1 min ago", interval: "5 min" },
  ];
  const statusColors = { running: "text-emerald-500", idle: "text-[#8A90A8]", failed: "text-red-500" };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Active crawlers" value="4" sub="2 idle" color="text-emerald-600" />
        <StatCard label="Queue depth" value="24" sub="Jobs pending" />
        <StatCard label="Failed jobs (24h)" value="3" sub="1.2% failure rate" color="text-amber-600" />
        <StatCard label="Avg crawl time" value="2.1s" sub="Per source" />
      </div>

      <div className="rounded-xl border border-[#DCE2EF] bg-white shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#DCE2EF] bg-[#FAFBFF]">
              {["Source", "Status", "Queue", "Failed", "Last crawl", "Interval", ""].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-[#8A90A8] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {crawls.map((c) => (
              <tr key={c.source} className="border-b border-[#F0F2F8] last:border-0 hover:bg-[#FAFBFF]">
                <td className="px-5 py-3.5 text-[13px] font-medium text-[#1C1F3A]">{c.source}</td>
                <td className="px-5 py-3.5">
                  <span className={`flex items-center gap-1.5 text-[12px] font-medium ${(statusColors as any)[c.status]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.status === "running" ? "bg-emerald-500 animate-pulse" : c.status === "idle" ? "bg-[#DCE2EF]" : "bg-red-500"}`} />
                    {c.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-[13px] text-[#6B7080]">{c.queue}</td>
                <td className="px-5 py-3.5 text-[13px]"><span className={c.failed > 0 ? "text-red-500 font-medium" : "text-[#6B7080]"}>{c.failed}</span></td>
                <td className="px-5 py-3.5 text-[12px] text-[#8A90A8]">{c.last}</td>
                <td className="px-5 py-3.5 text-[12px] text-[#8A90A8]">{c.interval}</td>
                <td className="px-5 py-3.5"><button className="text-[12px] text-[#344F9F] hover:underline font-medium">Force run</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HealthTab() {
  const services = [
    { name: "API Server", status: "healthy", latency: "12ms", uptime: "99.98%" },
    { name: "Database (PostgreSQL)", status: "healthy", latency: "3ms", uptime: "100%" },
    { name: "Background Queue", status: "healthy", latency: "—", uptime: "99.95%" },
    { name: "Crawler Service", status: "degraded", latency: "2.1s", uptime: "99.1%" },
    { name: "AI Gateway (LLM)", status: "healthy", latency: "820ms", uptime: "99.9%" },
    { name: "Auth (Clerk)", status: "healthy", latency: "45ms", uptime: "99.99%" },
  ];
  const statusColors = { healthy: "text-emerald-500 bg-emerald-50", degraded: "text-amber-600 bg-amber-50", down: "text-red-500 bg-red-50" };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        {services.map((s) => (
          <div key={s.name} className="p-4 rounded-xl bg-white border border-[#DCE2EF] shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-medium text-[#1C1F3A]">{s.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${(statusColors as any)[s.status]}`}>{s.status}</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-[#8A90A8]">
              <span>Latency: <strong className="text-[#6B7080]">{s.latency}</strong></span>
              <span>Uptime: <strong className="text-[#6B7080]">{s.uptime}</strong></span>
            </div>
          </div>
        ))}
      </div>
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
            className={`relative rounded-full transition-colors ml-4 shrink-0`}
            style={{ width: 40, height: 22, background: flag.enabled ? "#293055" : "#DCE2EF" }}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${flag.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
      ))}
    </div>
  );
}

function FeedbackTab() {
  const items = [
    { type: "bug", user: "alex@orgA.com", message: "Dossier page crashes when athlete has no competitions", status: "open", time: "2h ago" },
    { type: "feature", user: "jordan@orgB.com", message: "Can we filter the intelligence feed by confidence score?", status: "reviewing", time: "1d ago" },
    { type: "feature", user: "morgan@orgC.com", message: "Would love a PDF export for athlete dossiers", status: "planned", time: "3d ago" },
    { type: "bug", user: "sarah@orgD.com", message: "Import fails silently when name column has trailing spaces", status: "resolved", time: "5d ago" },
  ];
  const typeColor = { bug: "bg-red-50 text-red-600", feature: "bg-blue-50 text-blue-600" };
  const statusColor: Record<string, string> = { open: "bg-amber-50 text-amber-600", reviewing: "bg-blue-50 text-blue-600", planned: "bg-purple-50 text-purple-600", resolved: "bg-emerald-50 text-emerald-600" };

  return (
    <div className="space-y-3 max-w-2xl">
      {items.map((item, i) => (
        <div key={i} className="p-4 rounded-xl bg-white border border-[#DCE2EF] shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${(typeColor as any)[item.type]}`}>{item.type}</span>
            <span className="text-[11px] text-[#8A90A8]">{item.user}</span>
            <span className="text-[11px] text-[#A0A8C0] ml-auto">{item.time}</span>
          </div>
          <p className="text-[13px] text-[#1C1F3A] mb-2">{item.message}</p>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor[item.status]}`}>{item.status}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("customers");

  return (
    <AppLayout activePage="admin">
      <div className="flex flex-col h-full bg-[#FCFAFA]">
        <header className="flex-shrink-0 px-8 pt-8 pb-6 border-b border-[#DCE2EF]">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={16} className="text-[#E75D50]" />
            <h1 className="text-2xl font-semibold tracking-tight text-[#1C1F3A]">Admin</h1>
            <span className="px-2 py-0.5 rounded-full bg-[rgba(231,93,80,0.10)] text-[#E75D50] text-[11px] font-semibold">Founder only</span>
          </div>
          <p className="text-sm text-[#6B7080]">Internal platform management. Not visible to customers.</p>
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
            {activeTab === "licences" && (
              <div className="text-[13px] text-[#8A90A8]">Licence management — showing customer plans, overrides, and custom contracts. Coming soon.</div>
            )}
            {activeTab === "ai-usage" && <AiUsageTab />}
            {activeTab === "crawl" && <CrawlTab />}
            {activeTab === "health" && <HealthTab />}
            {activeTab === "flags" && <FlagsTab />}
            {activeTab === "feedback" && <FeedbackTab />}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
