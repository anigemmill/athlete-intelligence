import React, { useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, Sparkles } from "lucide-react";
import { PLAN_SELECTED_KEY } from "@/components/PlanSelectionModal";

export default function BillingSuccessPage() {
  useEffect(() => {
    localStorage.setItem(PLAN_SELECTED_KEY, "1");
  }, []);

  return (
    <div className="min-h-screen bg-[#0D1C0B] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(185,255,74,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(185,255,74,0.02) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full bg-[#B9FF4A]/[0.06] blur-[120px] pointer-events-none" />

      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-12 relative">
        <div className="w-8 h-8 rounded-xl bg-[#B9FF4A] flex items-center justify-center shadow-[0_4px_16px_rgba(185,255,74,0.35)]">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#0D1C0B" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <span className="text-white font-semibold text-[16px] tracking-tight">Athlete Intelligence</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-md text-center relative">
        <div className="w-16 h-16 rounded-full bg-[#B9FF4A]/15 border border-[#B9FF4A]/30 flex items-center justify-center mx-auto mb-6">
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#B9FF4A" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        <h1 className="text-[28px] font-black text-white tracking-tight mb-3">You're all set.</h1>
        <p className="text-white/45 text-[15px] leading-relaxed mb-8">
          Your trial has started. You have full access to the platform — add your first athletes and the intelligence agents will get to work immediately.
        </p>

        <div className="space-y-3">
          <Link href="/dashboard">
            <span className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#B9FF4A] hover:bg-[#CBFF6A] text-[#0D1C0B] font-black text-[15px] cursor-pointer transition-all shadow-[0_4px_20px_rgba(185,255,74,0.35)]">
              Go to dashboard
              <ArrowRight size={16} />
            </span>
          </Link>
          <Link href="/athletes/new">
            <span className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-white/[0.12] text-white/60 hover:text-white hover:border-white/25 font-medium text-[14px] cursor-pointer transition-all hover:bg-white/[0.04]">
              <Sparkles size={14} />
              Add your first athlete
            </span>
          </Link>
        </div>

        <p className="text-white/25 text-[12px] mt-8">
          A confirmation has been sent to your email. Questions?{" "}
          <Link href="/contact">
            <span className="text-white/40 hover:text-white/60 underline cursor-pointer transition-colors">Contact us</span>
          </Link>
        </p>
      </div>
    </div>
  );
}
