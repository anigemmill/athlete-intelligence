import React, { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Send, Sparkles, User } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string; sources?: string[] };

const SUGGESTED = [
  "Compare Zoe Hobbs and Catriona Bisset's recent performance trajectory",
  "Which athletes in my roster have had coaching changes in the last 6 months?",
  "Summarise the latest sponsorship activity across my monitored athletes",
  "Who are the fastest improving athletes in middle-distance running right now?",
  "What competitions does Hamish Kerr have coming up this season?",
];

const WELCOME = `I'm your Athlete Intelligence assistant. I have full context on every athlete in your roster, their intelligence history, competition schedules, contacts, and recent news.

Ask me to compare athletes, summarise a career, find sponsorship trends, or surface insights across your entire watchlist.`;

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), history: messages }),
      });
      const data = await resp.json();
      setMessages((m) => [...m, {
        role: "assistant",
        content: data.response || data.message || "I couldn't process that request. Please try again.",
        sources: data.sources,
      }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const isEmpty = messages.length === 0;

  return (
    <AppLayout activePage="chat">
      <div className="flex flex-col h-full bg-[#FCFAFA]">
        {/* Header */}
        <header className="flex-shrink-0 px-8 pt-7 pb-5 border-b border-[#DCE2EF]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#344F9F] to-[#293055] flex items-center justify-center">
              <Sparkles size={13} className="text-white" />
            </div>
            <h1 className="text-[18px] font-semibold tracking-tight text-[#1C1F3A]">AI Chat</h1>
          </div>
          <p className="text-[13px] mt-1 text-[#6B7080] ml-9.5">Ask anything about athletes in your roster. Powered by your intelligence data.</p>
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-8 py-6 hide-scrollbar">
          {isEmpty ? (
            <div className="max-w-2xl mx-auto">
              {/* Welcome */}
              <div className="flex items-start gap-3 mb-8">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#344F9F] to-[#293055] flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={12} className="text-white" />
                </div>
                <div className="flex-1 bg-white border border-[#DCE2EF] rounded-2xl rounded-tl-sm p-4 shadow-sm">
                  <p className="text-[13px] text-[#1C1F3A] leading-relaxed whitespace-pre-line">{WELCOME}</p>
                </div>
              </div>

              {/* Suggested queries */}
              <div>
                <div className="text-[11px] font-semibold text-[#8A90A8] uppercase tracking-wider mb-3">Suggested questions</div>
                <div className="space-y-2">
                  {SUGGESTED.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => send(s)}
                      className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-[#DCE2EF] hover:border-[#B0B8D0] hover:shadow-sm text-[13px] text-[#1C1F3A] transition-all group"
                    >
                      <Sparkles size={13} className="text-[#A0A8C0] shrink-0 group-hover:text-[#344F9F] transition-colors" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-5">
              {messages.map((msg, i) => (
                <div key={i} className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${msg.role === "user" ? "bg-gradient-to-br from-[#E75D50] to-[#C84840]" : "bg-gradient-to-br from-[#344F9F] to-[#293055]"}`}>
                    {msg.role === "user" ? <User size={12} className="text-white" /> : <Sparkles size={12} className="text-white" />}
                  </div>
                  <div className={`flex-1 ${msg.role === "user" ? "flex justify-end" : ""}`}>
                    <div className={`inline-block max-w-full px-4 py-3 rounded-2xl text-[13px] leading-relaxed shadow-sm ${msg.role === "user" ? "bg-[#293055] text-white rounded-tr-sm" : "bg-white border border-[#DCE2EF] text-[#1C1F3A] rounded-tl-sm"}`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[#DCE2EF] space-y-1">
                          <div className="text-[10px] font-semibold text-[#8A90A8] uppercase tracking-wider">Sources</div>
                          {msg.sources.map((src, si) => (
                            <div key={si} className="text-[11px] text-[#6B7080] flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-[#DCE2EF] shrink-0" />
                              {src}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#344F9F] to-[#293055] flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles size={12} className="text-white" />
                  </div>
                  <div className="bg-white border border-[#DCE2EF] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#DCE2EF] animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#DCE2EF] animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#DCE2EF] animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex-shrink-0 px-8 pb-6 pt-3 border-t border-[#DCE2EF] bg-[#FCFAFA]">
          <div className="max-w-2xl mx-auto">
            <div className="relative flex items-end bg-white border border-[#DCE2EF] rounded-2xl shadow-sm focus-within:border-[#293055] focus-within:ring-2 focus-within:ring-[#293055]/10 transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask anything about your athletes…"
                rows={1}
                className="flex-1 resize-none px-4 py-3.5 bg-transparent text-[13px] text-[#1C1F3A] placeholder:text-[#A0A8C0] focus:outline-none max-h-32"
                style={{ minHeight: 52 }}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                className={`m-2 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${input.trim() && !loading ? "bg-[#293055] hover:bg-[#1e2440] text-white shadow-sm" : "bg-[#DCE2EF] text-[#A0A8C0] cursor-not-allowed"}`}
              >
                <Send size={14} />
              </button>
            </div>
            <p className="text-[11px] text-[#A0A8C0] text-center mt-2">AI responses are grounded in your intelligence data. Always verify critical decisions.</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
