import React, { useState } from "react";
import { Link, useLocation } from "wouter";

const navLinks = [
  { label: "Product", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Security", href: "/security" },
];

export function PublicNav() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B1809]/95 backdrop-blur-md border-b border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/">
          <div className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-7 h-7 rounded-[7px] bg-[#B9FF4A] flex items-center justify-center shadow-[0_2px_10px_rgba(185,255,74,0.35)]">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#0D1C0B" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <span className="text-[13px] font-semibold text-white/90 tracking-tight">Athlete Intelligence</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link key={l.label} href={l.href}>
              <span className={`px-3 py-1.5 rounded-md text-[13px] transition-colors cursor-pointer ${location === l.href ? "text-white bg-white/8" : "text-white/45 hover:text-white/80 hover:bg-white/5"}`}>
                {l.label}
              </span>
            </Link>
          ))}
        </nav>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <Link href="/sign-in">
            <span className="hidden md:block text-[13px] text-white/45 hover:text-white/80 cursor-pointer transition-colors">Sign in</span>
          </Link>
          <Link href="/contact">
            <span className="px-4 py-2 rounded-lg bg-[#B9FF4A] hover:bg-[#CBFF6A] text-[#0D1C0B] text-[13px] font-bold cursor-pointer transition-colors shadow-[0_2px_12px_rgba(185,255,74,0.3)]">
              Request demo
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-[#080F07] border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-[7px] bg-[#B9FF4A] flex items-center justify-center">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#0D1C0B" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <span className="text-[13px] font-semibold text-white/80">Athlete Intelligence</span>
            </div>
            <p className="text-[13px] text-white/35 leading-relaxed max-w-xs">
              Persistent AI agents that surface structured, source-attributed intelligence about athletes to professional sports organisations.
            </p>
          </div>

          <div>
            <div className="text-[11px] font-semibold text-white/25 uppercase tracking-widest mb-3">Product</div>
            {["Features", "Pricing", "Security", "Changelog"].map((l) => (
              <div key={l} className="text-[13px] text-white/40 hover:text-white/70 mb-2 cursor-pointer transition-colors">{l}</div>
            ))}
          </div>

          <div>
            <div className="text-[11px] font-semibold text-white/25 uppercase tracking-widest mb-3">Company</div>
            {[["About", "/about"], ["Contact", "/contact"], ["Resources", "/resources"]].map(([l, h]) => (
              <Link key={l} href={h}>
                <div className="text-[13px] text-white/40 hover:text-white/70 mb-2 cursor-pointer transition-colors">{l}</div>
              </Link>
            ))}
          </div>

          <div>
            <div className="text-[11px] font-semibold text-white/25 uppercase tracking-widest mb-3">Legal</div>
            {["Privacy Policy", "Terms of Service", "AI Principles", "Data Sources"].map((l) => (
              <div key={l} className="text-[13px] text-white/40 hover:text-white/70 mb-2 cursor-pointer transition-colors">{l}</div>
            ))}
          </div>
        </div>

        <div className="border-t border-white/[0.06] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-white/25">© {new Date().getFullYear()} Athlete Intelligence. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#B9FF4A]/10 border border-[#B9FF4A]/20 text-[11px] text-[#B9FF4A] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B9FF4A] animate-pulse" />
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0D1C0B]">
      <PublicNav />
      <main className="pt-16">{children}</main>
      <PublicFooter />
    </div>
  );
}
