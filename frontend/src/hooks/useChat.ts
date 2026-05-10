import { useEffect, useRef, useState } from "react";

const BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? "";

export type ChatMsg = { role: "user" | "assistant"; content: string };

const storageKey = (id: string) => `chat_history_${id}`;

function loadHistory(sensorId: string): ChatMsg[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(sensorId));
    return raw ? (JSON.parse(raw) as ChatMsg[]) : [];
  } catch {
    return [];
  }
}

function persist(sensorId: string, msgs: ChatMsg[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(sensorId), JSON.stringify(msgs));
  } catch {}
}

export function useChat(sensorId: string) {
  const [messages, setMessages] = useState<ChatMsg[]>(() => loadHistory(sensorId));
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Reload history when sensor changes
  useEffect(() => {
    setMessages(loadHistory(sensorId));
  }, [sensorId]);

  // Persist on every change
  useEffect(() => {
    persist(sensorId, messages);
  }, [messages, sensorId]);

  const send = async (text: string) => {
    if (!text.trim() || streaming) return;
    const prevMessages: ChatMsg[] = [...messages, { role: "user", content: text.trim() }];
    setMessages([...prevMessages, { role: "assistant", content: "" }]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let accumulated = "";

    try {
      const resp = await fetch(`${BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          sensor_id: sensorId,
          history: prevMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
          message: text.trim(),
        }),
      });

      if (!resp.ok || !resp.body) {
        const j = await resp.json().catch(() => ({}));
        throw new Error((j as any).error || `HTTP ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]" || json === "[TIMEOUT]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.token as string | undefined;
            if (c) {
              accumulated += c;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: accumulated };
                return copy;
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      const isAbort = (e as any)?.name === "AbortError";
      const finalContent = isAbort
        ? (accumulated ? accumulated + " _(stopped)_" : "_(stopped)_")
        : "Sorry, something went wrong. Please try again.";
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: finalContent };
        return copy;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  const clearHistory = () => {
    setMessages([]);
    if (typeof window !== "undefined") {
      try { localStorage.removeItem(storageKey(sensorId)); } catch {}
    }
  };

  return { messages, streaming, send, stop, clearHistory };
}
