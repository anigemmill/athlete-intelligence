import React from "react";
import { SignIn } from "@clerk/react";
import { Play } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#FCFAFA] text-[#1C1F3A] flex font-sans selection:bg-[#E75D50]/20 athlete-intelligence-root">
      {/* Left Column: Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 sm:p-16 lg:p-24 relative z-10">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#E75D50] flex items-center justify-center shadow-[0_2px_10px_rgba(231,93,80,0.4)]">
              <Play className="w-4 h-4 fill-current text-white" />
            </div>
            <span className="font-semibold text-lg tracking-wide text-[#1C1F3A]">Athlete Intelligence</span>
          </div>
        </div>

        <div className="max-w-md w-full mx-auto lg:mx-0 my-16">
          <h1 className="text-3xl sm:text-4xl font-semibold mb-4 text-[#1C1F3A]">
            Welcome back
          </h1>
          <p className="text-[#6B7080] mb-10 text-lg">
            Persistent intelligence agents for the athletes you track.
          </p>

          <SignIn
            routing="path"
            path={`${basePath}/sign-in`}
            signUpUrl={`${basePath}/sign-up`}
            appearance={{
              elements: {
                rootBox: "w-full",
                cardBox: "w-full shadow-none border border-[#DCE2EF] bg-white",
                formButtonPrimary: "bg-[#E75D50] hover:bg-[#D04840] normal-case text-sm shadow-sm",
                formFieldInput: "border-[#DCE2EF] focus:ring-[#E75D50] focus:border-[#E75D50]",
                formFieldLabel: "text-[#3D426A] font-medium",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                dividerLine: "bg-[#DCE2EF]",
                dividerText: "text-[#909AB8]",
                socialButtonsBlockButton: "border-[#DCE2EF] text-[#1C1F3A] hover:bg-[#F5F0F0]",
                socialButtonsBlockButtonText: "font-medium",
                footerActionText: "text-[#909AB8]",
                footerActionLink: "text-[#E75D50] hover:text-[#D04840]",
              }
            }}
          />
        </div>

        <div>
          <p className="text-sm text-[#909AB8] text-center lg:text-left">
            Trusted by national programmes and professional clubs in NZ, AU, and UK.
          </p>
          <div className="mt-4 text-center lg:text-left">
            <a href="#" className="text-sm font-medium text-[#E75D50] hover:text-[#D04840] transition-colors">
              New organisation? Request access
            </a>
          </div>
        </div>
      </div>

      {/* Right Column: Space Cadet dark panel */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden" style={{ background: "#293055" }}>
        {/* Subtle texture overlays */}
        <div className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-luminosity" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&q=80&w=2000')" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(231,93,80,0.08) 0%, transparent 60%)" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1f38] via-transparent to-transparent opacity-70" />

        {/* Floating intelligence cards */}
        <div className="absolute inset-0 flex flex-col justify-center px-12 z-10">
          <div className="max-w-lg space-y-5">

            {/* Card 1 */}
            <div
              className="backdrop-blur-md rounded-xl p-5 shadow-2xl transform transition-transform hover:-translate-y-1 duration-500 relative"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <div className="absolute -left-px top-1/4 w-[2px] h-10 bg-[#E75D50] rounded-full blur-[2px]" />
              <div className="absolute -left-px top-1/4 w-[2px] h-10 bg-[#E75D50] rounded-full" />
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center border text-sm font-semibold"
                    style={{ background: "rgba(231,93,80,0.2)", borderColor: "rgba(231,93,80,0.35)", color: "#FEEEEE" }}>
                    LA
                  </div>
                  <div>
                    <h4 className="font-medium text-sm" style={{ color: "rgba(252,250,250,0.92)" }}>Lola Anderson</h4>
                    <p className="text-xs" style={{ color: "rgba(252,250,250,0.45)" }}>Intelligence Update · 2h ago</p>
                  </div>
                </div>
                <div className="px-2 py-1 text-xs font-medium rounded"
                  style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.25)" }}>
                  New PB
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(252,250,250,0.72)" }}>
                Lola achieved a new personal best of 11.24s in the 100m sprint. Performance trajectory indicates a 94% probability of sub-11.20s this season.
              </p>
            </div>

            {/* Card 2 */}
            <div
              className="backdrop-blur-md rounded-xl p-5 shadow-2xl transform translate-x-8 transition-transform hover:-translate-y-1 duration-500"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center border text-sm font-semibold"
                    style={{ background: "rgba(52,79,159,0.35)", borderColor: "rgba(52,79,159,0.5)", color: "#DCE2EF" }}>
                    MW
                  </div>
                  <div>
                    <h4 className="font-medium text-sm" style={{ color: "rgba(252,250,250,0.92)" }}>Marcus Webb</h4>
                    <p className="text-xs" style={{ color: "rgba(252,250,250,0.45)" }}>Squad Selection · 5h ago</p>
                  </div>
                </div>
                <div className="px-2 py-1 text-xs font-medium rounded"
                  style={{ background: "rgba(52,79,159,0.2)", color: "#DCE2EF", border: "1px solid rgba(52,79,159,0.35)" }}>
                  Decathlon
                </div>
              </div>
              <div className="flex items-end gap-1.5 h-14 mt-3 w-full">
                {[40, 60, 45, 80, 55, 90, 75, 100].map((height, i) => (
                  <div key={i} className="flex-1 rounded-t-sm relative overflow-hidden" style={{ height: '100%', background: "rgba(255,255,255,0.06)" }}>
                    <div className="absolute bottom-0 left-0 w-full" style={{ height: `${height}%`, background: "rgba(231,93,80,0.35)" }} />
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
