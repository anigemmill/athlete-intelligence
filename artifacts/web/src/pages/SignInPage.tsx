import React, { useState, useEffect } from "react";
import { SignIn, useClerk } from "@clerk/react";
import { Play, Activity, Users, Bell, MessageSquare, TrendingUp, ChevronRight } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Mini dashboard preview ────────────────────────────────────────────────────

function DashboardPreview() {
  const athletes = [
    { initials: "SC", name: "Sarah Chen",   sport: "100m Sprint",   rank: 4,  rankDelta: +2, confidence: 91, status: "New PB",  statusColor: "#10B981", bg: "rgba(16,185,129,0.15)",  border: "rgba(16,185,129,0.3)" },
    { initials: "JO", name: "James Okafor", sport: "Decathlon",     rank: 12, rankDelta: -1, confidence: 76, status: "Risk",    statusColor: "#F59E0B", bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.3)" },
    { initials: "MP", name: "Maya Petrov",  sport: "High Jump",     rank: 7,  rankDelta: +3, confidence: 88, status: "Rising",  statusColor: "#B9FF4A", bg: "rgba(185,255,74,0.15)",  border: "rgba(185,255,74,0.3)" },
    { initials: "RL", name: "Ryan Lee",     sport: "400m Hurdles",  rank: 19, rankDelta: 0,  confidence: 82, status: "Stable",  statusColor: "#6B7280", bg: "rgba(107,114,128,0.15)", border: "rgba(107,114,128,0.3)" },
  ];

  const feed = [
    { initials: "SC", color: "#10B981", bg: "rgba(16,185,129,0.2)",  name: "Sarah Chen",   tag: "New PB",        tagColor: "#10B981", tagBg: "rgba(16,185,129,0.15)",  text: "11.24s — 94% probability of sub-11.20s this season based on trajectory model.", time: "2h ago" },
    { initials: "JO", color: "#F59E0B", bg: "rgba(245,158,11,0.2)",  name: "James Okafor", tag: "Selection Risk", tagColor: "#F59E0B", tagBg: "rgba(245,158,11,0.15)", text: "3 missed sessions flagged. Biomechanics inconsistency across shot put & discus.", time: "5h ago" },
    { initials: "MP", color: "#B9FF4A", bg: "rgba(185,255,74,0.2)",  name: "Maya Petrov",  tag: "Intel Update",  tagColor: "#B9FF4A", tagBg: "rgba(185,255,74,0.15)",  text: "Cleared 1.96m in training — first time above personal best in 18 months.", time: "1d ago" },
  ];

  const navItems = [
    { icon: <Activity size={13} />,      label: "Dashboard", active: true },
    { icon: <Users size={13} />,         label: "Roster",    active: false },
    { icon: <TrendingUp size={13} />,    label: "Feed",      active: false },
    { icon: <Bell size={13} />,          label: "Alerts",    active: false, badge: 3 },
    { icon: <MessageSquare size={13} />, label: "AI Chat",   active: false },
  ];

  const barHeights = [38, 55, 42, 70, 52, 85, 68, 90, 74, 95, 80, 88];

  return (
    <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none select-none">
      <div className="w-full max-w-[580px] rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.55)]"
        style={{ border: "1px solid rgba(255,255,255,0.08)", background: "#111E0F" }}>

        {/* Browser bar */}
        <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "#0D1C0B", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex-1 mx-3 px-3 py-1 rounded-md text-[9px] font-mono"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(255,255,255,0.35)" }}>
            app.athleteintelligence.ai/dashboard
          </div>
        </div>

        {/* App chrome */}
        <div className="flex" style={{ height: 380 }}>

          {/* Sidebar */}
          <div className="w-[120px] flex-shrink-0 flex flex-col py-3" style={{ background: "#0B1809", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="px-3 mb-4 flex items-center gap-1.5">
              <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "#B9FF4A" }}>
                <Play size={8} className="fill-[#0D1C0B] text-[#0D1C0B]" />
              </div>
              <span className="text-[9px] font-semibold" style={{ color: "rgba(255,255,255,0.80)" }}>Athlete Intel</span>
            </div>
            <div className="px-2 space-y-0.5 flex-1">
              {navItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between px-2 py-1.5 rounded-md"
                  style={{ background: item.active ? "rgba(185,255,74,0.12)" : "transparent" }}>
                  <div className="flex items-center gap-1.5">
                    <span style={{ color: item.active ? "#B9FF4A" : "rgba(255,255,255,0.4)" }}>{item.icon}</span>
                    <span className="text-[9px] font-medium"
                      style={{ color: item.active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)" }}>{item.label}</span>
                  </div>
                  {item.badge && (
                    <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[6px] font-bold"
                      style={{ background: "#B9FF4A", color: "#0D1C0B" }}>{item.badge}</div>
                  )}
                </div>
              ))}
            </div>
            <div className="px-3 pt-2 mt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-bold"
                  style={{ background: "rgba(185,255,74,0.2)", color: "#B9FF4A" }}>AN</div>
                <div>
                  <div className="text-[7px] font-medium" style={{ color: "rgba(255,255,255,0.70)" }}>Athletics NZ</div>
                  <div className="text-[6px]" style={{ color: "rgba(255,255,255,0.30)" }}>Pro Plan</div>
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-hidden flex flex-col" style={{ background: "#0D1C0B" }}>

            {/* Header */}
            <div className="px-4 pt-3 pb-2 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div>
                <div className="text-[11px] font-semibold text-white">Dashboard</div>
                <div className="text-[8px]" style={{ color: "rgba(255,255,255,0.35)" }}>Tuesday, 29 July 2026</div>
              </div>
              <div className="px-2 py-1 rounded-md text-[8px] font-bold"
                style={{ background: "#B9FF4A", color: "#0D1C0B" }}>+ Add Athlete</div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2 px-4 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              {[
                { label: "Athletes",       value: "47",  sub: "monitored",   color: "white" },
                { label: "Alerts",         value: "12",  sub: "unread",      color: "#B9FF4A" },
                { label: "Intel items",    value: "284", sub: "this week",   color: "#6B8FE0" },
                { label: "Avg confidence", value: "82%", sub: "roster-wide", color: "#4ade80" },
              ].map((s) => (
                <div key={s.label} className="p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="text-[7px] mb-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>{s.label}</div>
                  <div className="text-[13px] font-bold leading-none" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[6px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Content grid */}
            <div className="flex-1 grid grid-cols-5 gap-0 overflow-hidden">

              {/* Left: Roster */}
              <div className="col-span-3 overflow-hidden" style={{ borderRight: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <span className="text-[9px] font-semibold text-white">Roster</span>
                  <span className="text-[7px] font-semibold" style={{ color: "#B9FF4A" }}>View all →</span>
                </div>
                <div>
                  {athletes.map((a) => (
                    <div key={a.name} className="flex items-center gap-2 px-3 py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[7px] font-bold shrink-0"
                        style={{ background: a.bg, border: `1px solid ${a.border}`, color: a.statusColor }}>{a.initials}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[8px] font-semibold text-white truncate">{a.name}</div>
                        <div className="text-[7px]" style={{ color: "rgba(255,255,255,0.40)" }}>{a.sport}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[7px] font-medium" style={{ color: "rgba(255,255,255,0.40)" }}>
                          #{a.rank} <span style={{ color: a.rankDelta > 0 ? "#10B981" : a.rankDelta < 0 ? "#B9FF4A" : "rgba(255,255,255,0.40)" }}>
                            {a.rankDelta > 0 ? `↑${a.rankDelta}` : a.rankDelta < 0 ? `↓${Math.abs(a.rankDelta)}` : "—"}
                          </span>
                        </div>
                        <div className="text-[6px] font-semibold" style={{ color: a.statusColor }}>{a.status}</div>
                      </div>
                      <div className="w-7 shrink-0">
                        <div className="text-[8px] font-bold text-right"
                          style={{ color: a.confidence >= 85 ? "#10B981" : a.confidence >= 75 ? "#6B8FE0" : "#F59E0B" }}>
                          {a.confidence}<span className="text-[6px]" style={{ color: "rgba(255,255,255,0.25)" }}>%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mini sparkline */}
                <div className="px-3 py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="text-[7px] mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>Roster confidence — 12 weeks</div>
                  <div className="flex items-end gap-0.5 h-8">
                    {barHeights.map((h, i) => (
                      <div key={i} className="flex-1 rounded-t-[2px]" style={{
                        height: `${h}%`,
                        background: i === barHeights.length - 1 ? "#B9FF4A" : i >= barHeights.length - 4 ? "rgba(185,255,74,0.4)" : "rgba(185,255,74,0.15)"
                      }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Feed */}
              <div className="col-span-2 overflow-hidden flex flex-col">
                <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <span className="text-[9px] font-semibold text-white">Intelligence</span>
                  <span className="text-[7px]" style={{ color: "rgba(255,255,255,0.35)" }}>Live</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  {feed.map((f) => (
                    <div key={f.name} className="px-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center text-[6px] font-bold shrink-0"
                          style={{ background: f.bg, color: f.color }}>{f.initials}</div>
                        <span className="text-[8px] font-semibold text-white truncate">{f.name}</span>
                      </div>
                      <div className="flex items-center gap-1 mb-1">
                        <span className="px-1 py-0.5 rounded text-[6px] font-semibold"
                          style={{ background: f.tagBg, color: f.tagColor }}>{f.tag}</span>
                        <span className="text-[6px]" style={{ color: "rgba(255,255,255,0.30)" }}>{f.time}</span>
                      </div>
                      <p className="text-[7px] leading-relaxed line-clamp-2" style={{ color: "rgba(255,255,255,0.45)" }}>{f.text}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sign-in form skeleton ─────────────────────────────────────────────────────

function ClerkSkeleton() {
  return (
    <div className="w-full animate-pulse space-y-3">
      <div className="h-11 rounded-lg" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }} />
      <div className="flex items-center gap-3 py-1">
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.10)" }} />
        <div className="w-4 h-3 rounded" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.10)" }} />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-20 rounded" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="h-11 rounded-lg" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }} />
      </div>
      <div className="h-11 rounded-lg" style={{ background: "rgba(185,255,74,0.15)" }} />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SignInPage() {
  const [clerkLoaded, setClerkLoaded] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      const btn =
        document.querySelector('[data-localization-key="socialButtonsBlockButton__google"]') ||
        document.querySelector(".cl-socialButtonsBlockButton") ||
        document.querySelector(".cl-formButtonPrimary") ||
        document.querySelector(".cl-rootBox");
      if (btn) { setClerkLoaded(true); clearInterval(t); }
    }, 80);
    const fallback = setTimeout(() => { setClerkLoaded(true); clearInterval(t); }, 3000);
    return () => { clearInterval(t); clearTimeout(fallback); };
  }, []);

  return (
    <div className="min-h-screen flex font-sans athlete-intelligence-root" style={{ background: "#0D1C0B" }}>

      {/* Left Column: Form */}
      <div className="w-full lg:w-[480px] flex-shrink-0 flex flex-col justify-between p-8 sm:p-14 lg:p-16 relative z-10"
        style={{ borderRight: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded flex items-center justify-center shadow-[0_2px_10px_rgba(185,255,74,0.4)]"
            style={{ background: "#B9FF4A" }}>
            <Play className="w-4 h-4 fill-[#0D1C0B] text-[#0D1C0B]" />
          </div>
          <span className="font-semibold text-lg tracking-wide text-white">Athlete Intelligence</span>
        </div>

        {/* Form area */}
        <div className="max-w-sm w-full mx-auto lg:mx-0 my-12">
          <h1 className="text-3xl font-black mb-2 text-white">Welcome back.</h1>
          <p className="mb-8 text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
            Persistent intelligence on every athlete you track.
          </p>

          {!clerkLoaded && <ClerkSkeleton />}

          <div className={clerkLoaded ? "block" : "hidden"}>
            <SignIn
              routing="path"
              path={`${basePath}/sign-in`}
              signUpUrl={`${basePath}/sign-up`}
              appearance={{
                elements: {
                  rootBox: "w-full",
                  cardBox: "w-full shadow-none rounded-xl",
                  card: "p-0 shadow-none bg-transparent",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  formButtonPrimary: "bg-[#B9FF4A] hover:bg-[#a8f030] text-[#0D1C0B] font-semibold normal-case text-sm shadow-sm",
                  formFieldInput: "bg-[rgba(255,255,255,0.07)] border-[rgba(255,255,255,0.12)] text-white focus:ring-[#B9FF4A] focus:border-[#B9FF4A] rounded-lg placeholder:text-[rgba(255,255,255,0.30)]",
                  formFieldLabel: "text-[rgba(255,255,255,0.65)] font-medium text-sm",
                  dividerLine: "bg-[rgba(255,255,255,0.12)]",
                  dividerText: "text-[rgba(255,255,255,0.30)] text-xs",
                  socialButtonsBlockButton: "border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.05)] text-white hover:bg-[rgba(255,255,255,0.09)] rounded-lg",
                  socialButtonsBlockButtonText: "font-medium text-sm text-white",
                  footerActionText: "text-[rgba(255,255,255,0.40)] text-sm",
                  footerActionLink: "text-[#B9FF4A] hover:text-[#a8f030] font-medium",
                  identityPreviewText: "text-white",
                  alternativeMethodsBlockButton: "border-[rgba(255,255,255,0.12)] text-white",
                },
              }}
              fallbackRedirectUrl={`${basePath}/dashboard`}
            />
          </div>
        </div>

        {/* Footer */}
        <div>
          <p className="text-sm text-center lg:text-left" style={{ color: "rgba(255,255,255,0.35)" }}>
            Trusted by national programmes and professional clubs in NZ, AU, and UK.
          </p>
          <div className="mt-3 text-center lg:text-left">
            <a href="/contact" className="text-sm font-semibold transition-colors inline-flex items-center gap-1"
              style={{ color: "#B9FF4A" }}>
              New organisation? Request access <ChevronRight size={13} />
            </a>
          </div>
        </div>
      </div>

      {/* Right Column: Dashboard preview */}
      <div className="hidden lg:block flex-1 relative overflow-hidden" style={{ background: "#0B1809" }}>
        {/* Ambient glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[400px] rounded-full opacity-15 blur-[120px]" style={{ background: "#B9FF4A" }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-10 blur-[120px]" style={{ background: "#C8BDFF" }} />

        {/* Label */}
        <div className="absolute top-8 left-8 z-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold"
            style={{ background: "rgba(185,255,74,0.12)", border: "1px solid rgba(185,255,74,0.25)", color: "#B9FF4A" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-[#B9FF4A] animate-pulse" />
            Live platform preview
          </div>
        </div>

        <DashboardPreview />
      </div>
    </div>
  );
}
