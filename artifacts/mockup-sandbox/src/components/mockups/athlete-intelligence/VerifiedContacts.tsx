import React, { useState } from "react";
import { AppLayout } from "./_shared/AppLayout";
import "./_group.css";
import {
  MapPin,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Clock,
  Sparkles,
  Link2,
  Globe,
  Mail,
  Phone,
  Building2,
  UserCheck,
  Trophy,
  Megaphone,
  Download,
  Search,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type VerificationStatus = "verified" | "unconfirmed" | "historical";

interface SourceEntry {
  domain: string;
  url: string;
  excerpt: string;
  dateFound: string;
  dateVerified: string;
}

interface Contact {
  id: string;
  role: string;
  category: string;
  name: string;
  org: string;
  orgType: string;
  status: VerificationStatus;
  confidence: number;
  lastVerified: string;
  dateDiscovered: string;
  publicEmail?: string;
  website?: string;
  note?: string;
  sources: SourceEntry[];
}

// ─── Data ────────────────────────────────────────────────────────────────────

const contacts: Contact[] = [
  {
    id: "c1",
    role: "Athlete Manager",
    category: "Management",
    name: "James Whitfield",
    org: "Elite Sport Management NZ",
    orgType: "Sports Management Agency",
    status: "verified",
    confidence: 97,
    lastVerified: "12 Mar 2024",
    dateDiscovered: "08 Jan 2024",
    website: "elitesportnz.co.nz",
    note: "Primary point of contact for commercial, sponsorship and media enquiries.",
    sources: [
      {
        domain: "athletics.org.nz",
        url: "athletics.org.nz/athletes/lola-anderson",
        excerpt: "Anderson is represented by James Whitfield of Elite Sport Management NZ, confirmed by the athlete's official Athletics NZ profile.",
        dateFound: "08 Jan 2024",
        dateVerified: "12 Mar 2024",
      },
      {
        domain: "nzherald.co.nz",
        url: "nzherald.co.nz/sport/2024/03/12/lola-anderson",
        excerpt: "Enquiries directed to Elite Sport Management NZ, whose principal James Whitfield spoke on behalf of the athlete.",
        dateFound: "12 Mar 2024",
        dateVerified: "12 Mar 2024",
      },
    ],
  },
  {
    id: "c2",
    role: "Management Agency",
    category: "Management",
    name: "Elite Sport Management NZ",
    org: "Elite Sport Management NZ",
    orgType: "Agency",
    status: "verified",
    confidence: 97,
    lastVerified: "12 Mar 2024",
    dateDiscovered: "08 Jan 2024",
    website: "elitesportnz.co.nz",
    publicEmail: "info@elitesportnz.co.nz",
    note: "Athlete's registered management agency. Commercial and media enquiries should be directed here.",
    sources: [
      {
        domain: "athletics.org.nz",
        url: "athletics.org.nz/athletes/lola-anderson",
        excerpt: "Athlete's management contact listed as Elite Sport Management NZ on official ANZ athlete profile.",
        dateFound: "08 Jan 2024",
        dateVerified: "12 Mar 2024",
      },
    ],
  },
  {
    id: "c3",
    role: "National Sporting Organisation",
    category: "Sporting Bodies",
    name: "Athletics New Zealand",
    org: "Athletics New Zealand",
    orgType: "National Sporting Organisation",
    status: "verified",
    confidence: 100,
    lastVerified: "01 Mar 2024",
    dateDiscovered: "01 Jan 2024",
    website: "athletics.org.nz",
    publicEmail: "enquiries@athletics.org.nz",
    note: "National governing body. Competition and selection enquiries should be directed here.",
    sources: [
      {
        domain: "athletics.org.nz",
        url: "athletics.org.nz/athletes/lola-anderson",
        excerpt: "Lola Anderson is a registered Athletics New Zealand athlete — national programme affiliation confirmed.",
        dateFound: "01 Jan 2024",
        dateVerified: "01 Mar 2024",
      },
    ],
  },
  {
    id: "c4",
    role: "High Performance Programme",
    category: "Sporting Bodies",
    name: "Athletics NZ High Performance",
    org: "Athletics New Zealand",
    orgType: "Programme",
    status: "verified",
    confidence: 95,
    lastVerified: "28 Feb 2024",
    dateDiscovered: "15 Jan 2024",
    website: "athletics.org.nz/high-performance",
    note: "Anderson is part of the ANZ High Performance sprint programme, confirmed through selection announcement.",
    sources: [
      {
        domain: "athletics.org.nz",
        url: "athletics.org.nz/news/2024-hp-squad",
        excerpt: "Lola Anderson named in the 2024 Athletics NZ High Performance squad for sprints.",
        dateFound: "15 Jan 2024",
        dateVerified: "28 Feb 2024",
      },
    ],
  },
  {
    id: "c5",
    role: "Primary Sponsor",
    category: "Sponsors",
    name: "Puma Athletics Oceania",
    org: "Puma SE (Oceania Division)",
    orgType: "Apparel & Equipment Sponsor",
    status: "unconfirmed",
    confidence: 88,
    lastVerified: "06 Mar 2024",
    dateDiscovered: "06 Mar 2024",
    website: "puma.com/oceania",
    note: "2-year ambassadorship announced March 2024. Direct booking contact not yet publicly confirmed.",
    sources: [
      {
        domain: "sportsbusinessjournal.com",
        url: "sportsbusinessjournal.com/2024/03/puma-anderson",
        excerpt: "Puma is thrilled to welcome Lola Anderson to our elite roster — a 2-year regional ambassadorship for Oceania.",
        dateFound: "06 Mar 2024",
        dateVerified: "06 Mar 2024",
      },
    ],
  },
  {
    id: "c6",
    role: "Former Sponsor",
    category: "Sponsors",
    name: "Nike Oceania",
    org: "Nike, Inc.",
    orgType: "Former Apparel Sponsor",
    status: "historical",
    confidence: 82,
    lastVerified: "01 Dec 2023",
    dateDiscovered: "01 Jun 2022",
    note: "Relationship ended December 2023. Historical record only. No longer a current contact.",
    sources: [
      {
        domain: "athleticsweekly.com",
        url: "athleticsweekly.com/2023/12/anderson-nike",
        excerpt: "Anderson parted ways with Nike at the end of the 2023 season, leaving her kit deal open ahead of 2024.",
        dateFound: "01 Dec 2023",
        dateVerified: "01 Dec 2023",
      },
    ],
  },
  {
    id: "c7",
    role: "Media Contact",
    category: "Media & Booking",
    name: "via Elite Sport Management NZ",
    org: "Elite Sport Management NZ",
    orgType: "Media Enquiries",
    status: "verified",
    confidence: 97,
    lastVerified: "12 Mar 2024",
    dateDiscovered: "08 Jan 2024",
    website: "elitesportnz.co.nz",
    note: "All media requests should be submitted via the management agency. No direct media contact has been publicly listed.",
    sources: [
      {
        domain: "nzherald.co.nz",
        url: "nzherald.co.nz/sport/2024/03/12/lola-anderson",
        excerpt: "Media requests for Lola Anderson should be directed to Elite Sport Management NZ.",
        dateFound: "12 Mar 2024",
        dateVerified: "12 Mar 2024",
      },
    ],
  },
];

const categoryOrder = ["Management", "Sporting Bodies", "Sponsors", "Media & Booking"];

const categoryConfig: Record<string, { icon: React.ReactNode; label: string }> = {
  Management: {
    icon: <UserCheck size={13} />,
    label: "Management & Representation",
  },
  "Sporting Bodies": {
    icon: <Trophy size={13} />,
    label: "National & Sporting Bodies",
  },
  Sponsors: {
    icon: <Megaphone size={13} />,
    label: "Commercial & Sponsors",
  },
  "Media & Booking": {
    icon: <Globe size={13} />,
    label: "Media & Booking",
  },
};

const statusConfig: Record<VerificationStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  verified: {
    label: "Verified",
    color: "#059669",
    bg: "rgba(16,185,129,0.10)",
    border: "rgba(16,185,129,0.22)",
    icon: <CheckCircle2 size={12} />,
  },
  unconfirmed: {
    label: "Unconfirmed",
    color: "#d97706",
    bg: "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.22)",
    icon: <AlertCircle size={12} />,
  },
  historical: {
    label: "Historical",
    color: "#8A90A8",
    bg: "rgba(138,144,168,0.10)",
    border: "rgba(138,144,168,0.20)",
    icon: <XCircle size={12} />,
  },
};

// ─── Main component ───────────────────────────────────────────────────────────

export function VerifiedContacts() {
  const [selectedId, setSelectedId] = useState("c1");
  const [search, setSearch] = useState("");

  const selected = contacts.find((c) => c.id === selectedId) || contacts[0];
  const selectedStatus = statusConfig[selected.status];

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.org.toLowerCase().includes(search.toLowerCase()) ||
      c.role.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = categoryOrder.reduce<Record<string, Contact[]>>((acc, cat) => {
    const items = filtered.filter((c) => c.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  const verifiedCount = contacts.filter((c) => c.status === "verified").length;
  const totalCount = contacts.length;

  return (
    <AppLayout activePage="feed">
      <div className="athlete-intelligence-root h-full flex flex-col bg-[#FCFAFA] overflow-hidden">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

        {/* ── Breadcrumb ── */}
        <div className="h-14 border-b border-[rgba(41,48,85,0.10)] flex items-center px-6 shrink-0 bg-[#FCFAFA]">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#8A90A8]">
            <span className="hover:text-[#3D426A] cursor-pointer transition-colors">Lola Anderson</span>
            <ChevronRight size={14} className="text-[#C0C8DC]" />
            <span className="text-[#293055]">Verified Contacts</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="flex items-center gap-1.5 text-[12px] font-medium text-[#8A90A8] hover:text-[#293055] transition-colors border border-[rgba(41,48,85,0.12)] rounded-lg px-3 py-1.5 bg-white">
              <Download size={12} />
              Export contacts
            </button>
          </div>
        </div>

        {/* ── Profile strip ── */}
        <div className="px-6 py-4 border-b border-[rgba(41,48,85,0.08)] bg-gradient-to-r from-[#F5F0F0] to-[#FCFAFA] shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-[rgba(41,48,85,0.12)] shadow shrink-0 bg-[#E8E0E0]">
                <img src="/__mockup/images/lola-anderson.jpg" className="w-full h-full object-cover" alt="Lola Anderson" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-[16px] font-semibold text-[#1C1F3A]">Lola Anderson</h2>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-[rgba(231,93,80,0.10)] text-[#344F9F] font-semibold border border-[rgba(231,93,80,0.18)]">National Squad</span>
                </div>
                <div className="flex items-center gap-1.5 text-[12px] text-[#7A8090]">
                  <MapPin size={12} />
                  <span>100m / 200m Sprint · Athletics NZ</span>
                  <span className="text-[#C0C8DC] mx-1">·</span>
                  <Link2 size={11} className="text-[#A0A8C0]" />
                  <span className="font-semibold text-[#059669]">{verifiedCount} verified</span>
                  <span className="text-[#C0C8DC]">of {totalCount} contacts</span>
                </div>
              </div>
            </div>

            {/* AI Summary */}
            <div
              className="max-w-sm rounded-xl px-4 py-3 flex items-start gap-2.5"
              style={{ background: "linear-gradient(135deg, #293055, #1e2440)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <Sparkles size={13} style={{ color: "#E75D50", marginTop: 1, flexShrink: 0 }} />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#E75D50" }}>
                  AI Contact Summary
                </div>
                <p className="text-[12px] leading-relaxed" style={{ color: "rgba(252,250,250,0.75)" }}>
                  Represented by <strong style={{ color: "rgba(252,250,250,0.95)" }}>Elite Sport Management NZ</strong>. Commercial and sponsorship enquiries via the agency. Competition matters through <strong style={{ color: "rgba(252,250,250,0.95)" }}>Athletics NZ</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 flex overflow-hidden">

          {/* Left: contact list */}
          <div className="flex flex-col border-r border-[rgba(41,48,85,0.10)] overflow-hidden" style={{ width: 420 }}>
            {/* Search */}
            <div className="px-4 py-3 border-b border-[rgba(41,48,85,0.07)] bg-[#FCFAFA] shrink-0">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9097B0]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search contacts…"
                  className="w-full pl-8 pr-3 py-2 text-[13px] rounded-lg border border-[rgba(41,48,85,0.12)] bg-white text-[#1C1F3A] placeholder-[#A0A8C0] focus:outline-none focus:ring-1 focus:ring-[#E75D50] focus:border-[#E75D50] transition-all"
                />
              </div>
            </div>

            {/* Grouped list */}
            <div className="flex-1 overflow-y-auto hide-scrollbar px-3 py-3">
              {Object.entries(grouped).map(([cat, items]) => {
                const config = categoryConfig[cat];
                return (
                  <div key={cat} className="mb-5">
                    <div className="flex items-center gap-2 px-2 mb-2">
                      <span className="text-[#9097B0]">{config.icon}</span>
                      <span className="text-[11px] font-bold text-[#A0A8C0] uppercase tracking-widest">{config.label}</span>
                    </div>
                    <div className="space-y-1">
                      {items.map((c) => {
                        const st = statusConfig[c.status];
                        const isSelected = c.id === selectedId;
                        return (
                          <button
                            key={c.id}
                            onClick={() => setSelectedId(c.id)}
                            className={`w-full text-left px-3 py-3 rounded-xl border transition-all flex items-start gap-3 ${
                              isSelected
                                ? "bg-[#FEEEEE] border-[rgba(231,93,80,0.22)]"
                                : "bg-white border-[rgba(41,48,85,0.08)] hover:border-[rgba(41,48,85,0.18)]"
                            }`}
                          >
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                              style={{ background: st.bg, color: st.color }}
                            >
                              {st.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] font-semibold text-[#1C1F3A] truncate">{c.name}</div>
                              <div className="text-[11px] text-[#8A90A8] truncate">{c.role}</div>
                              <div className="text-[11px] text-[#9097B0] truncate mt-0.5">{c.org}</div>
                            </div>
                            <div className="shrink-0 flex flex-col items-end gap-1">
                              <span
                                className="text-[10px] font-semibold px-1.5 py-0.5 rounded border"
                                style={{ background: st.bg, color: st.color, borderColor: st.border }}
                              >
                                {st.label}
                              </span>
                              <span className="text-[10px] text-[#A0A8C0] flex items-center gap-1">
                                <ShieldCheck size={9} />
                                {c.confidence}%
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: selected contact detail */}
          <div className="flex-1 overflow-y-auto hide-scrollbar px-8 py-6">

            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded border"
                    style={{ background: selectedStatus.bg, color: selectedStatus.color, borderColor: selectedStatus.border }}
                  >
                    {selectedStatus.icon}
                    {selectedStatus.label}
                  </span>
                  <span className="text-[11px] text-[#A0A8C0] font-medium">{selected.category} · {selected.orgType}</span>
                </div>
                <h2 className="text-[22px] font-semibold text-[#1C1F3A] leading-tight mb-0.5">{selected.name}</h2>
                <div className="text-[14px] text-[#7A8090]">{selected.role} · {selected.org}</div>
              </div>
            </div>

            {/* Confidence + timestamps */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: "Confidence Score", value: `${selected.confidence}%`, icon: <ShieldCheck size={13} className={selected.confidence >= 95 ? "text-[#059669]" : "text-[#d97706]"} /> },
                { label: "Date Discovered", value: selected.dateDiscovered, icon: <Clock size={13} className="text-[#9097B0]" /> },
                { label: "Last Verified", value: selected.lastVerified, icon: <CheckCircle2 size={13} className="text-[#9097B0]" /> },
              ].map((m) => (
                <div key={m.label} className="rounded-xl border border-[rgba(41,48,85,0.09)] bg-white p-4">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#9097B0] mb-1.5">
                    {m.icon}
                    {m.label}
                  </div>
                  <div className="text-[15px] font-bold text-[#1C1F3A]">{m.value}</div>
                </div>
              ))}
            </div>

            {/* Public contact details */}
            {(selected.publicEmail || selected.website) && (
              <div className="rounded-xl border border-[rgba(41,48,85,0.09)] bg-white p-5 mb-4">
                <div className="text-[11px] font-bold uppercase tracking-widest text-[#A0A8C0] mb-3">Public Contact Details</div>
                <div className="space-y-2.5">
                  {selected.website && (
                    <div className="flex items-center gap-3 text-[13px]">
                      <Globe size={14} className="text-[#9097B0] shrink-0" />
                      <span className="text-[#8A90A8]">Website</span>
                      <a href="#" className="text-[#344F9F] font-medium ml-auto flex items-center gap-1 hover:text-[#E75D50] transition-colors">
                        {selected.website} <ExternalLink size={11} />
                      </a>
                    </div>
                  )}
                  {selected.publicEmail && (
                    <div className="flex items-center gap-3 text-[13px]">
                      <Mail size={14} className="text-[#9097B0] shrink-0" />
                      <span className="text-[#8A90A8]">Public Email</span>
                      <span className="text-[#1C1F3A] font-medium ml-auto">{selected.publicEmail}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI note */}
            {selected.note && (
              <div className="rounded-xl border border-[rgba(41,48,85,0.09)] bg-white p-5 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={12} className="text-[#E75D50]" />
                  <div className="text-[11px] font-bold uppercase tracking-widest text-[#A0A8C0]">Contact Guidance</div>
                </div>
                <p className="text-[13px] text-[#6B7080] leading-relaxed">{selected.note}</p>
              </div>
            )}

            {/* Source transparency */}
            <div className="rounded-xl border border-[rgba(41,48,85,0.09)] bg-white p-5 mb-4">
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#A0A8C0] mb-3">
                Source Transparency · {selected.sources.length} source{selected.sources.length !== 1 ? "s" : ""}
              </div>
              <div className="space-y-4">
                {selected.sources.map((src, i) => (
                  <div key={i} className="pb-4 border-b border-[rgba(41,48,85,0.07)] last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded flex items-center justify-center bg-[rgba(41,48,85,0.06)]">
                          <ExternalLink size={10} className="text-[#9097B0]" />
                        </div>
                        <span className="text-[12px] font-semibold text-[#344F9F]">{src.domain}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-[#A0A8C0]">
                        <span>Found {src.dateFound}</span>
                        <span className="text-[#C0C8DC]">·</span>
                        <span>Verified {src.dateVerified}</span>
                      </div>
                    </div>
                    <blockquote className="border-l-2 border-[#DCE2EF] pl-3 py-0.5 text-[12px] text-[#7A8090] leading-relaxed italic">
                      "{src.excerpt}"
                    </blockquote>
                    <a href="#" className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-[#9097B0] hover:text-[#E75D50] transition-colors">
                      <ExternalLink size={10} /> {src.url}
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: "rgba(41,48,85,0.04)", border: "1px solid rgba(41,48,85,0.08)" }}>
              <ShieldCheck size={14} className="text-[#9097B0] mt-0.5 shrink-0" />
              <p className="text-[12px] text-[#8A90A8] leading-relaxed">
                All contact information shown is sourced exclusively from <strong className="text-[#6B7080]">publicly available information</strong>. Private details are never inferred, stored, or displayed. Last platform-wide verification run: <strong className="text-[#6B7080]">today, 06:12 NZST</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
