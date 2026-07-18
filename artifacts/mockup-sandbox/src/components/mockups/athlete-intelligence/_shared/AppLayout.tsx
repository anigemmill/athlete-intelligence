import React from "react";
import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  activePage?: "dashboard" | "feed" | "alerts" | "settings";
}

export function AppLayout({ children, activePage = "dashboard" }: AppLayoutProps) {
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100%",
        background: "#FCFAFA",
        color: "#1C1F3A",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        overflow: "hidden",
      }}
    >
      <Sidebar activePage={activePage} />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
          background: "#FCFAFA",
        }}
      >
        {children}
      </div>
    </div>
  );
}
