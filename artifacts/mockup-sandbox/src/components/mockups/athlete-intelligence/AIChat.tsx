import React, { useState, useRef, useEffect } from "react";
import { AppLayout } from "./_shared/AppLayout";
import "./_group.css";
import {
  Send, Sparkles, ExternalLink, ShieldCheck, ChevronRight,
  RotateCcw, Copy, ThumbsUp, ThumbsDown, ChevronDown,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "user" | "assistant";

interface Source {
  domain: string;
  date: string;
  confidence: number;
}

interface Message {
  id: string;
  role: Role;
  text: string;
  sources?: Source[];
  timestamp: string;
}

// ─── Seed conversation ────────────────────────────────────────────────────────

const seedMessages: Message[] = [
  {
    id: "m1",
    role: "user",
    text: "Summarise Lola Anderson's career so far.",
    timestamp: "09:41",
  },
  {
    id: "m2",
    role: "assistant",
    text: "Lola Anderson is a 22-year-old New Zealand sprinter specialising in the 100m and 200m. She has developed rapidly since her first national junior title in 2022, and is now ranked 3rd nationally.\n\nHer career to date has featured three major phases:\n\n**2022 — Breakthrough.** Won the NZ Junior 100m title in 11.48s and earned her first national representative selection for the Pacific Games preparation squad.\n\n**2023 — International emergence.** Took silver at the Oceania Athletics Championships (11.31s) and then posted a personal best of 11.24s at the NZ Track & Field Championships — moving her to World Rank #156 for the first time.\n\n**2024 — Professionalisation.** Transferred to coach David Liti at AUT Millennium, signed with Elite Sport Management NZ, secured a 2-year Puma Oceania ambassadorship, and won her season opener in 11.28s. Named in the ANZ High Performance squad.\n\nTrajectory indicators are strongly positive. The coaching change, commercial growth, and consistent sub-11.30s form suggest she is entering a sustained performance period ahead of the 2026 Oceania Championships.",
    sources: [
      { domain: "athletics.org.nz", date: "12 Mar 2024", confidence: 99 },
      { domain: "worldathletics.org", date: "Oct 2023", confidence: 99 },
      { domain: "sportsbusinessjournal.com", date: "05 Mar 2024", confidence: 88 },
    ],
    timestamp: "09:41",
  },
  {
    id: "m3",
    role: "user",
    text: "Who manages this athlete and how should we contact them?",
    timestamp: "09:43",
  },
  {
    id: "m4",
    role: "assistant",
    text: "Lola Anderson is represented by **James Whitfield** at **Elite Sport Management NZ**.\n\nFor different enquiry types:\n\n- **Commercial & sponsorship enquiries** → Elite Sport Management NZ directly. Their public contact is listed at elitesportnz.co.nz.\n- **Competition & selection matters** → Athletics New Zealand (enquiries@athletics.org.nz). She is part of the ANZ High Performance sprint programme.\n- **Media requests** → Route through Elite Sport Management NZ. No direct media contact has been publicly listed.\n\nAll contacts are sourced from publicly available information only. The management relationship was confirmed at 97% confidence across two independent sources in January and March 2024.",
    sources: [
      { domain: "athletics.org.nz", date: "08 Jan 2024", confidence: 97 },
      { domain: "nzherald.co.nz", date: "12 Mar 2024", confidence: 95 },
    ],
    timestamp: "09:43",
  },
  {
    id: "m5",
    role: "user",
    text: "How has her social media grown over the last 30 days?",
    timestamp: "09:45",
  },
  {
    id: "m6",
    role: "assistant",
    text: "Based on publicly tracked data across her three active platforms:\n\n**Instagram** (@lolaanderson_nz) — 12,400 followers, **+8.3% in 30 days**. Engagement rate of 4.2%, which is strong for an athlete at this following level. Growth correlates with the Puma announcement and NZ Herald feature.\n\n**TikTok** (@lolasprints) — 8,900 followers, **+23.4% in 30 days** — the standout growth metric. Short-form training and race content is gaining significant traction. 6.7% engagement rate is well above platform average.\n\n**X** (@lola_anderson) — 3,200 followers, +2.1% — modest but steady. Lower engagement (1.8%) consistent with the platform trend for athletes without a strong existing following there.\n\nThe TikTok growth trajectory in particular suggests an organic audience-building moment. If sustained, it could become relevant to sponsorship conversations within the next 6 months.",
    sources: [
      { domain: "Public platform data", date: "18 Jul 2026", confidence: 91 },
    ],
    timestamp: "09:45",
  },
];

const suggestedQuestions = [
  "Compare her 2023 vs 2024 form",
  "Which sponsors has she worked with?",
  "What changed this month?",
  "What are her upcoming competitions?",
  "Who are her main rivals in NZ?",
  "What coaching changes has she made?",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SourceChip({ source }: { source: Source }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium"
      style={{ background: "rgba(41,48,85,0.06)", border: "1px solid rgba(41,48,85,0.10)" }}>
      <ExternalLink size={9} className="text-[#9097B0]" />
      <span className="text-[#344F9F]">{source.domain}</span>
      <span className="text-[#C0C8DC]">·</span>
      <ShieldCheck size={9} className={source.confidence >= 95 ? "text-[#059669]" : "text-[#d97706]"} />
      <span className="text-[#8A90A8]">{source.confidence}%</span>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-lg rounded-2xl rounded-tr-md px-4 py-3" style={{ background: "#293055" }}>
          <p className="text-[14px] leading-relaxed" style={{ color: "rgba(252,250,250,0.92)" }}>{msg.text}</p>
          <div className="text-[10px] mt-1.5 text-right" style={{ color: "rgba(252,250,250,0.35)" }}>{msg.timestamp}</div>
        </div>
      </div>
    );
  }

  // Parse bold markdown
  const renderText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-semibold text-[#1C1F3A]">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="mb-5">
      <div className="flex items-start gap-3 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: "linear-gradient(135deg, #E75D50, #C84840)" }}>
          <Sparkles size={13} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-[#8A90A8] mb-1.5">Athlete Intelligence AI · {msg.timestamp}</div>
          <div className="rounded-2xl rounded-tl-md border border-[rgba(41,48,85,0.09)] bg-white px-5 py-4">
            <div className="text-[14px] text-[#3D426A] leading-relaxed whitespace-pre-line">
              {msg.text.split("\n").map((line, i) => (
                <p key={i} className={line.startsWith("**") || line === "" ? (line === "" ? "mb-2" : "mb-1") : "mb-1"}>
                  {renderText(line)}
                </p>
              ))}
            </div>
          </div>

          {/* Sources */}
          {msg.sources && msg.sources.length > 0 && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-[#A0A8C0] font-medium">Sources:</span>
              {msg.sources.map((s, i) => <SourceChip key={i} source={s} />)}
            </div>
          )}

          {/* Actions */}
          <div className="mt-2 flex items-center gap-2">
            <button className="flex items-center gap-1 text-[11px] text-[#A0A8C0] hover:text-[#293055] transition-colors px-2 py-1 rounded-lg hover:bg-[rgba(41,48,85,0.06)]">
              <Copy size={11} /> Copy
            </button>
            <button className="flex items-center gap-1 text-[11px] text-[#A0A8C0] hover:text-[#059669] transition-colors px-2 py-1 rounded-lg hover:bg-[rgba(16,185,129,0.06)]">
              <ThumbsUp size={11} /> Helpful
            </button>
            <button className="flex items-center gap-1 text-[11px] text-[#A0A8C0] hover:text-[#ef4444] transition-colors px-2 py-1 rounded-lg hover:bg-[rgba(239,68,68,0.06)]">
              <ThumbsDown size={11} /> Not helpful
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AIChat() {
  const [messages, setMessages] = useState<Message[]>(seedMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [scope, setScope] = useState<"athlete" | "org">("athlete");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = (text: string = input) => {
    if (!text.trim()) return;
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    setMessages((prev) => [...prev, { id: `m${Date.now()}`, role: "user", text: text.trim(), timestamp: ts }]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `m${Date.now() + 1}`,
          role: "assistant",
          text: "I'm analysing the latest intelligence data for this query. This is a mockup — in production, the response would draw from all crawled sources, ranked by recency and confidence.",
          sources: [{ domain: "athlete-intelligence.ai", date: "Today", confidence: 94 }],
          timestamp: ts,
        },
      ]);
    }, 1800);
  };

  return (
    <AppLayout activePage="feed">
      <div className="athlete-intelligence-root h-full flex flex-col bg-[#FCFAFA] overflow-hidden">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

        {/* ── Header ── */}
        <div className="h-14 border-b border-[rgba(41,48,85,0.10)] flex items-center px-6 shrink-0 bg-[#FCFAFA]">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#8A90A8]">
            <Sparkles size={14} className="text-[#E75D50]" />
            <span className="text-[#293055] font-semibold">AI Intelligence Chat</span>
          </div>

          {/* Scope toggle */}
          <div className="ml-6 flex items-center gap-1 rounded-lg border border-[rgba(41,48,85,0.12)] bg-white p-0.5 text-[12px]">
            {[
              { id: "athlete", label: "Lola Anderson" },
              { id: "org", label: "All Athletes" },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setScope(id as "athlete" | "org")}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  scope === id ? "bg-[#293055] text-white" : "text-[#8A90A8] hover:text-[#293055]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button className="flex items-center gap-1.5 text-[12px] font-medium text-[#8A90A8] hover:text-[#293055] transition-colors border border-[rgba(41,48,85,0.12)] rounded-lg px-3 py-1.5 bg-white">
              <RotateCcw size={12} />
              New chat
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">

          {/* Left sidebar: context + suggestions */}
          <div className="flex flex-col border-r border-[rgba(41,48,85,0.10)] overflow-hidden shrink-0" style={{ width: 260 }}>
            {/* Athlete context */}
            <div className="px-4 py-4 border-b border-[rgba(41,48,85,0.08)]">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#A0A8C0] mb-3">Current Context</div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-[rgba(41,48,85,0.12)] shrink-0">
                  <img src="/__mockup/images/lola-anderson.jpg" className="w-full h-full object-cover" alt="Lola Anderson" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-[#1C1F3A]">Lola Anderson</div>
                  <div className="text-[11px] text-[#8A90A8]">100m · Athletics NZ</div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#8A90A8] bg-[rgba(41,48,85,0.04)] rounded-lg px-3 py-2 border border-[rgba(41,48,85,0.07)]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                47 sources available · Updated 12m ago
              </div>
            </div>

            {/* Suggested questions */}
            <div className="flex-1 overflow-y-auto hide-scrollbar px-3 py-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#A0A8C0] mb-2 px-1">Suggested Questions</div>
              <div className="space-y-1">
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-[12px] text-[#6B7080] hover:bg-[rgba(41,48,85,0.06)] hover:text-[#293055] transition-all border border-transparent hover:border-[rgba(41,48,85,0.10)]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="px-4 py-3 border-t border-[rgba(41,48,85,0.08)]">
              <p className="text-[10px] text-[#A0A8C0] leading-relaxed">
                All AI responses reference publicly available sources only. Every claim includes source attribution and confidence score.
              </p>
            </div>
          </div>

          {/* Main chat area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto hide-scrollbar px-8 py-6">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}

              {isTyping && (
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, #E75D50, #C84840)" }}>
                    <Sparkles size={13} className="text-white" />
                  </div>
                  <div className="rounded-2xl rounded-tl-md border border-[rgba(41,48,85,0.09)] bg-white px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-[#9097B0] animate-bounce"
                          style={{ animationDelay: `${i * 150}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-6 py-4 border-t border-[rgba(41,48,85,0.10)] bg-[#FCFAFA] shrink-0">
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Ask anything about Lola Anderson…"
                    rows={1}
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-[rgba(41,48,85,0.15)] bg-white text-[14px] text-[#1C1F3A] placeholder-[#A0A8C0] resize-none focus:outline-none focus:ring-1 focus:ring-[#E75D50] focus:border-[#E75D50] transition-all leading-relaxed"
                    style={{ maxHeight: 120 }}
                  />
                  <div className="absolute right-3 bottom-3 text-[10px] text-[#C0C8DC]">⏎ Send</div>
                </div>
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
                  style={{ background: input.trim() ? "#E75D50" : "rgba(41,48,85,0.10)" }}
                >
                  <Send size={16} className={input.trim() ? "text-white" : "text-[#9097B0]"} />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-[#A0A8C0]">
                <ShieldCheck size={10} />
                <span>Responses always include source attribution · Public information only · Confidence-scored</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
