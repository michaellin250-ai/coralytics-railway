import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Line, LineChart, ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";
import { api } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import { SensorStatus, OfflineBanner } from "@/components/SensorStatus";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Live Dashboard — Coralytics" }] }),
  component: Dashboard,
});

const SENSOR_ID = "1";
const kToC = (k: number) => k - 273.15;

// ── Shared chart axis/grid props ─────────────────────────────────────────────
const axisProps = {
  stroke: "var(--color-text-muted)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};
const xProps = {
  ...axisProps,
  dataKey: "ts" as const,
  tickFormatter: (v: number) => new Date(v).toLocaleTimeString().slice(0, 5),
  minTickGap: 32,
};
const gridProps = {
  stroke: "var(--color-border)",
  vertical: false,
  strokeDasharray: "3 4" as string,
};

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="reef-card p-3 text-[12px]">
      <div className="font-mono-num text-[var(--color-text-muted)] mb-2">
        {new Date(label).toLocaleTimeString()}
      </div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-3 justify-between">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.stroke || p.fill }} />
            <span className="text-[var(--color-text-secondary)]">{p.name}</span>
          </span>
          <span className="font-mono-num">{Number(p.value).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="reef-card p-5">
      <div className="label-eyebrow">{title}</div>
      {subtitle && <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{subtitle}</div>}
      <div className="mt-4 h-[200px]">{children}</div>
    </div>
  );
}

// ── Prediction Panel ─────────────────────────────────────────────────────────
const RISK_TIERS: Record<string, { bg: string; fg: string; label: string }> = {
  low:      { bg: "var(--color-success)",     fg: "#fff",     label: "LOW" },
  medium:   { bg: "var(--color-warm)",         fg: "#fff",     label: "MEDIUM" },
  high:     { bg: "#F97316",                   fg: "#fff",     label: "HIGH" },
  critical: { bg: "var(--color-destructive)",  fg: "#fff",     label: "CRITICAL" },
};

function PredictionPanel({ prediction }: { prediction: NonNullable<ReturnType<typeof useWebSocket>["prediction"]> }) {
  const tier = RISK_TIERS[prediction.risk_level] ?? RISK_TIERS.low;
  return (
    <div className="reef-card p-6">
      <div className="flex flex-wrap items-start gap-4 justify-between">
        <div>
          <div className="label-eyebrow">Risk Assessment</div>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <span
              className="inline-flex items-center px-3 py-1.5 rounded-full text-[12px] font-semibold tracking-widest"
              style={{ background: tier.bg, color: tier.fg }}
            >
              {tier.label}
            </span>
            <span className="text-[var(--color-text-secondary)] text-[13px]">{prediction.risk_description}</span>
          </div>
        </div>
        <div className="font-mono-num text-[13px] text-[var(--color-text-muted)]">
          {prediction.bleaching_pct.toFixed(1)}% bleaching
        </div>
      </div>

      {prediction.notices.length > 0 && (
        <div className="mt-4 border-t border-[var(--color-border)] pt-4">
          <div className="label-eyebrow mb-2">Notices</div>
          <ul className="space-y-1.5">
            {prediction.notices.map((n, i) => (
              <li key={i} className="flex gap-2 text-[13px] text-[var(--color-text-secondary)]">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-warm)] shrink-0" />
                {n}
              </li>
            ))}
          </ul>
        </div>
      )}

      {prediction.next_steps.length > 0 && (
        <div className="mt-4 border-t border-[var(--color-border)] pt-4">
          <div className="label-eyebrow mb-2">Next Steps</div>
          <ol className="space-y-1.5">
            {prediction.next_steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-[13px] text-[var(--color-text-primary)]">
                <span className="font-mono-num text-[var(--color-primary)] shrink-0">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard() {
  const { samples, prediction, status, lastUpdated } = useWebSocket(SENSOR_ID);

  const { data: predHistory = [] } = useQuery({
    queryKey: ["sensor-predictions", SENSOR_ID],
    queryFn: () => api.sensorPredictions(SENSOR_ID, 60),
    refetchInterval: 30_000,
  });

  // Map sensor readings → chart rows
  const rows = useMemo(
    () =>
      samples.map((s) => ({
        ts: new Date(s.timestamp).getTime(),
        temp_c: kToC(s.temperature_k),
        sst_c: kToC(s.sst_k),
        ssta: s.ssta,
        dhw: s.ssta_dhw,
        turbidity: s.turbidity,
        ph: s.ph,
        light_depth: s.light_at_depth,
      })),
    [samples],
  );

  // Bleaching % from prediction history
  const bleachRows = useMemo(
    () =>
      predHistory
        .slice()
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map((p) => ({
          ts: new Date(p.timestamp).getTime(),
          pct: p.bleaching_pct,
        })),
    [predHistory],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-display">Live Sensor Dashboard</h1>
          <p className="text-[var(--color-text-muted)] mt-1 text-sm">
            Sensor {SENSOR_ID} · {samples.length} / 50 point window
          </p>
        </div>
        <SensorStatus status={status} lastUpdated={lastUpdated} />
      </div>

      {/* Offline banner */}
      {status === "offline" && <OfflineBanner />}

      {/* Prediction panel */}
      {prediction && <PredictionPanel prediction={prediction} />}

      {/* Individual charts — 2-column grid */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* Temperature: subsurface + SST */}
        <ChartCard title="Temperature" subtitle="Subsurface vs Sea Surface (°C)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows}>
              <CartesianGrid {...gridProps} />
              <XAxis {...xProps} />
              <YAxis {...axisProps} domain={["auto", "auto"]} unit="°" width={36} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="sst_c" name="SST" stroke="var(--color-accent)" strokeWidth={1.75} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="temp_c" name="Subsurface" stroke="#0B9B8A" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* SSTA */}
        <ChartCard title="SSTA" subtitle="Sea Surface Temperature Anomaly (°C)">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows}>
              <defs>
                <linearGradient id="sstaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A855F7" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#A855F7" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis {...xProps} />
              <YAxis {...axisProps} width={36} unit="°" />
              <ReferenceLine y={0} stroke="var(--color-border)" strokeDasharray="3 3" />
              <ReferenceLine y={2} stroke="var(--color-destructive)" strokeDasharray="3 4"
                label={{ value: "Stress", fontSize: 10, fill: "var(--color-destructive)", position: "insideTopRight" }} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="ssta" name="SSTA" stroke="#A855F7" strokeWidth={1.75} fill="url(#sstaGrad)" dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* DHW */}
        <ChartCard title="Degree Heating Weeks" subtitle="Accumulated thermal stress (°C-wk)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows}>
              <CartesianGrid {...gridProps} />
              <XAxis {...xProps} />
              <YAxis {...axisProps} domain={[0, "auto"]} width={36} />
              <ReferenceLine y={4} stroke="var(--color-warm)" strokeDasharray="3 4"
                label={{ value: "High", fontSize: 10, fill: "var(--color-warm)", position: "insideTopRight" }} />
              <ReferenceLine y={8} stroke="var(--color-destructive)" strokeDasharray="3 4"
                label={{ value: "Critical", fontSize: 10, fill: "var(--color-destructive)", position: "insideTopRight" }} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="dhw" name="DHW" stroke="var(--color-warm)" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Turbidity */}
        <ChartCard title="Turbidity" subtitle="Water clarity index (0–10)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows}>
              <CartesianGrid {...gridProps} />
              <XAxis {...xProps} />
              <YAxis {...axisProps} domain={[0, 10]} width={30} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="turbidity" name="Turbidity" stroke="#4A6B6B" strokeWidth={1.75} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* pH */}
        <ChartCard title="pH" subtitle="Ocean acidity">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows}>
              <CartesianGrid {...gridProps} />
              <XAxis {...xProps} />
              <YAxis {...axisProps} domain={[6.5, 9]} width={36} />
              <ReferenceLine y={8.1} stroke="#E8C547" strokeDasharray="3 4"
                label={{ value: "Healthy (8.1)", fontSize: 10, fill: "#E8C547", position: "insideTopRight" }} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="ph" name="pH" stroke="#E8C547" strokeWidth={1.75} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Light at depth */}
        <ChartCard title="Light at Depth" subtitle="PAR reaching reef">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows}>
              <defs>
                <linearGradient id="lightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis {...xProps} />
              <YAxis {...axisProps} domain={[0, "auto"]} width={40} unit=" PAR" />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="light_depth" name="Light at depth" stroke="var(--color-accent)" strokeWidth={1.75} fill="url(#lightGrad)" dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Bleaching % — full width */}
        <div className="lg:col-span-2">
          <ChartCard title="Bleaching Risk %" subtitle="From AI prediction history">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={bleachRows}>
                <defs>
                  <linearGradient id="bleachGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis {...xProps} />
                <YAxis {...axisProps} domain={[0, 100]} width={36} unit="%" />
                <ReferenceLine y={20} stroke="var(--color-warm)" strokeDasharray="3 4"
                  label={{ value: "SMS alert", fontSize: 10, fill: "var(--color-warm)", position: "insideTopRight" }} />
                <ReferenceLine y={50} stroke="var(--color-destructive)" strokeDasharray="3 4"
                  label={{ value: "Call alert", fontSize: 10, fill: "var(--color-destructive)", position: "insideTopRight" }} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="pct" name="Bleaching %" stroke="var(--color-primary)" strokeWidth={2} fill="url(#bleachGrad)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

      </div>
    </div>
  );
}
