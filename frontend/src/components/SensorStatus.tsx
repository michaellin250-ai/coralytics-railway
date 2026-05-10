import { useEffect, useState } from "react";
import type { WSStatus } from "@/hooks/useWebSocket";

const PILL: Record<WSStatus, { label: string; color: string; bg: string }> = {
  live:         { label: "Live",         color: "var(--color-success)",     bg: "color-mix(in oklab, var(--color-success) 14%, transparent)" },
  reconnecting: { label: "Reconnecting", color: "var(--color-warm)",        bg: "color-mix(in oklab, var(--color-warm) 14%, transparent)" },
  offline:      { label: "Offline",      color: "var(--color-destructive)", bg: "color-mix(in oklab, var(--color-destructive) 14%, transparent)" },
  connecting:   { label: "Connecting",   color: "var(--color-text-muted)",  bg: "color-mix(in oklab, var(--color-text-muted) 14%, transparent)" },
};

export function SensorStatus({
  status,
  lastUpdated,
}: {
  status: WSStatus;
  lastUpdated: number | null;
}) {
  const [ago, setAgo] = useState(0);

  useEffect(() => {
    if (!lastUpdated) return;
    const tick = () => setAgo(Math.round((Date.now() - lastUpdated) / 1000));
    tick();
    const t = setInterval(tick, 1_000);
    return () => clearInterval(t);
  }, [lastUpdated]);

  const pill = PILL[status];

  return (
    <div className="flex flex-col items-end gap-1">
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold tracking-wide"
        style={{ color: pill.color, background: pill.bg }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: pill.color,
            animation: status === "live" ? "dot-pulse 1.4s ease-in-out infinite" : "none",
          }}
        />
        {pill.label}
      </span>
      {lastUpdated && (
        <span className="text-[11px] font-mono-num text-[var(--color-text-muted)]">
          Updated {ago}s ago
        </span>
      )}
    </div>
  );
}

export function OfflineBanner() {
  return (
    <div
      className="w-full px-4 py-3 text-white text-center text-[13px] font-medium"
      style={{ background: "var(--color-destructive)" }}
    >
      Sensor offline — showing last recorded readings
    </div>
  );
}
