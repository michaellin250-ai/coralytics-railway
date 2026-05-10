import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { api, type AlertRow } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/alerts")({
  head: () => ({ meta: [{ title: "Alerts — Coralytics" }] }),
  component: Alerts,
});

function relativeTime(ts: number) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

function alertStatus(a: AlertRow) {
  if (a.alert_level === "call") return a.call_success === true ? "Sent" : a.call_success === false ? "Failed" : "Pending";
  return a.sms_success === true ? "Sent" : a.sms_success === false ? "Failed" : "Pending";
}

function Alerts() {
  const { data: alerts = [] } = useQuery({ queryKey: ["alerts"], queryFn: api.alerts });
  const [sensor, setSensor] = useState("ALL");
  const [level, setLevel] = useState<"ALL" | "sms" | "call">("ALL");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  const sensors = useMemo(() => Array.from(new Set(alerts.map((a) => a.sensor_id))), [alerts]);

  const filtered = useMemo(
    () => alerts.filter((a) => (sensor === "ALL" || a.sensor_id === sensor) && (level === "ALL" || a.alert_level === level)),
    [alerts, sensor, level],
  );
  const pageSize = 25;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const slice = filtered.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[28px] font-display">Alert History & Logs</h1>
        <p className="text-[var(--color-text-muted)] mt-1 text-sm">Every notification dispatched by the alerting pipeline.</p>
      </div>

      <div className="reef-card p-4 flex flex-wrap items-center gap-3">
        <select
          value={sensor}
          onChange={(e) => { setSensor(e.target.value); setPage(0); }}
          className="h-9 px-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[13px]"
        >
          <option value="ALL">All sensors</option>
          {sensors.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="inline-flex bg-[var(--color-surface-raised)] rounded-md p-0.5 text-[12px]">
          {(["ALL", "sms", "call"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setLevel(t); setPage(0); }}
              className={`px-3 h-8 rounded ${level === t ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-secondary)]"}`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setSensor("ALL"); setLevel("ALL"); setPage(0); }}
          className="text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] ml-auto"
        >
          clear filters
        </button>
      </div>

      <div className="reef-card overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[var(--color-text-muted)] text-[11px] uppercase tracking-wider">
              <th className="font-medium px-6 py-4">Timestamp</th>
              <th className="font-medium px-3 py-4">Sensor</th>
              <th className="font-medium px-3 py-4">Level</th>
              <th className="font-medium px-3 py-4 text-right">Risk %</th>
              <th className="font-medium px-3 py-4">Status</th>
              <th className="px-3 py-4" />
            </tr>
          </thead>
          <tbody>
            {slice.map((a) => {
              const expanded = open === a.id;
              const status = alertStatus(a);
              const failed = status === "Failed";
              return (
                <>
                  <tr
                    key={a.id}
                    className={`border-t border-[var(--color-border)] hover:bg-[var(--color-surface-raised)]/50 cursor-pointer ${failed ? "border-l-2 border-l-[var(--color-destructive)]" : a.is_all_clear ? "border-l-2 border-l-[var(--color-success)]" : ""}`}
                    onClick={() => setOpen(expanded ? null : a.id)}
                  >
                    <td className="px-6 py-4 font-mono-num text-[var(--color-text-secondary)]" title={new Date(a.ts).toISOString()}>
                      {relativeTime(a.ts)}
                    </td>
                    <td className="px-3 py-4 font-mono-num">{a.sensor_id}</td>
                    <td className="px-3 py-4">
                      <span className={`text-[11px] px-2 py-1 rounded-full uppercase tracking-wider ${
                        a.alert_level === "call"
                          ? "bg-[var(--color-primary)] text-white"
                          : "border border-[var(--color-primary)] text-[var(--color-primary)]"
                      }`}>
                        {a.is_all_clear ? "all-clear" : a.alert_level}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-right font-mono-num">{a.bleaching_risk_pct.toFixed(1)}%</td>
                    <td className={`px-3 py-4 ${failed ? "text-[var(--color-destructive)]" : "text-[var(--color-success)]"}`}>
                      {status}
                    </td>
                    <td className="px-3 py-4 text-[var(--color-text-muted)]">
                      {expanded ? <ChevronDown size={16} strokeWidth={1.5} /> : <ChevronRight size={16} strokeWidth={1.5} />}
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="bg-[var(--color-surface-raised)]/40 border-t border-[var(--color-border)]">
                      <td colSpan={6} className="px-6 py-5">
                        <div className="grid md:grid-cols-3 gap-6">
                          <div className="md:col-span-2">
                            <div className="label-eyebrow mb-2">Message sent</div>
                            <p className="text-[13px] text-[var(--color-text-secondary)] border-l-2 border-[var(--color-border)] pl-3 whitespace-pre-wrap">
                              {a.message_sent || "—"}
                            </p>
                            {a.alert_description && (
                              <>
                                <div className="label-eyebrow mt-4 mb-2">AI assessment</div>
                                <p className="text-[13px] italic text-[var(--color-text-secondary)] border-l-2 border-[var(--color-border)] pl-3">
                                  {a.alert_description}
                                </p>
                              </>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-[12px]"><span className="text-[var(--color-text-muted)]">Bleaching %</span><span className="font-mono-num">{a.bleaching_risk_pct.toFixed(1)}%</span></div>
                            <div className="flex justify-between text-[12px]"><span className="text-[var(--color-text-muted)]">7-day risk</span><span className="font-mono-num">{a.risk_7d.toFixed(1)}%</span></div>
                            <div className="flex justify-between text-[12px]"><span className="text-[var(--color-text-muted)]">14-day risk</span><span className="font-mono-num">{a.risk_14d.toFixed(1)}%</span></div>
                            <div className="flex justify-between text-[12px]"><span className="text-[var(--color-text-muted)]">Risk level</span><span className="capitalize">{a.risk_level}</span></div>
                            {failed && (
                              <button
                                onClick={(e) => { e.stopPropagation(); toast.success("Alert resent"); }}
                                className="mt-2 px-3 h-8 rounded-md bg-[var(--color-primary)] text-white text-[12px]"
                              >
                                Retry
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {slice.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[var(--color-text-muted)] text-[13px]">
                  No alerts match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border)] text-[12px] text-[var(--color-text-muted)]">
          <span className="font-mono-num">Page {page + 1} of {pageCount}</span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-3 h-8 rounded-md border border-[var(--color-border)] disabled:opacity-40">Prev</button>
            <button disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)} className="px-3 h-8 rounded-md border border-[var(--color-border)] disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
