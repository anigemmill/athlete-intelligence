import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { PublicLayout } from "@/components/layout/PublicLayout";

type FormState = "idle" | "submitting" | "success";

export default function ContactPage() {
  const [type, setType] = useState<"demo" | "sales" | "general">("demo");
  const [state, setState] = useState<FormState>("idle");
  const [form, setForm] = useState({ name: "", org: "", email: "", role: "", message: "", athletes: "" });

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("submitting");
    try {
      const resp = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...form }),
      });
      if (!resp.ok) throw new Error("Server error");
      setState("success");
    } catch {
      setState("idle");
      alert("Something went wrong — please try again or email us directly.");
    }
  };

  const inputCls = "w-full px-4 py-3 rounded-xl bg-[#131929] border border-white/[0.09] text-[13px] text-white/80 placeholder:text-white/20 focus:outline-none focus:border-[#E75D50]/50 focus:ring-1 focus:ring-[#E75D50]/20 transition-all";
  const labelCls = "block text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-1.5";

  return (
    <>
      <Helmet>
        <title>Contact — Athlete Intelligence</title>
        <meta name="description" content="Get in touch with the Athlete Intelligence team to request a demo or learn more about our AI-powered athlete monitoring platform." />
        <meta property="og:title" content="Contact Athlete Intelligence" />
        <meta property="og:description" content="Request a demo or get in touch with the Athlete Intelligence team." />
      </Helmet>
      <PublicLayout>
      {/* Hero */}
      <section className="bg-[#0B0F1E] pt-24 pb-16 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-[#293055]/30 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="text-[12px] font-semibold text-[#E75D50] uppercase tracking-widest mb-3">Contact</div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-4">Let's talk</h1>
          <p className="text-white/40 text-lg max-w-xl mx-auto">Whether you want a demo with your own athletes, have questions about fit, or need an enterprise conversation — we respond within one business day.</p>
        </div>
      </section>

      <section className="bg-[#0B0F1E] pb-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid md:grid-cols-5 gap-10">
            {/* Left: type selector + info */}
            <div className="md:col-span-2 space-y-6">
              {/* Enquiry type */}
              <div className="p-5 rounded-2xl bg-[#131929] border border-white/[0.07]">
                <div className={labelCls}>Enquiry type</div>
                {[
                  { id: "demo", label: "Request a demo", desc: "See the platform using athletes from your roster" },
                  { id: "sales", label: "Enterprise enquiry", desc: "Custom pricing, contracts, and onboarding" },
                  { id: "general", label: "General enquiry", desc: "Questions, partnerships, press, or anything else" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id as typeof type)}
                    className={`w-full text-left flex items-start gap-3 p-3 rounded-xl mb-1.5 border transition-all ${type === t.id ? "border-[#E75D50]/40 bg-[#E75D50]/8" : "border-transparent hover:bg-white/[0.03]"}`}
                  >
                    <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${type === t.id ? "bg-[#E75D50]" : "bg-white/15"}`} />
                    <div>
                      <div className={`text-[13px] font-medium ${type === t.id ? "text-white/90" : "text-white/50"}`}>{t.label}</div>
                      <div className="text-[11px] text-white/25 mt-0.5">{t.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Contact info */}
              <div className="p-5 rounded-2xl bg-[#131929] border border-white/[0.07] space-y-4">
                <div>
                  <div className={labelCls}>Response time</div>
                  <div className="text-[13px] text-white/50">Within 1 business day, often same day</div>
                </div>
                <div>
                  <div className={labelCls}>Demo format</div>
                  <div className="text-[13px] text-white/50">30–45 min, built around athletes from your actual roster — not a canned walkthrough</div>
                </div>
                <div>
                  <div className={labelCls}>Based in</div>
                  <div className="text-[13px] text-white/50">New Zealand — working with organisations across NZ, AU, UK, US, and CA</div>
                </div>
              </div>
            </div>

            {/* Right: form */}
            <div className="md:col-span-3">
              {state === "success" ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-10 rounded-2xl bg-[#131929] border border-white/[0.07]">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mb-5">
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#34D399" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <h3 className="text-[18px] font-semibold text-white mb-2">Message sent</h3>
                  <p className="text-[13px] text-white/40 max-w-xs leading-relaxed">We'll be in touch within one business day. Check your inbox — we'll confirm receipt shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-7 rounded-2xl bg-[#131929] border border-white/[0.07] space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Full name *</label>
                      <input required value={form.name} onChange={update("name")} placeholder="Sarah Johnson" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Organisation *</label>
                      <input required value={form.org} onChange={update("org")} placeholder="Athletics NZ" className={inputCls} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Work email *</label>
                      <input required type="email" value={form.email} onChange={update("email")} placeholder="sarah@example.org" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Role</label>
                      <input value={form.role} onChange={update("role")} placeholder="Performance Director" className={inputCls} />
                    </div>
                  </div>

                  {type === "demo" && (
                    <div>
                      <label className={labelCls}>Approximate roster size</label>
                      <select value={form.athletes} onChange={update("athletes") as any} className={inputCls}>
                        <option value="">Select…</option>
                        <option>Under 25 athletes</option>
                        <option>25–100 athletes</option>
                        <option>100–500 athletes</option>
                        <option>500+ athletes</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className={labelCls}>Message</label>
                    <textarea
                      value={form.message}
                      onChange={update("message")}
                      rows={4}
                      placeholder={type === "demo" ? "Tell us about your organisation and what you'd like to see in the demo…" : "What can we help you with?"}
                      className={inputCls + " resize-none"}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={state === "submitting"}
                    className="w-full py-3.5 rounded-xl bg-[#E75D50] hover:bg-[#D04840] text-white font-semibold text-[14px] transition-all shadow-[0_4px_16px_rgba(231,93,80,0.35)] disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {state === "submitting" ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending…
                      </>
                    ) : type === "demo" ? "Request demo" : "Send message"}
                  </button>

                  <p className="text-[11px] text-white/20 text-center">We never share your information with third parties.</p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
    </>
  );
}
