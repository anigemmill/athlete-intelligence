import React from "react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0D1C0B] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(185,255,74,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(185,255,74,0.018) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full bg-[#B9FF4A]/[0.05] blur-[140px] pointer-events-none" />

      <div className="relative text-center max-w-lg">
        <div className="text-[140px] font-black text-[#B9FF4A]/10 leading-none mb-2 select-none">404</div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-4 -mt-4">Page not found.</h1>
        <p className="text-white/40 text-[15px] leading-relaxed mb-10">
          This page doesn't exist or has been moved. Head back to the platform.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/">
            <span className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#B9FF4A] hover:bg-[#CBFF6A] text-[#0D1C0B] font-black text-[14px] cursor-pointer transition-all shadow-[0_4px_20px_rgba(185,255,74,0.3)]">
              Back to home
            </span>
          </Link>
          <Link href="/contact">
            <span className="px-7 py-3.5 rounded-xl border border-white/[0.12] text-white/55 hover:text-white hover:border-white/25 font-medium text-[14px] cursor-pointer transition-all hover:bg-white/[0.04]">
              Contact us
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
