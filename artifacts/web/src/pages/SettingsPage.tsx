import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useUser, useClerk } from "@clerk/react";
import {
  User, CreditCard, Users, Bell, Zap, Key,
  CheckCircle2, Crown, ChevronRight, Plus, Trash2, Mail, Copy
} from "lucide-react";

type Tab = "profile" | "billing" | "team" | "notifications" | "integrations" | "api";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "profile", label: "Profile", icon: <User size={14} /> },
  { id: "billing", label: "Billing", icon: <CreditCard size={14} /> },
  { id: "team", label: "Team", icon: <Users size={14} /> },
  { id: "notifications", label: "Notifications", icon: <Bell size={14} /> },
  { id: "integrations", label: "Integrations", icon: <Zap size={14} /> },
  { id: "api", label: "API Keys", icon: <Key size={14} /> },
];

const MOCK_TEAM = [
  { id: 1, name: "Alex Thompson", email: "alex@org.com", role: "Owner", avatar: "AT", status: "active" },
  { id: 2, name: "Jordan Lee", email: "jordan@org.com", role: "Admin", avatar: "JL", status: "active" },
  { id: 3, name: "Morgan Davis", email: "morgan@org.com", role: "Analyst", avatar: "MD", status: "active" },
  { id: 4, name: "Casey Williams", email: "casey@org.com", role: "Viewer", avatar: "CW", status: "pending" },
];

const ROLES = ["Owner", "Admin", "Analyst", "Viewer"];
const ROLE_DESC: Record<string, string> = {
  Owner: "Full access — billing, team, all data",
  Admin: "All features — cannot manage billing",
  Analyst: "View and edit athletes, run reports",
  Viewer: "Read-only access to the workspace",
};

function ProfileTab({ user }: { user: any }) {
  const inputCls = "w-full px-3.5 py-2.5 border border-[#DCE2EF] rounded-lg text-[13px] text-[#1C1F3A] bg-white focus:outline-none focus:ring-2 focus:ring-[#E75D50]/30 focus:border-[#E75D50] transition-all";
  const labelCls = "block text-[11px] font-semibold text-[#6B7080] uppercase tracking-wider mb-1.5";

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-5 p-5 rounded-xl bg-white border border-[#DCE2EF] shadow-sm">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#293055] to-[#344F9F] flex items-center justify-center text-white text-xl font-bold">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div>
          <div className="text-[15px] font-semibold text-[#1C1F3A]">{user?.fullName || "User"}</div>
          <div className="text-[13px] text-[#6B7080]">{user?.primaryEmailAddress?.emailAddress}</div>
        </div>
      </div>

      <div className="p-5 rounded-xl bg-white border border-[#DCE2EF] shadow-sm space-y-4">
        <h3 className="text-[13px] font-semibold text-[#1C1F3A]">Personal information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelCls}>First name</label><input defaultValue={user?.firstName || ""} className={inputCls} /></div>
          <div><label className={labelCls}>Last name</label><input defaultValue={user?.lastName || ""} className={inputCls} /></div>
        </div>
        <div><label className={labelCls}>Email address</label><input defaultValue={user?.primaryEmailAddress?.emailAddress || ""} disabled className={inputCls + " opacity-50 cursor-not-allowed"} /></div>
        <div><label className={labelCls}>Organisation name</label><input placeholder="e.g. Athletics New Zealand" className={inputCls} /></div>
        <div><label className={labelCls}>Job title</label><input placeholder="e.g. Performance Director" className={inputCls} /></div>
        <button className="px-4 py-2 rounded-lg bg-[#293055] hover:bg-[#1e2440] text-white text-[13px] font-medium transition-colors">Save changes</button>
      </div>
    </div>
  );
}

function BillingTab() {
  return (
    <div className="max-w-2xl space-y-5">
      {/* Current plan */}
      <div className="p-6 rounded-xl bg-white border border-[#DCE2EF] shadow-sm">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown size={16} className="text-[#E75D50]" />
              <span className="text-[15px] font-semibold text-[#1C1F3A]">Pro Plan</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-600">Active</span>
            </div>
            <p className="text-[13px] text-[#6B7080]">$799 / month · renews 18 Aug 2026</p>
          </div>
          <button className="px-3 py-1.5 rounded-lg border border-[#DCE2EF] text-[12px] font-medium text-[#6B7080] hover:bg-[#F8F9FB] transition-colors">
            Manage billing
          </button>
        </div>

        {/* Usage meters */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-[12px] mb-1.5">
              <span className="text-[#6B7080]">Athletes monitored</span>
              <span className="font-medium text-[#1C1F3A]">5 / 200</span>
            </div>
            <div className="h-1.5 bg-[#EEF0F8] rounded-full overflow-hidden">
              <div className="h-full bg-[#344F9F] rounded-full" style={{ width: "2.5%" }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[12px] mb-1.5">
              <span className="text-[#6B7080]">Team seats used</span>
              <span className="font-medium text-[#1C1F3A]">4 / 15</span>
            </div>
            <div className="h-1.5 bg-[#EEF0F8] rounded-full overflow-hidden">
              <div className="h-full bg-[#344F9F] rounded-full" style={{ width: "26.7%" }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[12px] mb-1.5">
              <span className="text-[#6B7080]">AI queries this month</span>
              <span className="font-medium text-[#1C1F3A]">43 / Unlimited</span>
            </div>
            <div className="h-1.5 bg-[#EEF0F8] rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: "8%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Plan comparison */}
      <div className="p-5 rounded-xl bg-white border border-[#DCE2EF] shadow-sm">
        <h3 className="text-[13px] font-semibold text-[#1C1F3A] mb-4">Available plans</h3>
        {[
          { name: "Starter", price: "$299/mo", athletes: "50 athletes", users: "5 users", current: false },
          { name: "Pro", price: "$799/mo", athletes: "200 athletes", users: "15 users", current: true },
          { name: "Enterprise", price: "Custom", athletes: "Unlimited", users: "Unlimited", current: false },
        ].map((p) => (
          <div key={p.name} className={`flex items-center justify-between p-3.5 rounded-xl mb-2 ${p.current ? "bg-[rgba(231,93,80,0.05)] border border-[rgba(231,93,80,0.25)]" : "bg-[#FAFBFF] border border-[#DCE2EF]"}`}>
            <div className="flex items-center gap-3">
              {p.current ? <CheckCircle2 size={14} className="text-[#E75D50] shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-[#DCE2EF] shrink-0" />}
              <div>
                <span className="text-[13px] font-medium text-[#1C1F3A]">{p.name}</span>
                <span className="text-[12px] text-[#8A90A8] ml-2">{p.athletes} · {p.users}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-semibold text-[#1C1F3A]">{p.price}</span>
              {!p.current && (
                <button className="text-[12px] text-[#344F9F] hover:underline font-medium">
                  {p.name === "Enterprise" ? "Contact sales" : "Switch"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Invoice history */}
      <div className="p-5 rounded-xl bg-white border border-[#DCE2EF] shadow-sm">
        <h3 className="text-[13px] font-semibold text-[#1C1F3A] mb-4">Invoice history</h3>
        {[
          { date: "18 Jul 2026", amount: "$799.00", status: "Paid" },
          { date: "18 Jun 2026", amount: "$799.00", status: "Paid" },
          { date: "18 May 2026", amount: "$799.00", status: "Paid" },
        ].map((inv) => (
          <div key={inv.date} className="flex items-center justify-between py-3 border-b border-[#F0F2F8] last:border-0">
            <div className="text-[13px] text-[#1C1F3A]">{inv.date}</div>
            <div className="flex items-center gap-4">
              <span className="text-[13px] text-[#6B7080]">{inv.amount}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-semibold">{inv.status}</span>
              <button className="text-[12px] text-[#344F9F] hover:underline">Download</button>
            </div>
          </div>
        ))}
        <p className="text-[11px] text-[#A0A8C0] mt-3">Stripe-powered billing — full payment management coming soon.</p>
      </div>
    </div>
  );
}

function TeamTab() {
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Analyst");

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-[#1C1F3A]">Team members</h3>
          <p className="text-[12px] text-[#6B7080] mt-0.5">4 of 15 seats used</p>
        </div>
        <button onClick={() => setShowInvite(!showInvite)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#293055] hover:bg-[#1e2440] text-white text-[13px] font-medium transition-colors">
          <Plus size={14} />{showInvite ? "Cancel" : "Invite member"}
        </button>
      </div>

      {showInvite && (
        <div className="p-5 rounded-xl bg-white border border-[#DCE2EF] shadow-sm">
          <h4 className="text-[13px] font-semibold text-[#1C1F3A] mb-4">Invite a team member</h4>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7080] uppercase tracking-wider mb-1">Email address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A8C0]" />
                <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@org.com" className="w-full pl-8 pr-3 py-2.5 border border-[#DCE2EF] rounded-lg text-[13px] text-[#1C1F3A] bg-[#FAFBFF] focus:outline-none focus:border-[#E75D50] focus:ring-1 focus:ring-[#E75D50]/30 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7080] uppercase tracking-wider mb-1">Role</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-full px-3 py-2.5 border border-[#DCE2EF] rounded-lg text-[13px] text-[#1C1F3A] bg-[#FAFBFF] focus:outline-none focus:border-[#E75D50] focus:ring-1 focus:ring-[#E75D50]/30 transition-all">
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <p className="text-[11px] text-[#8A90A8] mb-4">{ROLE_DESC[inviteRole]}</p>
          <button className="px-4 py-2 rounded-lg bg-[#E75D50] hover:bg-[#D04840] text-white text-[13px] font-medium transition-colors">Send invitation</button>
        </div>
      )}

      {/* Role legend */}
      <div className="grid grid-cols-2 gap-2">
        {ROLES.map((r) => (
          <div key={r} className="flex items-start gap-2 p-3 rounded-lg bg-[#FAFBFF] border border-[#DCE2EF]">
            <div className="text-[12px] font-semibold text-[#293055] w-16 shrink-0">{r}</div>
            <div className="text-[11px] text-[#8A90A8]">{ROLE_DESC[r]}</div>
          </div>
        ))}
      </div>

      {/* Member list */}
      <div className="rounded-xl bg-white border border-[#DCE2EF] shadow-sm overflow-hidden">
        {MOCK_TEAM.map((member, i) => (
          <div key={member.id} className={`flex items-center gap-3 px-5 py-4 ${i > 0 ? "border-t border-[#F0F2F8]" : ""}`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#293055] to-[#344F9F] flex items-center justify-center text-white text-[11px] font-bold shrink-0">
              {member.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-[#1C1F3A] truncate">{member.name}</span>
                {member.status === "pending" && <span className="px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-semibold text-amber-600">Pending</span>}
              </div>
              <div className="text-[11px] text-[#8A90A8]">{member.email}</div>
            </div>
            <select defaultValue={member.role} className="px-2.5 py-1.5 border border-[#DCE2EF] rounded-lg text-[12px] text-[#293055] bg-[#FAFBFF] focus:outline-none disabled:opacity-50" disabled={member.role === "Owner"}>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
            {member.role !== "Owner" && (
              <button className="p-1.5 rounded-lg text-[#A0A8C0] hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
            )}
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

  return (
    <div className="max-w-xl space-y-5">
      <div className="p-5 rounded-xl bg-white border border-[#DCE2EF] shadow-sm">
        <h3 className="text-[13px] font-semibold text-[#1C1F3A] mb-4">Alert frequency by category</h3>
        {[
          { key: "results", label: "Results & Rankings" },
          { key: "media", label: "Media & Interviews" },
          { key: "sponsorships", label: "Sponsorships" },
          { key: "career", label: "Career Changes" },
        ].map((cat) => (
          <div key={cat.key} className="flex items-center justify-between py-3 border-b border-[#F0F2F8] last:border-0">
            <span className="text-[13px] text-[#1C1F3A]">{cat.label}</span>
            <select value={(prefs as any)[cat.key]} onChange={(e) => setPrefs((p) => ({ ...p, [cat.key]: e.target.value }))} className="px-3 py-1.5 border border-[#DCE2EF] rounded-lg text-[12px] text-[#293055] bg-[#FAFBFF] focus:outline-none focus:border-[#E75D50] focus:ring-1 focus:ring-[#E75D50]/30">
              <option value="immediate">Immediate</option>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly summary</option>
              <option value="off">Off</option>
            </select>
          </div>
        ))}
      </div>

      <div className="p-5 rounded-xl bg-white border border-[#DCE2EF] shadow-sm space-y-4">
        <h3 className="text-[13px] font-semibold text-[#1C1F3A]">Delivery channels</h3>
        {[
          { key: "emailDigest", label: "Email digest", desc: "Daily summary of all intelligence updates" },
          { key: "browserPush", label: "Browser push notifications", desc: "Real-time alerts in your browser" },
          { key: "slackAlerts", label: "Slack alerts", desc: "Requires Slack integration (Pro+)" },
        ].map((ch) => (
          <div key={ch.key} className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-medium text-[#1C1F3A]">{ch.label}</div>
              <div className="text-[11px] text-[#8A90A8]">{ch.desc}</div>
            </div>
            <button
              onClick={() => setPrefs((p) => ({ ...p, [ch.key]: !(p as any)[ch.key] }))}
              className={`relative w-10 h-5.5 rounded-full transition-colors ${(prefs as any)[ch.key] ? "bg-[#293055]" : "bg-[#DCE2EF]"}`}
              style={{ height: 22, width: 40 }}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${(prefs as any)[ch.key] ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
        ))}
      </div>

      <button className="px-4 py-2 rounded-lg bg-[#293055] hover:bg-[#1e2440] text-white text-[13px] font-medium transition-colors">Save preferences</button>
    </div>
  );
}

function IntegrationsTab() {
  const integrations = [
    { name: "Slack", desc: "Send alerts and intelligence updates to Slack channels.", icon: "💬", status: "available", plan: "Pro+" },
    { name: "Microsoft Teams", desc: "Push notifications and daily digests to Teams channels.", icon: "🟦", status: "available", plan: "Pro+" },
    { name: "Email", desc: "Customisable email digests and instant alerts.", icon: "📧", status: "connected", plan: "All plans" },
    { name: "Calendar", desc: "Sync competition schedules to Google or Outlook calendar.", icon: "📅", status: "coming-soon", plan: "Pro+" },
    { name: "HubSpot CRM", desc: "Sync athlete contact data and intelligence to HubSpot.", icon: "🔶", status: "coming-soon", plan: "Enterprise" },
    { name: "REST API", desc: "Programmatic access to all intelligence data.", icon: "⚡", status: "coming-soon", plan: "Enterprise" },
  ];

  return (
    <div className="max-w-2xl space-y-3">
      {integrations.map((intg) => (
        <div key={intg.name} className="flex items-center gap-4 p-4 rounded-xl bg-white border border-[#DCE2EF] shadow-sm">
          <span className="text-2xl shrink-0">{intg.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[13px] font-medium text-[#1C1F3A]">{intg.name}</span>
              <span className="text-[10px] font-semibold text-[#8A90A8] px-1.5 py-0.5 rounded-full bg-[#F0F2F8]">{intg.plan}</span>
            </div>
            <p className="text-[12px] text-[#8A90A8]">{intg.desc}</p>
          </div>
          {intg.status === "connected" && <span className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><CheckCircle2 size={12} />Connected</span>}
          {intg.status === "available" && <button className="shrink-0 px-3 py-1.5 rounded-lg border border-[#DCE2EF] text-[12px] font-medium text-[#293055] hover:bg-[#F8F9FB] transition-colors">Connect</button>}
          {intg.status === "coming-soon" && <span className="shrink-0 text-[11px] font-semibold text-[#A0A8C0]">Coming soon</span>}
        </div>
      ))}
    </div>
  );
}

function ApiTab() {
  return (
    <div className="max-w-xl space-y-5">
      <div className="p-5 rounded-xl bg-white border border-[#DCE2EF] shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-[13px] font-semibold text-[#1C1F3A] mb-1">API Keys</h3>
            <p className="text-[12px] text-[#8A90A8]">Use API keys to access intelligence data programmatically. Available on Enterprise plans.</p>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-[#F0F2F8] text-[11px] font-semibold text-[#8A90A8]">Enterprise</span>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#FAFBFF] border border-[#DCE2EF] mb-4">
          <div className="font-mono text-[12px] text-[#6B7080] flex-1">ai_sk_••••••••••••••••••••••••••••••••</div>
          <button className="p-1.5 rounded text-[#A0A8C0] hover:text-[#6B7080] hover:bg-[#F0F2F8] transition-colors"><Copy size={13} /></button>
        </div>

        <div className="space-y-3">
          <button disabled className="w-full py-2.5 rounded-lg border border-[#DCE2EF] text-[13px] font-medium text-[#A0A8C0] cursor-not-allowed flex items-center justify-center gap-2">
            <Plus size={14} />Generate new key
          </button>
          <p className="text-[11px] text-[#A0A8C0] text-center">Upgrade to Enterprise to generate API keys.</p>
        </div>
      </div>

      <div className="p-5 rounded-xl bg-[#FCFAFA] border border-[#DCE2EF]">
        <h4 className="text-[12px] font-semibold text-[#6B7080] mb-2">API documentation</h4>
        <p className="text-[12px] text-[#8A90A8] mb-3">Full REST API with OpenAPI spec, SDKs for Python and JavaScript, and webhook support.</p>
        <button disabled className="text-[12px] text-[#A0A8C0] font-medium cursor-not-allowed">View documentation →</button>
      </div>
    </div>
  );
}

export default function SettingsPage({ initialTab }: { initialTab?: Tab }) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab ?? "profile");
  const { user } = useUser();

  return (
    <AppLayout activePage="settings">
      <div className="flex flex-col h-full bg-[#FCFAFA]">
        <header className="flex-shrink-0 px-8 pt-8 pb-6 border-b border-[#DCE2EF]">
          <h1 className="text-2xl font-semibold tracking-tight text-[#1C1F3A]">Settings</h1>
          <p className="text-sm mt-1 text-[#6B7080]">Manage your account, team, billing, and workspace preferences.</p>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Tab sidebar */}
          <nav className="w-48 flex-shrink-0 border-r border-[#DCE2EF] pt-4 px-3">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-[13px] mb-1 transition-all ${activeTab === tab.id ? "bg-[rgba(231,93,80,0.08)] text-[#E75D50] font-medium" : "text-[#6B7080] hover:bg-[#F0F2F8] hover:text-[#1C1F3A]"}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-8">
            {activeTab === "profile" && <ProfileTab user={user} />}
            {activeTab === "billing" && <BillingTab />}
            {activeTab === "team" && <TeamTab />}
            {activeTab === "notifications" && <NotificationsTab />}
            {activeTab === "integrations" && <IntegrationsTab />}
            {activeTab === "api" && <ApiTab />}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
