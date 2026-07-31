import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuthFetch } from "@/lib/useAuthFetch";
import {
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Mail,
} from "lucide-react";

type AuthFetch = ReturnType<typeof useAuthFetch>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Dark card style
const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 12,
};

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl p-5" style={card}>
      <div className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: "rgba(255,255,255,0.38)" }}>{label}</div>
      <div className="text-[28px] font-bold" style={{ color: color ?? "white" }}>{value}</div>
    </div>
  );
}

// ── Customers tab ─────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  email: string;
  name?: string;
  created: number;
  activeSubscription: boolean;
  subscriptionStatus?: string;
  planName?: string;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  trialEnd?: number;
  athleteCount?: number;
}

function CustomersTab({ authFetch }: { authFetch: AuthFetch }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/api/admin/customers")
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active = customers.filter((c) => c.activeSubscription).length;
  const trialing = customers.filter((c) => c.subscriptionStatus === "trialing").length;
  const canceling = customers.filter((c) => c.cancelAtPeriodEnd).length;

  if (loading) return (
    <div className="flex items-center gap-2 text-[13px] py-8" style={{ color: "rgba(255,255,255,0.40)" }}>
      <Loader2 size={14} className="animate-spin" /> Loading customers…
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total customers" value={String(customers.length)} />
        <StatCard label="Active subscriptions" value={String(active)} color="#4ade80" />
        <StatCard label="Cancelling" value={String(canceling)} color={canceling > 0 ? "#fbbf24" : undefined} />
      </div>

      {customers.length === 0 ? (
        <div className="rounded-xl p-10 text-center text-[13px]" style={{ ...card, color: "rgba(255,255,255,0.35)" }}>
          No customers yet.
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={card}>
          <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] px-5 py-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.28)", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
            <div>Customer</div>
            <div>Plan</div>
            <div>Athletes</div>
            <div>Status</div>
            <div>Joined</div>
          </div>
          {customers.map((c) => {
            const statusColor = c.subscriptionStatus === "active" ? "#4ade80"
              : c.subscriptionStatus === "trialing" ? "#fbbf24"
              : c.subscriptionStatus === "past_due" ? "#f87171"
              : "rgba(255,255,255,0.35)";
            return (
              <div key={c.id} className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] px-5 py-4 items-center transition-colors" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <div className="text-[13px] font-medium text-white">{c.name || "—"}</div>
                  <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.40)" }}>{c.email}</div>
                </div>
                <div className="text-[12px]" style={{ color: "rgba(255,255,255,0.65)" }}>{c.planName ?? "—"}</div>
                <div className="text-[12px]" style={{ color: "rgba(255,255,255,0.55)" }}>{c.athleteCount ?? "—"}</div>
                <div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: statusColor, background: `${statusColor}15` }}>
                    {c.subscriptionStatus ?? "none"}
                    {c.cancelAtPeriodEnd ? " (cancelling)" : ""}
                  </span>
                </div>
                <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {new Date(c.created * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Enquiries tab ─────────────────────────────────────────────────────────────

interface Enquiry {
  id: number;
  name: string;
  email: string;
  org?: string;
  role?: string;
  athletes?: string;
  message?: string;
  type: string;
  status: string;
  createdAt: string;
}

const ENQUIRY_TYPE_LABELS: Record<string, string> = { demo: "Demo", sales: "Sales", general: "General" };
const ENQUIRY_STATUS_OPTIONS = ["new", "read", "replied"];

function EnquiriesTab({ authFetch }: { authFetch: AuthFetch }) {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await authFetch("/api/admin/enquiries");
      const d = await r.json();
      setEnquiries(d.enquiries ?? []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: number, status: string) => {
    setEnquiries((prev) => prev.map((e) => e.id === id ? { ...e, status } : e));
    await authFetch(`/api/admin/enquiries/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  };

  if (loading) return (
    <div className="flex items-center gap-2 text-[13px] py-8" style={{ color: "rgba(255,255,255,0.40)" }}>
      <Loader2 size={14} className="animate-spin" /> Loading enquiries…
    </div>
  );

  const newCount = enquiries.filter((e) => e.status === "new").length;

  const typeColor = (type: string) => type === "demo" ? "#C8BDFF" : type === "sales" ? "#B9FF4A" : "rgba(255,255,255,0.40)";
  const statusBadge = (status: string) => status === "new"
    ? { color: "#fbbf24", bg: "rgba(251,191,36,0.10)" }
    : status === "read"
    ? { color: "#C8BDFF", bg: "rgba(200,189,255,0.10)" }
    : { color: "#4ade80", bg: "rgba(74,222,128,0.10)" };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total enquiries" value={String(enquiries.length)} />
        <StatCard label="New (unread)" value={String(newCount)} color={newCount > 0 ? "#fbbf24" : undefined} />
        <StatCard label="Replied" value={String(enquiries.filter((e) => e.status === "replied").length)} color="#4ade80" />
      </div>

      {enquiries.length === 0 ? (
        <div className="rounded-xl p-10 text-center text-[13px]" style={{ ...card, color: "rgba(255,255,255,0.35)" }}>
          No enquiries yet. Submissions from the contact form will appear here.
        </div>
      ) : (
        <div className="space-y-2">
          {enquiries.map((e) => {
            const sb = statusBadge(e.status);
            return (
              <div key={e.id} className="rounded-xl overflow-hidden" style={card}>
                <div className="flex items-center gap-3 px-5 py-4 cursor-pointer transition-colors" onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                  onMouseEnter={(el) => el.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                  onMouseLeave={(el) => el.currentTarget.style.background = "transparent"}
                >
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0" style={{ color: typeColor(e.type), background: `${typeColor(e.type)}15`, border: `1px solid ${typeColor(e.type)}25` }}>
                    {ENQUIRY_TYPE_LABELS[e.type] ?? e.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-medium text-white">{e.name}</span>
                    <span className="text-[12px] ml-2" style={{ color: "rgba(255,255,255,0.40)" }}>{e.org}</span>
                    {e.message && (
                      <span className="text-[12px] ml-2 truncate hidden sm:inline" style={{ color: "rgba(255,255,255,0.28)" }}>
                        — {e.message.slice(0, 80)}{e.message.length > 80 ? "…" : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.28)" }}>{timeAgo(e.createdAt)}</span>
                    <select
                      value={e.status}
                      onClick={(ev) => ev.stopPropagation()}
                      onChange={(ev) => updateStatus(e.id, ev.target.value)}
                      className="text-[11px] font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none"
                      style={{ color: sb.color, background: sb.bg }}
                    >
                      {ENQUIRY_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {expanded === e.id && (
                  <div className="px-5 py-4 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                    <div className="grid grid-cols-3 gap-4 text-[12px]">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.30)" }}>Email</div>
                        <a href={`mailto:${e.email}`} style={{ color: "#C8BDFF" }}>{e.email}</a>
                      </div>
                      {e.role && (
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.30)" }}>Role</div>
                          <div className="text-white">{e.role}</div>
                        </div>
                      )}
                      {e.athletes && (
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.30)" }}>Roster size</div>
                          <div className="text-white">{e.athletes}</div>
                        </div>
                      )}
                    </div>
                    {e.message && (
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.30)" }}>Message</div>
                        <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.65)" }}>{e.message}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3 pt-1">
                      <a href={`mailto:${e.email}?subject=Re: Your Athlete Intelligence enquiry`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                        style={{ background: "#B9FF4A", color: "#0D1C0B" }}
                      >
                        <Mail size={12} /> Reply by email
                      </a>
                      <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.30)" }}>Received {formatDate(e.createdAt)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── AI Usage tab ──────────────────────────────────────────────────────────────

function AiUsageTab() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl p-6" style={card}>
        <h3 className="text-[13px] font-semibold text-white mb-1">AI usage telemetry</h3>
        <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.45)" }}>LLM call volumes, token consumption, and crawler activity metrics will appear here once the analytics pipeline is connected.</p>
      </div>
    </div>
  );
}

// ── Crawl tab ─────────────────────────────────────────────────────────────────

function CrawlTab({ authFetch }: { authFetch: AuthFetch }) {
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<{ found: number; skipped: number; total: number } | null>(null);
  const [backfillError, setBackfillError] = useState<string | null>(null);

  const [socialFilling, setSocialFilling] = useState(false);
  const [socialResult, setSocialResult] = useState<{ updated: number; notFound: number; total: number; results: { name: string; instagram?: string; twitter?: string; tiktok?: string }[] } | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);

  const [athletes, setAthletes] = useState<{ id: number; name: string; sport: string; intelligenceCount: number; lastCrawledAt: string | null }[]>([]);
  const [repopulating, setRepopulating] = useState<Record<number, boolean>>({});
  const [repopulateNote, setRepopulateNote] = useState<Record<number, string>>({});

  useEffect(() => {
    authFetch("/api/athletes").then(r => r.json()).then(d => setAthletes(d ?? [])).catch(() => {});
  }, []);

  const repopulate = async (id: number) => {
    setRepopulating(p => ({ ...p, [id]: true }));
    setRepopulateNote(p => ({ ...p, [id]: "" }));
    try {
      const r = await authFetch(`/api/admin/repopulate/${id}`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      setRepopulateNote(p => ({ ...p, [id]: "Running in background…" }));
      const start = Date.now();
      const poll = setInterval(async () => {
        if (Date.now() - start > 90000) { clearInterval(poll); setRepopulateNote(p => ({ ...p, [id]: "Timed out — may still be running" })); return; }
        const ar = await authFetch(`/api/athletes/${id}`);
        if (!ar.ok) return;
        const a = await ar.json();
        if (a.lastCrawledAt) {
          clearInterval(poll);
          setAthletes(prev => prev.map(x => x.id === id ? { ...x, intelligenceCount: a.intelligenceCount ?? x.intelligenceCount, lastCrawledAt: a.lastCrawledAt } : x));
          setRepopulateNote(p => ({ ...p, [id]: `Done — ${a.intelligenceCount ?? "?"} items` }));
          setRepopulating(prev => ({ ...prev, [id]: false }));
        }
      }, 4000);
    } catch (e: any) {
      setRepopulateNote(p => ({ ...p, [id]: e.message }));
      setRepopulating(prev => ({ ...prev, [id]: false }));
    }
  };

  const runBackfill = async () => {
    setBackfilling(true);
    setBackfillResult(null);
    setBackfillError(null);
    try {
      const r = await authFetch("/api/admin/backfill-photos", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Backfill failed");
      setBackfillResult(d);
    } catch (e: any) {
      setBackfillError(e.message);
    } finally {
      setBackfilling(false);
    }
  };

  const runSocialBackfill = async () => {
    setSocialFilling(true);
    setSocialResult(null);
    setSocialError(null);
    try {
      const r = await authFetch("/api/admin/backfill-social", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Social backfill failed");
      setSocialResult(d);
    } catch (e: any) {
      setSocialError(e.message);
    } finally {
      setSocialFilling(false);
    }
  };

  const sectionCard: React.CSSProperties = { ...card, padding: 24, marginBottom: 0 };

  return (
    <div className="space-y-4">
      <div style={sectionCard}>
        <h3 className="text-[13px] font-semibold text-white mb-1">Crawl monitor</h3>
        <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.45)" }}>Live agent job status, queue depth, and crawl latency will appear here once the background crawl service reporting is connected.</p>
      </div>

      {/* Photo backfill */}
      <div style={sectionCard}>
        <h3 className="text-[13px] font-semibold text-white mb-1">Backfill athlete photos</h3>
        <p className="text-[13px] mb-4" style={{ color: "rgba(255,255,255,0.45)" }}>
          Runs a Wikipedia lookup for every athlete that has no profile photo. Uses a search fallback for athletes without a direct Wikipedia page. Safe to run multiple times — skips athletes that already have a photo.
        </p>
        <div className="flex items-center gap-3">
          <button onClick={runBackfill} disabled={backfilling}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-60"
            style={{ background: "#B9FF4A", color: "#0D1C0B" }}
          >
            {backfilling ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {backfilling ? "Searching Wikipedia…" : "Backfill Photos"}
          </button>
          {backfillResult && (
            <span className="text-[13px] font-medium flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 size={14} />
              {backfillResult.found} photo{backfillResult.found !== 1 ? "s" : ""} found from {backfillResult.total} athletes
              {backfillResult.skipped > 0 && <span className="font-normal" style={{ color: "rgba(255,255,255,0.35)" }}>({backfillResult.skipped} no Wikipedia page)</span>}
            </span>
          )}
          {backfillError && (
            <span className="text-[13px] text-red-400 flex items-center gap-1.5">
              <XCircle size={14} /> {backfillError}
            </span>
          )}
        </div>
      </div>

      {/* Social stats backfill */}
      <div style={sectionCard}>
        <h3 className="text-[13px] font-semibold text-white mb-1">Backfill social media stats</h3>
        <p className="text-[13px] mb-4" style={{ color: "rgba(255,255,255,0.45)" }}>
          Uses Perplexity live web search to find each athlete's Instagram, Twitter/X and TikTok handles and follower counts from sports media, influencer directories, and team pages. Overwrites existing values with the latest found data.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={runSocialBackfill} disabled={socialFilling}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-60"
            style={{ background: "#B9FF4A", color: "#0D1C0B" }}
          >
            {socialFilling ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {socialFilling ? "Searching social media…" : "Backfill Social Stats"}
          </button>
          {socialResult && (
            <span className="text-[13px] font-medium flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 size={14} />
              {socialResult.updated} of {socialResult.total} athletes updated
              {socialResult.notFound > 0 && <span className="font-normal" style={{ color: "rgba(255,255,255,0.35)" }}>({socialResult.notFound} not found)</span>}
            </span>
          )}
          {socialError && (
            <span className="text-[13px] text-red-400 flex items-center gap-1.5">
              <XCircle size={14} /> {socialError}
            </span>
          )}
        </div>
        {socialResult && socialResult.results.length > 0 && (
          <div className="mt-4 rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.09)" }}>
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                  {["Athlete", "Instagram", "Twitter/X", "TikTok"].map(h => (
                    <th key={h} className="text-left px-4 py-2 font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {socialResult.results.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td className="px-4 py-2 font-medium text-white">{r.name}</td>
                    <td className="px-4 py-2" style={{ color: "rgba(255,255,255,0.55)" }}>{r.instagram ? `@${r.instagram}` : "—"}</td>
                    <td className="px-4 py-2" style={{ color: "rgba(255,255,255,0.55)" }}>{r.twitter ? `@${r.twitter}` : "—"}</td>
                    <td className="px-4 py-2" style={{ color: "rgba(255,255,255,0.55)" }}>{r.tiktok ? `@${r.tiktok}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Per-athlete intelligence repopulate */}
      <div style={sectionCard}>
        <h3 className="text-[13px] font-semibold text-white mb-1">Repopulate athlete intelligence</h3>
        <p className="text-[13px] mb-4" style={{ color: "rgba(255,255,255,0.45)" }}>
          Wipes and re-runs the Perplexity + AI intelligence pipeline for a specific athlete. Use when an athlete's feed is empty or contains "not found" placeholders. Takes ~30–60 s per athlete.
        </p>
        {athletes.length === 0 ? (
          <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.30)" }}>Loading athletes…</p>
        ) : (
          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.09)" }}>
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                  {["Athlete", "Sport", "Items", "Last crawled", ""].map((h, i) => (
                    <th key={i} className="text-left px-4 py-2 font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {athletes.map((a) => (
                  <tr key={a.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td className="px-4 py-2 font-medium text-white">{a.name}</td>
                    <td className="px-4 py-2" style={{ color: "rgba(255,255,255,0.55)" }}>{a.sport ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span style={{ color: a.intelligenceCount === 0 ? "#f87171" : "rgba(255,255,255,0.55)", fontWeight: a.intelligenceCount === 0 ? 600 : 400 }}>
                        {a.intelligenceCount}
                      </span>
                    </td>
                    <td className="px-4 py-2" style={{ color: "rgba(255,255,255,0.40)" }}>
                      {a.lastCrawledAt ? timeAgo(a.lastCrawledAt) : <span style={{ color: "rgba(248,113,113,0.80)" }}>Never</span>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {repopulateNote[a.id] && (
                          <span className="text-[11px]" style={{ color: repopulateNote[a.id].startsWith("Done") ? "#4ade80" : "rgba(255,255,255,0.40)" }}>
                            {repopulateNote[a.id]}
                          </span>
                        )}
                        <button
                          onClick={() => repopulate(a.id)}
                          disabled={repopulating[a.id]}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-60"
                          style={{ background: "rgba(185,255,74,0.10)", color: "#B9FF4A", border: "1px solid rgba(185,255,74,0.20)" }}
                        >
                          {repopulating[a.id] ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                          {repopulating[a.id] ? "Running…" : "Repopulate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Health tab ────────────────────────────────────────────────────────────────

function HealthTab({ authFetch }: { authFetch: AuthFetch }) {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/api/admin/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center gap-2 text-[13px] py-8" style={{ color: "rgba(255,255,255,0.40)" }}>
      <Loader2 size={14} className="animate-spin" /> Loading health data…
    </div>
  );

  if (!health) return (
    <div className="text-[13px] py-8" style={{ color: "rgba(255,255,255,0.40)" }}>No health data available.</div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Database" value={health.db === "ok" ? "OK" : "Error"} color={health.db === "ok" ? "#4ade80" : "#f87171"} />
        <StatCard label="API" value={health.api === "ok" ? "OK" : "Error"} color={health.api === "ok" ? "#4ade80" : "#f87171"} />
        <StatCard label="Env" value={health.env === "ok" ? "OK" : "Missing vars"} color={health.env === "ok" ? "#4ade80" : "#fbbf24"} />
      </div>
      {health.details && (
        <div className="rounded-xl p-5" style={card}>
          <pre className="text-[12px] font-mono leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.60)" }}>
            {JSON.stringify(health.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Feature flags tab ─────────────────────────────────────────────────────────

function FlagsTab({ authFetch }: { authFetch: AuthFetch }) {
  const [flags, setFlags] = useState<{ key: string; value: string; description?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    authFetch("/api/admin/flags")
      .then((r) => r.json())
      .then((d) => {
        setFlags(d.flags ?? []);
        const initDrafts: Record<string, string> = {};
        (d.flags ?? []).forEach((f: any) => { initDrafts[f.key] = f.value; });
        setDrafts(initDrafts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async (key: string) => {
    setSaving(key);
    try {
      await authFetch(`/api/admin/flags/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: drafts[key] }),
      });
      setFlags((prev) => prev.map((f) => f.key === key ? { ...f, value: drafts[key] } : f));
    } finally {
      setSaving(null);
    }
  };

  if (loading) return (
    <div className="flex items-center gap-2 text-[13px] py-8" style={{ color: "rgba(255,255,255,0.40)" }}>
      <Loader2 size={14} className="animate-spin" /> Loading flags…
    </div>
  );

  if (!flags.length) return (
    <div className="text-[13px] py-8" style={{ color: "rgba(255,255,255,0.40)" }}>No feature flags configured.</div>
  );

  return (
    <div className="rounded-xl overflow-hidden" style={card}>
      {flags.map((f, i) => (
        <div key={f.key} className="px-5 py-4 flex items-start gap-4" style={i < flags.length - 1 ? { borderBottom: "1px solid rgba(255,255,255,0.07)" } : {}}>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-white mb-0.5">{f.key}</div>
            {f.description && <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.40)" }}>{f.description}</div>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              value={drafts[f.key] ?? f.value}
              onChange={(e) => setDrafts((d) => ({ ...d, [f.key]: e.target.value }))}
              className="px-3 py-1.5 rounded-lg text-[12px] w-32 focus:outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.85)" }}
            />
            <button
              onClick={() => save(f.key)}
              disabled={saving === f.key || drafts[f.key] === f.value}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50"
              style={{ background: "#B9FF4A", color: "#0D1C0B" }}
            >
              {saving === f.key ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Admin page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "customers", label: "Customers" },
  { id: "enquiries", label: "Enquiries" },
  { id: "ai_usage",  label: "AI Usage" },
  { id: "crawl",     label: "Crawl Tools" },
  { id: "health",    label: "Health" },
  { id: "flags",     label: "Feature Flags" },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("customers");
  const authFetch = useAuthFetch();

  return (
    <AppLayout activePage="admin" enforceSubscription={false}>
      <div className="flex flex-col h-full" style={{ background: "#0D1C0B" }}>
        {/* Header */}
        <header className="flex-shrink-0 px-8 pt-8 pb-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">Admin</h1>
          <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.40)" }}>Internal tools and platform management.</p>

          {/* Tab bar */}
          <div className="flex items-center gap-6">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="pb-3 pt-1 text-[13px] font-medium transition-colors relative"
                  style={{ color: isActive ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.38)" }}
                >
                  {tab.label}
                  {isActive && <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full" style={{ background: "#B9FF4A" }} />}
                </button>
              );
            })}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 hide-scrollbar">
          {activeTab === "customers"  && <CustomersTab  authFetch={authFetch} />}
          {activeTab === "enquiries"  && <EnquiriesTab  authFetch={authFetch} />}
          {activeTab === "ai_usage"   && <AiUsageTab />}
          {activeTab === "crawl"      && <CrawlTab      authFetch={authFetch} />}
          {activeTab === "health"     && <HealthTab     authFetch={authFetch} />}
          {activeTab === "flags"      && <FlagsTab      authFetch={authFetch} />}
        </div>
      </div>
    </AppLayout>
  );
}
