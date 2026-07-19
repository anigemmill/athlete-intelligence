import React from "react";
import { Link } from "wouter";
import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react";

export default function BillingSuccessPage() {
  return (
    <div className="min-h-screen bg-[#0B0F1E] flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-12">
        <div className="w-8 h-8 rounded-xl bg-[#E75D50] flex items-center justify-center shadow-[0_4px_16px_rgba(231,93,80,0.4)]">
          <span className="text-white font-bold text-sm">AI</span>
        </div>
        <span className="text-white font-semibold text-[16px] tracking-tight">Athlete Intelligence</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={32} className="text-emerald-400" />
        </div>

        <h1 className="text-[28px] font-bold text-white tracking-tight mb-3">
          You're all set.
        </h1>
        <p className="text-white/45 text-[15px] leading-relaxed mb-8">
          Your trial has started. You have full access to the platform — add your first athletes and the intelligence agents will get to work immediately.
        </p>

        <div className="space-y-3">
          <Link href="/dashboard">
            <span className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#E75D50] hover:bg-[#D04840] text-white font-semibold text-[15px] cursor-pointer transition-all shadow-[0_4px_20px_rgba(231,93,80,0.35)]">
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
