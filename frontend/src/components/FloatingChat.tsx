import { useEffect, useRef, useState } from "react";
import { MessageSquare, X, Send, Sparkles, Square, Trash2 } from "lucide-react";
import { useChat } from "@/hooks/useChat";

const THINKING_STEPS = [
  "Referencing sensor database...",
  "Gathering recent readings...",
  "Analyzing bleaching patterns...",
  "Consulting DHW history...",
  "Cross-referencing SST anomalies...",
  "Querying prediction models...",
  "Reviewing coral health indicators...",
  "Checking pH and turbidity trends...",
];

function randBetween(lo: number, hi: number) {
  return lo + Math.random() * (hi - lo);
}

export function FloatingChat({ sensorId = "1" }: { sensorId?: string }) {
  const { messages, streaming, send, stop, clearHistory } = useChat(sensorId);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(THINKING_STEPS[0]);
  const [showPatience, setShowPatience] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const thinkRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const patienceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepIdxRef = useRef(0);

  // Auto-scroll on new messages / tokens
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  // Thinking step cycling while streaming
  useEffect(() => {
    if (!streaming) {
      if (thinkRef.current) clearTimeout(thinkRef.current);
      if (patienceRef.current) clearTimeout(patienceRef.current);
      setShowPatience(false);
      return;
    }
    stepIdxRef.current = Math.floor(Math.random() * THINKING_STEPS.length);
    setThinkingStep(THINKING_STEPS[stepIdxRef.current]);

    const scheduleNext = () => {
      thinkRef.current = setTimeout(() => {
        stepIdxRef.current = (stepIdxRef.current + 1) % THINKING_STEPS.length;
        setThinkingStep(THINKING_STEPS[stepIdxRef.current]);
        scheduleNext();
      }, randBetween(5_000, 10_000));
    };
    scheduleNext();
    patienceRef.current = setTimeout(() => setShowPatience(true), 45_000);

    return () => {
      if (thinkRef.current) clearTimeout(thinkRef.current);
      if (patienceRef.current) clearTimeout(patienceRef.current);
    };
  }, [streaming]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    send(text);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const isEmpty = messages.length === 0;

  return (
    <>
      {/* FAB */}
      {!open && (
        <div className="fixed bottom-6 right-6 z-50 group">
          <div
            className="hidden [@media(hover:hover)]:block pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-3 whitespace-nowrap px-3 py-1.5 rounded-lg text-[13px] opacity-0 translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0"
            style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", boxShadow: "0 6px 18px rgba(0,0,0,0.25)" }}
          >
            Talk to me if you need any help!
            <span aria-hidden className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 rotate-45" style={{ background: "var(--color-surface-raised)", borderRight: "1px solid var(--color-border)", borderTop: "1px solid var(--color-border)" }} />
          </div>
          <button
            onClick={() => setOpen(true)}
            aria-label="Open chat"
            className="w-11 h-11 rounded-full text-white grid place-items-center"
            style={{ background: "var(--coral)", boxShadow: "0 8px 24px color-mix(in oklab, var(--coral) 45%, transparent)" }}
          >
            <MessageSquare size={18} strokeWidth={1.75} />
          </button>
        </div>
      )}

      {/* Chat window */}
      {open && (
        <div
          className="fixed z-50 flex flex-col overflow-hidden rounded-2xl"
          style={{
            bottom: 24, right: 24,
            width: "min(380px, calc(100vw - 32px))",
            height: "min(540px, calc(100vh - 48px))",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
            animation: "chat-pop 250ms cubic-bezier(0.22,1,0.36,1)",
            transformOrigin: "bottom right",
          }}
        >
          <style>{`@keyframes chat-pop{from{opacity:0;transform:scale(0.92) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
            <div className="flex gap-3 items-center">
              <div className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: "var(--color-accent-soft)" }}>
                <Sparkles size={16} className="text-[var(--color-primary)]" strokeWidth={1.75} />
              </div>
              <div>
                <div className="font-display text-[15px] text-[var(--color-text-primary)] leading-tight">Ask Coralytics</div>
                <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Sensor {sensorId}</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Clear history */}
              {confirmClear ? (
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-[var(--color-text-muted)]">Clear?</span>
                  <button onClick={() => { clearHistory(); setConfirmClear(false); }}
                    className="px-2 py-1 rounded text-white text-[11px]"
                    style={{ background: "var(--color-destructive)" }}>Yes</button>
                  <button onClick={() => setConfirmClear(false)}
                    className="px-2 py-1 rounded text-[11px] text-[var(--color-text-secondary)]"
                    style={{ background: "var(--color-surface-raised)" }}>No</button>
                </div>
              ) : (
                <button onClick={() => setConfirmClear(true)} aria-label="Clear history"
                  className="w-7 h-7 rounded-md grid place-items-center text-[var(--color-text-muted)] hover:text-[var(--color-destructive)] transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
              <button onClick={() => setOpen(false)} aria-label="Close chat"
                className="w-7 h-7 rounded-md grid place-items-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {isEmpty && (
              <div className="text-[13px] text-[var(--color-text-muted)] italic text-center mt-6 px-4">
                Ask me anything about sensor {sensorId} — current conditions, historical trends, or risk forecasts.
              </div>
            )}

            {messages.map((m, i) => {
              const isStreamingThis = streaming && m.role === "assistant" && i === messages.length - 1;
              return (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "rounded-br-sm text-white"
                        : "rounded-bl-sm text-[var(--color-text-primary)]"
                    }`}
                    style={{ background: m.role === "user" ? "var(--color-primary)" : "var(--color-surface-raised)" }}
                  >
                    {m.role === "assistant" && !m.content ? (
                      // Thinking state
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-[12px] text-[var(--color-text-muted)] italic">
                          <span className="inline-flex gap-1">
                            {[0, 0.2, 0.4].map((d) => (
                              <span key={d} className="w-1.5 h-1.5 rounded-full dot-pulse" style={{ background: "var(--color-text-muted)", animationDelay: `${d}s` }} />
                            ))}
                          </span>
                          <span>{thinkingStep}</span>
                        </div>
                        {showPatience && (
                          <div className="text-[11px] text-[var(--color-text-muted)]">Querying a lot of data — thanks for your patience!</div>
                        )}
                      </div>
                    ) : (
                      <>
                        {m.content}
                        {isStreamingThis && (
                          <span className="cursor-blink ml-px" style={{ color: "var(--color-text-muted)" }}>▋</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-[var(--color-border)]">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
                placeholder={`Ask about sensor ${sensorId}...`}
                disabled={streaming}
                className="flex-1 resize-none max-h-32 px-3 py-2 rounded-lg text-[13px] text-[var(--color-text-primary)] focus:outline-none transition-colors"
                style={{ border: "1px solid var(--color-border)", background: "var(--color-surface-raised)" }}
              />
              {streaming ? (
                <button
                  onClick={stop}
                  aria-label="Stop generating"
                  className="h-9 w-9 shrink-0 rounded-lg grid place-items-center text-white transition-opacity"
                  style={{ background: "var(--color-destructive)" }}
                >
                  <Square size={13} strokeWidth={2} />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  aria-label="Send message"
                  className="h-9 w-9 shrink-0 rounded-lg grid place-items-center text-white disabled:opacity-40 transition-opacity"
                  style={{ background: "var(--color-primary)" }}
                >
                  <Send size={15} strokeWidth={1.75} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
