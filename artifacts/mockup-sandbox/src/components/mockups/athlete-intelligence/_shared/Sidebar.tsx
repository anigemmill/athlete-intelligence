import React from "react";

interface SidebarProps {
  activePage?: "dashboard" | "feed" | "schedule" | "alerts" | "settings";
}

const navItems = [
  {
    id: "dashboard",
    label: "Overview",
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    id: "feed",
    label: "Intelligence",
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
  },
  {
    id: "schedule",
    label: "Schedule",
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  {
    id: "alerts",
    label: "Alerts",
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const recentAgents = [
  { name: "Lola Anderson", sport: "100m Sprint", status: "active", hasAlert: true },
  { name: "Marcus Webb", sport: "Decathlon", status: "active", hasAlert: false },
  { name: "Priya Nair", sport: "5000m", status: "active", hasAlert: true },
  { name: "James Kowalski", sport: "High Jump", status: "active", hasAlert: false },
  { name: "Sophie Chen", sport: "400m Hurdles", status: "paused", hasAlert: false },
];

export function Sidebar({ activePage = "dashboard" }: SidebarProps) {
  return (
    <div
      style={{
        width: 240,
        flexShrink: 0,
        background: "#293055",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        userSelect: "none",
      }}
    >
      {/* Brand */}
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "linear-gradient(135deg, #E75D50 0%, #C84840 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(231,93,80,0.4)",
            }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(252,250,250,0.95)", letterSpacing: "-0.01em" }}>Athlete Intelligence</div>
            <div style={{ fontSize: 10, color: "rgba(252,250,250,0.35)", letterSpacing: "0.06em", marginTop: 1 }}>ATHLETICS NZ</div>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div style={{ padding: "12px 10px 8px" }}>
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          return (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "7px 10px",
                borderRadius: 6,
                marginBottom: 2,
                background: isActive ? "rgba(231,93,80,0.18)" : "transparent",
                color: isActive ? "#FEEEEE" : "rgba(252,250,250,0.45)",
                fontSize: 13,
                fontWeight: isActive ? 500 : 400,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {item.icon}
              {item.label}
              {item.id === "alerts" && (
                <div style={{
                  marginLeft: "auto",
                  background: "#E75D50",
                  color: "white",
                  fontSize: 10,
                  fontWeight: 600,
                  borderRadius: 10,
                  padding: "1px 6px",
                  lineHeight: "14px",
                }}>3</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Agents section */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{
          padding: "16px 20px 8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(252,250,250,0.3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Monitored Athletes
          </span>
          <div style={{
            width: 18, height: 18,
            borderRadius: 4,
            background: "rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}>
            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="rgba(252,250,250,0.5)" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
        </div>
        <div style={{ overflow: "auto", flex: 1, padding: "0 10px" }}>
          {recentAgents.map((agent) => (
            <div
              key={agent.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "6px 10px",
                borderRadius: 6,
                cursor: "pointer",
                marginBottom: 1,
              }}
            >
              <div style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: agent.status === "paused"
                  ? "rgba(255,255,255,0.07)"
                  : "rgba(231,93,80,0.22)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 600,
                color: agent.status === "paused"
                  ? "rgba(255,255,255,0.28)"
                  : "rgba(252,250,250,0.92)",
                flexShrink: 0,
              }}>
                {agent.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: agent.status === "paused" ? "rgba(255,255,255,0.28)" : "rgba(252,250,250,0.78)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {agent.name}
                </div>
                <div style={{ fontSize: 10, color: "rgba(252,250,250,0.35)", marginTop: 1 }}>{agent.sport}</div>
              </div>
              {agent.hasAlert && (
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#E75D50", flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* User footer */}
      <div style={{
        padding: "12px 16px",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <div style={{
          width: 28, height: 28,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 600, color: "rgba(252,250,250,0.85)",
          flexShrink: 0,
        }}>SH</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(252,250,250,0.75)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Sarah Hutchinson
          </div>
          <div style={{ fontSize: 10, color: "rgba(252,250,250,0.35)" }}>Professional</div>
        </div>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="rgba(252,250,250,0.28)" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    </div>
  );
}
