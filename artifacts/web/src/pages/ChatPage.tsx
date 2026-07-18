import React, { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Send, Sparkles, User, Zap } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
  toolCalls?: string[];
  streaming?: boolean;
};

const SUGGESTED = [
  "Who are the highest-ranked athletes in my roster right now?",
  "Which athletes have had coaching changes in the last 6 months?",
  "Summarise the latest sponsorship activity across my monitored athletes",
  "Compare the competition results of athletes in my roster",
  "What competitions are coming up in the next month?",
  "Which athletes have the strongest social media engagement?",
];

const WELCOME = `I'm your Athlete Intelligence assistant. I have full context on every athlete in your monitored roster — their intelligence history, competition results, career timelines, and contacts.

Ask me to compare athletes, surface sponsorship trends, analyse career trajectories, or find anything across your watchlist.`;

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || streaming) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const history = messages.filter((m) => !m.streaming).map((m) => ({ role: m.role, content: m.content }));

    setMessages((m) => [...m, userMsg]);
    setInput("");
    setStreaming(true);

    // Add placeholder assistant message
    const placeholderIdx = messages.length + 1;
    setMessages((m) => [...m, { role: "assistant", content: "", streaming: true }]);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), history }),
        signal: abort.signal,
      });

      if (!resp.ok || !resp.body) {
        throw new Error("Stream request failed");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          try {
            const evt = JSON.parse(raw);

            if (evt.token) {
              setMessages((m) => {
                const last = m[m.length - 1];
                if (last?.role !== "assistant") return m;
                return [...m.slice(0, -1), { ...last, content: last.content + evt.token, streaming: true }];
              });
            }

            if (evt.toolCall) {
              setMessages((m) => {
                const last = m[m.length - 1];
                if (last?.role !== "assistant") return m;
                return [...m.slice(0, -1), { ...last, toolCalls: evt.toolCall, streaming: true }];
              });
            }

            if (evt.done) {
              setMessages((m) => {
                const last = m[m.length - 1];
                if (last?.role !== "assistant") return m;
                return [...m.slice(0, -1), { ...last, streaming: false }];
              });
            }

            if (evt.error) {
              setMessages((m) => {
                const last = m[m.length - 1];
                if (last?.role !== "assistant") return m;
                return [...m.slice(0, -1), { ...last, content: `Something went wrong: ${evt.error}`, streaming: false }];
              });
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages((m) => {
          const last = m[m.length - 1];
          if (last?.role !== "assistant") return m;
          return [...m.slice(0, -1), { ...last, content: "Something went wrong. Please try again.", streaming: false }];
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
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
            <span className="ml-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(52,79,159,0.10)] text-[#344F9F] border border-[rgba(52,79,159,0.18)]">LIVE</span>
          </div>
          <p className="text-[13px] mt-1 text-[#6B7080] ml-9">Ask anything about athletes in your roster. Powered by your real intelligence data.</p>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-6 hide-scrollbar">
          {isEmpty ? (
            <div className="max-w-2xl mx-auto">
              <div className="flex items-start gap-3 mb-8">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#344F9F] to-[#293055] flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={12} className="text-white" />
                </div>
                <div className="flex-1 bg-white border border-[#DCE2EF] rounded-2xl rounded-tl-sm p-4 shadow-sm">
                  <p className="text-[13px] text-[#1C1F3A] leading-relaxed whitespace-pre-line">{WELCOME}</p>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-[#8A90A8] uppercase tracking-wider mb-3">Suggested questions</div>
                <div className="space-y-2">
                  {SUGGESTED.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => send(s)}
                      disabled={streaming}
                      className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-[#DCE2EF] hover:border-[#B0B8D0] hover:shadow-sm text-[13px] text-[#1C1F3A] transition-all group disabled:opacity-50"
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

                      {/* Tool call indicator */}
                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-[#F0F2F8]">
                          <Zap size={10} className="text-[#344F9F]" />
                          <span className="text-[10px] text-[#344F9F] font-medium">
                            Looking up {msg.toolCalls.map((t) => t.replace("get_athlete_", "").replace(/_/g, " ")).join(", ")}…
                          </span>
                        </div>
                      )}

                      {msg.content ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : msg.streaming ? (
                        <div className="flex items-center gap-1.5 h-4">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#DCE2EF] animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-[#DCE2EF] animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-[#DCE2EF] animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      ) : null}

                      {/* Blinking cursor while streaming */}
                      {msg.streaming && msg.content && (
                        <span className="inline-block w-0.5 h-3.5 bg-[#344F9F] ml-0.5 align-text-bottom animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
                disabled={streaming}
                className="flex-1 resize-none px-4 py-3.5 bg-transparent text-[13px] text-[#1C1F3A] placeholder:text-[#A0A8C0] focus:outline-none max-h-32 disabled:opacity-60"
                style={{ minHeight: 52 }}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || streaming}
                className={`m-2 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${input.trim() && !streaming ? "bg-[#293055] hover:bg-[#1e2440] text-white shadow-sm" : "bg-[#DCE2EF] text-[#A0A8C0] cursor-not-allowed"}`}
              >
                <Send size={14} />
              </button>
            </div>
            <p className="text-[11px] text-[#A0A8C0] text-center mt-2">Responses are grounded in your live intelligence data. Always verify critical decisions independently.</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
