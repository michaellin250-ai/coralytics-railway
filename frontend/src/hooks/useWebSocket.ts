import { useEffect, useRef, useState } from "react";
import { api, type SensorSample, type SensorPrediction, type SensorPoll } from "@/lib/api";

export type WSStatus = "connecting" | "live" | "reconnecting" | "offline";

const WINDOW_CAP = 50;
const MAX_RETRIES = 10; // 10 × 2 s = 20 s total

function getWsUrl(sensorId: string): string | null {
  if (typeof window === "undefined") return null;
  // VITE_WS_URL already includes /ws (e.g. ws://localhost:8000/ws) — just append /{sensorId}
  const explicit = (import.meta as any).env?.VITE_WS_URL as string | undefined;
  if (explicit) return `${explicit.replace(/\/$/, "")}/${sensorId}`;
  // Derive from HTTP base: http://host → ws://host/ws/{sensorId}
  const base = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  if (base) return `${base.replace(/^http/, "ws").replace(/\/$/, "")}/ws/${sensorId}`;
  return null;
}

function mapSample(s: any): SensorSample {
  // Backend timeseries timeField is "time"; frontend type uses "timestamp"
  return { ...s, timestamp: s.timestamp ?? s.time };
}

export function useWebSocket(sensorId: string) {
  const [samples, setSamples] = useState<SensorSample[]>([]);
  const [prediction, setPrediction] = useState<SensorPrediction | null>(null);
  const [status, setStatus] = useState<WSStatus>("connecting");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const wsUrl = getWsUrl(sensorId);

    if (!wsUrl) {
      // HTTP polling fallback when no WS URL configured
      let cancelled = false;
      setStatus("connecting");

      const doPoll = async () => {
        try {
          const poll = await api.poll(sensorId);
          if (cancelled) return;
          const incoming = (poll.history?.length
            ? poll.history
            : poll.latest ? [poll.latest] : []
          ).map(mapSample);

          setSamples((prev) => {
            if (prev.length === 0) return incoming.slice(-WINDOW_CAP);
            const ids = new Set(prev.map((s) => s._id));
            const fresh = incoming.filter((s) => !ids.has(s._id));
            if (!fresh.length) return prev;
            return [...prev, ...fresh].slice(-WINDOW_CAP);
          });
          if (poll.prediction) setPrediction(poll.prediction);
          setLastUpdated(Date.now());
          setStatus("live");
        } catch {
          if (!cancelled) setStatus("offline");
        }
      };

      doPoll();
      const timer = setInterval(doPoll, 5_000);
      return () => {
        cancelled = true;
        clearInterval(timer);
      };
    }

    // ── Real WebSocket path ──────────────────────────────────────────────────
    let cancelled = false;
    let retries = 0;
    let ws: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let isFirst = true;

    const attempt = () => {
      if (cancelled) return;
      setStatus(retries === 0 ? "connecting" : "reconnecting");

      try {
        ws = new WebSocket(wsUrl);
      } catch {
        if (retries < MAX_RETRIES) {
          retries++;
          retryTimer = setTimeout(attempt, 2_000);
        } else {
          if (!cancelled) setStatus("offline");
        }
        return;
      }

      ws.onopen = () => {
        if (cancelled) { ws?.close(); return; }
        retries = 0;
        setStatus("live");
      };

      ws.onmessage = (e) => {
        if (cancelled) return;
        try {
          const payload = JSON.parse(e.data) as SensorPoll;
          const incoming = (payload.history?.length
            ? payload.history
            : payload.latest ? [payload.latest] : []
          ).map(mapSample);

          if (isFirst) {
            // First message: bulk-load all history
            setSamples(incoming.slice(-WINDOW_CAP));
            isFirst = false;
          } else {
            // Each subsequent push: append new point(s) only
            setSamples((prev) => {
              const ids = new Set(prev.map((s) => s._id));
              const fresh = incoming.filter((s) => !ids.has(s._id));
              if (!fresh.length) return prev;
              return [...prev, ...fresh].slice(-WINDOW_CAP);
            });
          }

          if (payload.prediction) setPrediction(payload.prediction);
          setLastUpdated(Date.now());
        } catch {}
      };

      ws.onclose = () => {
        if (cancelled) return;
        if (retries < MAX_RETRIES) {
          setStatus("reconnecting");
          retries++;
          retryTimer = setTimeout(attempt, 2_000);
        } else {
          setStatus("offline");
        }
      };

      ws.onerror = () => { try { ws?.close(); } catch {} };
    };

    attempt();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      try { ws?.close(); } catch {}
    };
  }, [sensorId]);

  return { samples, prediction, status, lastUpdated };
}
