import React, { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "wouter";
import { Send, Sparkles, User, Database, TrendingUp, Users, GitBranch, BarChart2, FileText } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
  followUps?: string[];
  phase?: string;
  streaming?: boolean;
};

// ── Suggested questions by capability ────────────────────────────────────────

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

const ALL_SUGGESTIONS = SUGGESTION_GROUPS.flatMap((g) => g.questions);

// ── Markdown renderer ─────────────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip FOLLOW_UP line entirely
    if (line.startsWith("FOLLOW_UP:")) { i++; continue; }

    // H2
    if (line.startsWith("## ")) {
      nodes.push(
        <h2 key={i} className="text-[14px] font-bold text-[#1C1F3A] mt-4 mb-1.5 first:mt-0 border-b border-[#EEF0F8] pb-1">
          {inlineFormat(line.slice(3))}
        </h2>
      );
      i++; continue;
    }

    // H3
    if (line.startsWith("### ")) {
      nodes.push(
        <h3 key={i} className="text-[13px] font-semibold text-[#293055] mt-3 mb-1 first:mt-0">
          {inlineFormat(line.slice(4))}
        </h3>
      );
      i++; continue;
    }

    // HR divider
    if (line.trim() === "---") {
      nodes.push(<div key={i} className="border-t border-[#EEF0F8] my-3" />);
      i++; continue;
    }

    // Bullet list
    if (line.startsWith("- ") || line.startsWith("• ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("• "))) {
        items.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="space-y-1 my-1.5">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-[13px] text-[#3D426A]">
              <span className="w-1 h-1 rounded-full bg-[#E75D50] shrink-0 mt-2" />
              <span>{inlineFormat(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      nodes.push(
        <ol key={`ol-${i}`} className="space-y-1 my-1.5">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-[13px] text-[#3D426A]">
              <span className="w-5 h-5 rounded-full bg-[#EEF0F8] flex items-center justify-center text-[10px] font-bold text-[#6B7080] shrink-0">{j + 1}</span>
              <span className="pt-0.5">{inlineFormat(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Confidence line
    if (line.startsWith("**Overall confidence:**")) {
      const [, rest] = line.split("**Overall confidence:**");
      const confText = (rest ?? "").trim();
      const isHigh = confText.toLowerCase().startsWith("high");
      const isMod = confText.toLowerCase().startsWith("moderate");
      const color = isHigh ? "#059669" : isMod ? "#D97706" : "#E75D50";
      nodes.push(
        <div key={i} className="flex items-center gap-2 my-2 px-3 py-2 rounded-lg bg-[#F8F9FC] border border-[#EEF0F8] text-[12px]">
          <span className="font-semibold text-[#6B7080]">Confidence:</span>
          <span className="font-semibold" style={{ color }}>{confText}</span>
        </div>
      );
      i++; continue;
    }

    // Empty line
    if (!line.trim()) {
      nodes.push(<div key={i} className="h-2" />);
      i++; continue;
    }

    // Regular paragraph
    nodes.push(
      <p key={i} className="text-[13px] text-[#3D426A] leading-relaxed">
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
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-[#1C1F3A]">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="font-mono text-[11px] bg-[#EEF0F8] px-1.5 py-0.5 rounded text-[#344F9F]">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

function parseFollowUps(content: string): { text: string; followUps: string[] } {
  const followUpMatch = content.match(/^FOLLOW_UP:\s*(.+)$/m);
  if (!followUpMatch) return { text: content, followUps: [] };
  const followUps = followUpMatch[1]
    .split("|")
    .map((q) => q.trim())
    .filter(Boolean);
  const text = content.replace(/^---\s*\nFOLLOW_UP:.+$/m, "").replace(/^FOLLOW_UP:.+$/m, "").trimEnd();
  return { text, followUps };
}

// ── Phase label display ───────────────────────────────────────────────────────

function PhaseIndicator({ phase }: { phase: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-[#344F9F] animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="w-1.5 h-1.5 rounded-full bg-[#344F9F] animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="w-1.5 h-1.5 rounded-full bg-[#344F9F] animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span className="text-[12px] text-[#6B7080] font-medium">{phase}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentPhase]);

  const send = async (text: string) => {
    if (!text.trim() || streaming) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const history = messages
      .filter((m) => !m.streaming)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((m) => [...m, userMsg]);
    setInput("");
    setStreaming(true);
    setCurrentPhase("Searching roster…");

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

            if (evt.phase) {
              setCurrentPhase(evt.phase);
            }

            if (evt.token) {
              rawContent += evt.token;
              setCurrentPhase(null);
              setMessages((m) => {
                const last = m[m.length - 1];
                if (last?.role !== "assistant") return m;
                return [
                  ...m.slice(0, -1),
                  { ...last, content: last.content + evt.token, streaming: true },
                ];
              });
            }

            if (evt.done) {
              const { text: cleanText, followUps } = parseFollowUps(rawContent);
              setCurrentPhase(null);
              setMessages((m) => {
                const last = m[m.length - 1];
                if (last?.role !== "assistant") return m;
                return [
                  ...m.slice(0, -1),
                  { ...last, content: cleanText, followUps, streaming: false },
                ];
              });
            }

            if (evt.error) {
              setCurrentPhase(null);
              setMessages((m) => {
                const last = m[m.length - 1];
                if (last?.role !== "assistant") return m;
                return [
                  ...m.slice(0, -1),
                  { ...last, content: `Something went wrong: ${evt.error}`, streaming: false },
                ];
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
          return [
            ...m.slice(0, -1),
            { ...last, content: "Something went wrong. Please try again.", streaming: false },
          ];
        });
      }
    } finally {
      setStreaming(false);
      setCurrentPhase(null);
      abortRef.current = null;
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const abort = () => {
    abortRef.current?.abort();
    setStreaming(false);
    setCurrentPhase(null);
    setMessages((m) => {
      const last = m[m.length - 1];
      if (last?.role === "assistant" && last.streaming) {
        return [...m.slice(0, -1), { ...last, streaming: false }];
      }
      return m;
    });
  };

  const isEmpty = messages.length === 0;

  return (
    <AppLayout activePage="chat">
      <div className="flex flex-col h-full bg-[#FCFAFA]">

        {/* Header */}
        <header className="flex-shrink-0 px-8 pt-7 pb-5 border-b border-[#DCE2EF]">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#344F9F] to-[#293055] flex items-center justify-center">
                  <Sparkles size={13} className="text-white" />
                </div>
                <h1 className="text-[18px] font-semibold tracking-tight text-[#1C1F3A]">AI Analyst</h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(52,79,159,0.10)] text-[#344F9F] border border-[rgba(52,79,159,0.18)]">LIVE DATA</span>
              </div>
              <p className="text-[13px] mt-1 text-[#6B7080] ml-9">
                Ask anything about athletes in your roster. Every answer is grounded in your real intelligence data.
              </p>
            </div>
            {!isEmpty && (
              <button
                onClick={() => setMessages([])}
                className="text-[12px] text-[#9097B0] hover:text-[#6B7080] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#F0F2F8]"
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
              {/* Welcome message */}
              <div className="flex items-start gap-3 mb-8">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#344F9F] to-[#293055] flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={12} className="text-white" />
                </div>
                <div className="flex-1 bg-white border border-[#DCE2EF] rounded-2xl rounded-tl-sm p-5 shadow-sm">
                  <p className="text-[14px] font-semibold text-[#1C1F3A] mb-1">Athlete Intelligence Analyst</p>
                  <p className="text-[13px] text-[#6B7080] leading-relaxed mb-4">
                    I have full access to the intelligence database for every athlete in your monitored roster — results, rankings, contacts, career history, sponsorships, and media activity.
                  </p>
                  <p className="text-[13px] text-[#6B7080] leading-relaxed">
                    Ask me to research an athlete, compare performance, find shared relationships, identify trends, or generate a briefing. Every answer is sourced from your live platform data — I will never invent facts.
                  </p>
                </div>
              </div>

              {/* Capability groups */}
              <div className="space-y-5">
                {SUGGESTION_GROUPS.map((group) => (
                  <div key={group.label}>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8A90A8] uppercase tracking-wider mb-2">
                      <span className="text-[#A0A8C0]">{group.icon}</span>
                      {group.label}
                    </div>
                    <div className="space-y-1.5">
                      {group.questions.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => send(q)}
                          disabled={streaming}
                          className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-[#DCE2EF] hover:border-[#B0B8D0] hover:shadow-sm text-[13px] text-[#293055] transition-all group disabled:opacity-50"
                        >
                          <Sparkles size={12} className="text-[#C0C8DC] shrink-0 group-hover:text-[#344F9F] transition-colors" />
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
                    {/* Avatar */}
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-[#E75D50] to-[#C84840]"
                          : "bg-gradient-to-br from-[#344F9F] to-[#293055]"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <User size={12} className="text-white" />
                      ) : (
                        <Sparkles size={12} className="text-white" />
                      )}
                    </div>

                    {/* Bubble */}
                    <div className={`flex-1 ${msg.role === "user" ? "flex justify-end" : ""}`}>
                      <div
                        className={`${
                          msg.role === "user"
                            ? "inline-block max-w-[85%] px-4 py-3 rounded-2xl rounded-tr-sm bg-[#293055] text-white text-[13px] leading-relaxed shadow-sm"
                            : "w-full px-5 py-4 rounded-2xl rounded-tl-sm bg-white border border-[#DCE2EF] shadow-sm"
                        }`}
                      >
                        {msg.role === "user" ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <>
                            {/* Phase indicator while streaming with no content yet */}
                            {msg.streaming && !msg.content && (
                              <PhaseIndicator phase={currentPhase ?? "Thinking…"} />
                            )}

                            {/* Rendered content */}
                            {msg.content ? (
                              <div className="space-y-0.5">
                                {renderMarkdown(msg.content)}
                                {msg.streaming && (
                                  <span className="inline-block w-0.5 h-3.5 bg-[#344F9F] ml-0.5 align-text-bottom animate-pulse" />
                                )}
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Follow-up question chips */}
                  {msg.role === "assistant" && !msg.streaming && msg.followUps && msg.followUps.length > 0 && (
                    <div className="ml-10 mt-2 flex flex-wrap gap-2">
                      {msg.followUps.map((q, j) => (
                        <button
                          key={j}
                          onClick={() => send(q)}
                          disabled={streaming}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(52,79,159,0.06)] border border-[rgba(52,79,159,0.15)] text-[12px] text-[#344F9F] hover:bg-[rgba(52,79,159,0.12)] hover:border-[rgba(52,79,159,0.3)] transition-all disabled:opacity-50"
                        >
                          <Sparkles size={10} />
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Phase indicator between messages */}
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
        <div className="flex-shrink-0 px-8 pb-6 pt-3 border-t border-[#DCE2EF] bg-[#FCFAFA]">
          <div className="max-w-2xl mx-auto">
            <div className="relative flex items-end bg-white border border-[#DCE2EF] rounded-2xl shadow-sm focus-within:border-[#293055] focus-within:ring-2 focus-within:ring-[#293055]/10 transition-all">
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
                className="flex-1 resize-none px-4 py-3.5 bg-transparent text-[13px] text-[#1C1F3A] placeholder:text-[#A0A8C0] focus:outline-none max-h-32 disabled:opacity-60"
                style={{ minHeight: 52 }}
              />
              {streaming ? (
                <button
                  onClick={abort}
                  aria-label="Stop generating"
                  className="m-2 px-3 h-8 rounded-xl text-[11px] font-medium text-[#6B7080] bg-[#F0F2F8] hover:bg-[#E4E8F4] transition-colors"
                >
                  Stop
                </button>
              ) : (
                <button
                  onClick={() => send(input)}
                  disabled={!input.trim()}
                  aria-label="Send message"
                  className={`m-2 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                    input.trim()
                      ? "bg-[#293055] hover:bg-[#1e2440] text-white shadow-sm"
                      : "bg-[#DCE2EF] text-[#A0A8C0] cursor-not-allowed"
                  }`}
                >
                  <Send size={14} />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between mt-2 px-1">
              <p id="chat-hint" className="text-[11px] text-[#A0A8C0]">
                Answers are grounded in your live intelligence database. Verify critical decisions independently.
              </p>
              {input.length > 8000 && (
                <p className={`text-[11px] flex-shrink-0 ml-3 ${input.length >= 10000 ? "text-[#E75D50]" : "text-[#A0A8C0]"}`}>
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
