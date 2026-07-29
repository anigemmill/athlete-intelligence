import React, { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "wouter";
import { Send, Sparkles, User, Database, TrendingUp, Users, GitBranch, BarChart2, FileText } from "lucide-react";
import { useAuthFetch } from "@/lib/useAuthFetch";

type Message = {
  role: "user" | "assistant";
  content: string;
  followUps?: string[];
  phase?: string;
  streaming?: boolean;
};

const SUGGESTION_GROUPS = [
  {
    label: "Athlete Research",
    icon: <User size={12} />,
    questions: [
      "Tell me about the highest-ranked athlete in my roster",
      "What has changed recently for athletes in my roster?",
      "Summarise the career arc of an athlete in my roster",
    ],
  },
  {
    label: "Discovery",
    icon: <Database size={12} />,
    questions: [
      "Show me all athletes by world ranking",
      "Which athletes are under 23 years old?",
      "Find athletes from New Zealand in my roster",
    ],
  },
  {
    label: "Relationships",
    icon: <GitBranch size={12} />,
    questions: [
      "Which athletes share the same coach?",
      "Who manages athletes in my roster?",
      "Which athletes have the same sponsor?",
    ],
  },
  {
    label: "Trends",
    icon: <TrendingUp size={12} />,
    questions: [
      "Which athletes have had the most media coverage recently?",
      "Show me recent sponsorship activity across the roster",
      "Which athletes have had career changes this year?",
    ],
  },
];

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("FOLLOW_UP:")) { i++; continue; }

    if (line.startsWith("## ")) {
      nodes.push(
        <h2 key={i} className="text-[14px] font-bold mt-4 mb-1.5 first:mt-0 pb-1" style={{ color: "rgba(255,255,255,0.92)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          {inlineFormat(line.slice(3))}
        </h2>
      );
      i++; continue;
    }
    if (line.startsWith("### ")) {
      nodes.push(
        <h3 key={i} className="text-[13px] font-semibold mt-3 mb-1 first:mt-0" style={{ color: "rgba(255,255,255,0.80)" }}>
          {inlineFormat(line.slice(4))}
        </h3>
      );
      i++; continue;
    }
    if (line.trim() === "---") {
      nodes.push(<div key={i} className="my-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} />);
      i++; continue;
    }
    if (line.startsWith("- ") || line.startsWith("• ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("• "))) {
        items.push(lines[i].slice(2)); i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="space-y-1 my-1.5">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-[13px]" style={{ color: "rgba(255,255,255,0.70)" }}>
              <span className="w-1 h-1 rounded-full shrink-0 mt-2" style={{ background: "#B9FF4A" }} />
              <span>{inlineFormat(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, "")); i++;
      }
      nodes.push(
        <ol key={`ol-${i}`} className="space-y-1 my-1.5">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-[13px]" style={{ color: "rgba(255,255,255,0.70)" }}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: "rgba(185,255,74,0.12)", color: "#B9FF4A" }}>{j + 1}</span>
              <span className="pt-0.5">{inlineFormat(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }
    if (line.startsWith("**Overall confidence:**")) {
      const [, rest] = line.split("**Overall confidence:**");
      const confText = (rest ?? "").trim();
      const isHigh = confText.toLowerCase().startsWith("high");
      const isMod = confText.toLowerCase().startsWith("moderate");
      const color = isHigh ? "#4ade80" : isMod ? "#fbbf24" : "#f87171";
      nodes.push(
        <div key={i} className="flex items-center gap-2 my-2 px-3 py-2 rounded-lg text-[12px]" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <span className="font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>Confidence:</span>
          <span className="font-semibold" style={{ color }}>{confText}</span>
        </div>
      );
      i++; continue;
    }
    if (!line.trim()) {
      nodes.push(<div key={i} className="h-2" />);
      i++; continue;
    }
    nodes.push(
      <p key={i} className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.70)" }}>
        {inlineFormat(line)}
      </p>
    );
    i++;
  }
  return nodes;
}

function inlineFormat(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className="font-mono text-[11px] px-1.5 py-0.5 rounded" style={{ background: "rgba(185,255,74,0.10)", color: "#B9FF4A" }}>{part.slice(1, -1)}</code>;
    return part;
  });
}

function parseFollowUps(content: string): { text: string; followUps: string[] } {
  const followUpMatch = content.match(/^FOLLOW_UP:\s*(.+)$/m);
  if (!followUpMatch) return { text: content, followUps: [] };
  const followUps = followUpMatch[1].split("|").map((q) => q.trim()).filter(Boolean);
  const text = content.replace(/^---\s*\nFOLLOW_UP:.+$/m, "").replace(/^FOLLOW_UP:.+$/m, "").trimEnd();
  return { text, followUps };
}

function PhaseIndicator({ phase }: { phase: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="flex items-center gap-1">
        {[0, 150, 300].map((delay) => (
          <div key={delay} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#B9FF4A", animationDelay: `${delay}ms` }} />
        ))}
      </div>
      <span className="text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.50)" }}>{phase}</span>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const authFetch = useAuthFetch();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentPhase]);

  const send = async (text: string) => {
    if (!text.trim() || streaming) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const history = messages.filter((m) => !m.streaming).map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setStreaming(true);
    setCurrentPhase("Searching roster…");
    setMessages((m) => [...m, { role: "assistant", content: "", streaming: true }]);
    const abort = new AbortController();
    abortRef.current = abort;
    try {
      const resp = await authFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), history }),
        signal: abort.signal,
      });
      if (!resp.ok || !resp.body) throw new Error("Stream failed");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let rawContent = "";
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
            if (evt.phase) setCurrentPhase(evt.phase);
            if (evt.token) {
              rawContent += evt.token;
              setCurrentPhase(null);
              setMessages((m) => {
                const last = m[m.length - 1];
                if (last?.role !== "assistant") return m;
                return [...m.slice(0, -1), { ...last, content: last.content + evt.token, streaming: true }];
              });
            }
            if (evt.done) {
              const { text: cleanText, followUps } = parseFollowUps(rawContent);
              setCurrentPhase(null);
              setMessages((m) => {
                const last = m[m.length - 1];
                if (last?.role !== "assistant") return m;
                return [...m.slice(0, -1), { ...last, content: cleanText, followUps, streaming: false }];
              });
            }
            if (evt.error) {
              setCurrentPhase(null);
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
        setCurrentPhase(null);
        setMessages((m) => {
          const last = m[m.length - 1];
          if (last?.role !== "assistant") return m;
          return [...m.slice(0, -1), { ...last, content: "Something went wrong. Please try again.", streaming: false }];
        });
      }
    } finally {
      setStreaming(false);
      setCurrentPhase(null);
      abortRef.current = null;
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const abort = () => {
    abortRef.current?.abort();
    setStreaming(false);
    setCurrentPhase(null);
    setMessages((m) => {
      const last = m[m.length - 1];
      if (last?.role === "assistant" && last.streaming) return [...m.slice(0, -1), { ...last, streaming: false }];
      return m;
    });
  };

  const isEmpty = messages.length === 0;

  return (
    <AppLayout activePage="chat">
      <div className="flex flex-col h-full" style={{ background: "#0D1C0B" }}>

        {/* Header */}
        <header className="flex-shrink-0 px-8 pt-7 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(185,255,74,0.15)", border: "1px solid rgba(185,255,74,0.25)" }}>
                  <Sparkles size={13} style={{ color: "#B9FF4A" }} />
                </div>
                <h1 className="text-[18px] font-semibold tracking-tight text-white">AI Analyst</h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(185,255,74,0.10)", color: "#B9FF4A", border: "1px solid rgba(185,255,74,0.20)" }}>LIVE DATA</span>
              </div>
              <p className="text-[13px] mt-1 ml-9" style={{ color: "rgba(255,255,255,0.45)" }}>
                Ask anything about athletes in your roster. Every answer is grounded in your real intelligence data.
              </p>
            </div>
            {!isEmpty && (
              <button
                onClick={() => setMessages([])}
                className="text-[12px] px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: "rgba(255,255,255,0.40)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.40)"; }}
              >
                New conversation
              </button>
            )}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-6 hide-scrollbar">
          {isEmpty ? (
            <div className="max-w-2xl mx-auto">
              {/* Welcome */}
              <div className="flex items-start gap-3 mb-8">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "rgba(185,255,74,0.15)", border: "1px solid rgba(185,255,74,0.20)" }}>
                  <Sparkles size={12} style={{ color: "#B9FF4A" }} />
                </div>
                <div className="flex-1 rounded-2xl rounded-tl-sm p-5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
                  <p className="text-[14px] font-semibold text-white mb-1">Athlete Intelligence Analyst</p>
                  <p className="text-[13px] leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.55)" }}>
                    I have full access to the intelligence database for every athlete in your monitored roster — results, rankings, contacts, career history, sponsorships, and media activity.
                  </p>
                  <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                    Ask me to research an athlete, compare performance, find shared relationships, identify trends, or generate a briefing. Every answer is sourced from your live platform data — I will never invent facts.
                  </p>
                </div>
              </div>

              {/* Suggestions */}
              <div className="space-y-5">
                {SUGGESTION_GROUPS.map((group) => (
                  <div key={group.label}>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.30)" }}>
                      <span style={{ color: "rgba(255,255,255,0.25)" }}>{group.icon}</span>
                      {group.label}
                    </div>
                    <div className="space-y-1.5">
                      {group.questions.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => send(q)}
                          disabled={streaming}
                          className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] transition-all group disabled:opacity-50"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.70)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(185,255,74,0.25)"; e.currentTarget.style.background = "rgba(185,255,74,0.04)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                        >
                          <Sparkles size={12} className="shrink-0 transition-colors" style={{ color: "rgba(255,255,255,0.22)" }} />
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-5">
              {messages.map((msg, i) => (
                <div key={i}>
                  <div className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: msg.role === "user" ? "rgba(185,255,74,0.15)" : "rgba(255,255,255,0.07)", border: msg.role === "user" ? "1px solid rgba(185,255,74,0.25)" : "1px solid rgba(255,255,255,0.10)" }}
                    >
                      {msg.role === "user"
                        ? <User size={12} style={{ color: "#B9FF4A" }} />
                        : <Sparkles size={12} style={{ color: "rgba(255,255,255,0.60)" }} />
                      }
                    </div>
                    <div className={`flex-1 ${msg.role === "user" ? "flex justify-end" : ""}`}>
                      <div className={msg.role === "user"
                        ? "inline-block max-w-[85%] px-4 py-3 rounded-2xl rounded-tr-sm text-[13px] leading-relaxed"
                        : "w-full px-5 py-4 rounded-2xl rounded-tl-sm"
                      }
                        style={msg.role === "user"
                          ? { background: "rgba(185,255,74,0.10)", border: "1px solid rgba(185,255,74,0.18)", color: "rgba(255,255,255,0.88)" }
                          : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }
                        }
                      >
                        {msg.role === "user" ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <>
                            {msg.streaming && !msg.content && (
                              <PhaseIndicator phase={currentPhase ?? "Thinking…"} />
                            )}
                            {msg.content ? (
                              <div className="space-y-0.5">
                                {renderMarkdown(msg.content)}
                                {msg.streaming && (
                                  <span className="inline-block w-0.5 h-3.5 ml-0.5 align-text-bottom animate-pulse" style={{ background: "#B9FF4A" }} />
                                )}
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {msg.role === "assistant" && !msg.streaming && msg.followUps && msg.followUps.length > 0 && (
                    <div className="ml-10 mt-2 flex flex-wrap gap-2">
                      {msg.followUps.map((q, j) => (
                        <button
                          key={j}
                          onClick={() => send(q)}
                          disabled={streaming}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-all disabled:opacity-50"
                          style={{ background: "rgba(200,189,255,0.07)", border: "1px solid rgba(200,189,255,0.18)", color: "#C8BDFF" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(200,189,255,0.12)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(200,189,255,0.07)"; }}
                        >
                          <Sparkles size={10} />
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {streaming && currentPhase && messages[messages.length - 1]?.content === "" && (
                <div className="ml-10">
                  <PhaseIndicator phase={currentPhase} />
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="flex-shrink-0 px-8 pb-6 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "#0D1C0B" }}>
          <div className="max-w-2xl mx-auto">
            <div className="relative flex items-end rounded-2xl transition-all" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}
              onFocusCapture={(e) => e.currentTarget.style.borderColor = "rgba(185,255,74,0.40)"}
              onBlurCapture={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"}
            >
              <label htmlFor="chat-input" className="sr-only">Message</label>
              <textarea
                id="chat-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about athletes, compare results, explore relationships…"
                rows={1}
                disabled={streaming}
                maxLength={10000}
                aria-label="Message input"
                aria-describedby="chat-hint"
                className="flex-1 resize-none px-4 py-3.5 bg-transparent text-[13px] focus:outline-none max-h-32 disabled:opacity-60"
                style={{ color: "rgba(255,255,255,0.88)", minHeight: 52 }}
              />
              {streaming ? (
                <button onClick={abort} aria-label="Stop generating" className="m-2 px-3 h-8 rounded-xl text-[11px] font-medium transition-colors" style={{ color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.07)" }}>
                  Stop
                </button>
              ) : (
                <button
                  onClick={() => send(input)}
                  disabled={!input.trim()}
                  aria-label="Send message"
                  className="m-2 w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                  style={input.trim() ? { background: "#B9FF4A" } : { background: "rgba(255,255,255,0.08)", cursor: "not-allowed" }}
                >
                  <Send size={14} style={{ color: input.trim() ? "#0D1C0B" : "rgba(255,255,255,0.25)" }} />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between mt-2 px-1">
              <p id="chat-hint" className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                Answers are grounded in your live intelligence database. Verify critical decisions independently.
              </p>
              {input.length > 8000 && (
                <p className="text-[11px] flex-shrink-0 ml-3" style={{ color: input.length >= 10000 ? "#f87171" : "rgba(255,255,255,0.25)" }}>
                  {input.length.toLocaleString()}/10,000
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
