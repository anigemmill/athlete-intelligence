import React, { useState } from "react";
import { Link } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { useListAthletes } from "@workspace/api-client-react";
import type { ActivePage } from "./AppLayout";

interface SidebarProps {
  activePage?: ActivePage;
}

// ── Nav sections ─────────────────────────────────────────────────────────────

const NAV = [
  {
    section: null,
    items: [
      {
        id: "dashboard",
        label: "Overview",
        href: "/dashboard",
        icon: (
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
        ),
      },
      {
        id: "intelligence",
        label: "Intelligence",
        href: "/intelligence",
        icon: (
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        ),
      },
      {
        id: "chat",
        label: "AI Chat",
        href: "/chat",
        icon: (
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
        ),
      },
      {
        id: "sources",
        label: "Source Explorer",
        href: "/sources",
        icon: (
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "Athletes",
    items: [
      {
        id: "athletes",
        label: "All Athletes",
        href: "/athletes/new",
        icon: (
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
        ),
      },
      {
        id: "schedule",
        label: "Schedule",
        href: "/schedule",
        icon: (
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        ),
      },
      {
        id: "compare",
        label: "Compare",
        href: "/athletes/compare",
        icon: (
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "Workspace",
    items: [
      {
        id: "alerts",
        label: "Alerts",
        href: "/alerts",
        badge: 3,
        icon: (
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
        ),
      },
    ],
  },
];

const BOTTOM_NAV = [
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: (
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: "admin",
    label: "Admin",
    href: "/admin",
    icon: (
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
];

export function Sidebar({ activePage = "dashboard" }: SidebarProps) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [athleteSearch, setAthleteSearch] = useState("");

  const { data: athletesData } = useListAthletes();
  const allAthletes: any[] = (athletesData as any)?.athletes ?? (athletesData as any) ?? [];

  const filteredAthletes = athleteSearch.trim()
    ? allAthletes.filter((a: any) => a.name?.toLowerCase().includes(athleteSearch.toLowerCase()))
    : allAthletes;

  const navItemStyle = (isActive: boolean) => ({
    display: "flex",
    alignItems: "center",
    gap: 9,
    padding: "6px 10px",
    borderRadius: 6,
    marginBottom: 1,
    background: isActive ? "rgba(231,93,80,0.16)" : "transparent",
    color: isActive ? "#FEEEEE" : "rgba(252,250,250,0.45)",
    fontSize: 13,
    fontWeight: isActive ? 500 : 400,
    cursor: "pointer",
    transition: "all 0.15s",
  } as React.CSSProperties);

  return (
    <div
      style={{
        width: 224,
        flexShrink: 0,
        background: "#293055",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        userSelect: "none",
      }}
    >
      {/* Brand */}
      <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #E75D50 0%, #C84840 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(231,93,80,0.4)" }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(252,250,250,0.95)", letterSpacing: "-0.01em" }}>Athlete Intelligence</div>
            <div style={{ fontSize: 10, color: "rgba(252,250,250,0.30)", letterSpacing: "0.05em", marginTop: 1 }}>{user?.organizationMemberships?.[0]?.organization?.name ?? "Professional"}</div>
          </div>
        </div>
      </div>

      {/* Main navigation */}
      <nav aria-label="Main navigation" style={{ padding: "10px 8px 6px", flexShrink: 0 }}>
        {NAV.map((group) => (
          <div key={group.section ?? "root"}>
            {group.section && (
              <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(252,250,250,0.25)", letterSpacing: "0.08em", textTransform: "uppercase", padding: "10px 10px 4px" }}>
                {group.section}
              </div>
            )}
            {group.items.map((item) => {
              const isActive = activePage === item.id;
              return (
                <Link key={item.id} href={item.href} aria-current={isActive ? "page" : undefined}>
                  <div style={navItemStyle(isActive)} className="hover:!bg-[rgba(255,255,255,0.06)] hover:!text-[rgba(252,250,250,0.75)]">
                    <span style={{ opacity: isActive ? 1 : 0.6 }} aria-hidden="true">{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {"badge" in item && item.badge ? (
                      <div style={{ background: "#E75D50", color: "white", fontSize: 10, fontWeight: 600, borderRadius: 10, padding: "1px 6px", lineHeight: "14px", marginLeft: "auto" }} aria-label={`${item.badge} notifications`}>{item.badge}</div>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Athlete roster */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ padding: "10px 18px 6px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(252,250,250,0.25)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Roster ({allAthletes.length})
          </span>
          <Link href="/athletes/new">
            <div style={{ width: 18, height: 18, borderRadius: 4, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} title="Add Athlete">
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="rgba(252,250,250,0.5)" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Search */}
        {allAthletes.length > 5 && (
          <div style={{ padding: "0 10px 6px", flexShrink: 0 }}>
            <input
              value={athleteSearch}
              onChange={(e) => setAthleteSearch(e.target.value)}
              placeholder="Search roster…"
              style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "4px 8px", fontSize: 11, color: "rgba(252,250,250,0.65)", outline: "none", boxSizing: "border-box" }}
            />
          </div>
        )}

        {/* Athlete list */}
        <div style={{ overflow: "auto", flex: 1, padding: "0 8px 8px" }} className="hide-scrollbar">
          {filteredAthletes.map((athlete: any) => (
            <Link key={athlete.id} href={`/athletes/${athlete.id}`}>
              <div
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", borderRadius: 6, cursor: "pointer", marginBottom: 1 }}
                className="hover:bg-[rgba(255,255,255,0.05)] transition-colors"
              >
                <div style={{ width: 24, height: 24, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: athlete.agentStatus === "paused" ? "rgba(255,255,255,0.07)" : "rgba(231,93,80,0.20)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: athlete.agentStatus === "paused" ? "rgba(255,255,255,0.25)" : "rgba(252,250,250,0.90)" }}>
                  {athlete.avatarUrl ? (
                    <img src={athlete.avatarUrl} alt={athlete.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    athlete.name?.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: athlete.agentStatus === "paused" ? "rgba(255,255,255,0.25)" : "rgba(252,250,250,0.75)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {athlete.name}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(252,250,250,0.28)", marginTop: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{athlete.sport}</div>
                </div>
                {athlete.hasNewIntelligence && (
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#E75D50", flexShrink: 0 }} />
                )}
              </div>
            </Link>
          ))}
          {filteredAthletes.length === 0 && athleteSearch && (
            <div style={{ fontSize: 11, color: "rgba(252,250,250,0.25)", padding: "8px 10px" }}>No athletes match</div>
          )}
        </div>
      </div>

      {/* Bottom nav (settings, admin) + user footer */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
        <div style={{ padding: "8px 8px 4px" }}>
          {BOTTOM_NAV.map((item) => {
            const isActive = activePage === item.id;
            return (
              <Link key={item.id} href={item.href}>
                <div style={navItemStyle(isActive)} className="hover:!bg-[rgba(255,255,255,0.06)] hover:!text-[rgba(252,250,250,0.75)]">
                  <span style={{ opacity: isActive ? 1 : 0.6 }}>{item.icon}</span>
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>

        {/* User footer */}
        <div style={{ padding: "8px 14px 14px", display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "rgba(252,250,250,0.80)", flexShrink: 0 }}>
            {user?.firstName?.[0] || ""}{user?.lastName?.[0] || ""}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(252,250,250,0.70)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.fullName || "User"}
            </div>
            <div style={{ fontSize: 10, color: "rgba(252,250,250,0.28)" }}>Pro Plan</div>
          </div>
          <button onClick={() => signOut()} className="hover:bg-[rgba(255,255,255,0.08)] p-1.5 rounded transition-colors" aria-label="Sign out">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="rgba(252,250,250,0.25)" strokeWidth={2} className="hover:stroke-[rgba(252,250,250,0.7)] transition-colors">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
