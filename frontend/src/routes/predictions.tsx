import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  RadialBar, RadialBarChart, ResponsiveContainer, PolarAngleAxis,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, ReferenceDot,
  ComposedChart, Area,
} from "recharts";
import { ArrowDown, ArrowRight, ArrowUp, ShieldCheck, AlertTriangle, AlertOctagon, Bell, BellOff } from "lucide-react";
import { api, type SensorPoll } from "@/lib/api";

export const Route = createFileRoute("/predictions")({
  head: () => ({ meta: [{ title: "Predictions — Coralytics" }] }),
  component: Predictions,
});

const SENSOR_ID = "1";
const POLL_MS = 5_000;

function Gauge({ value }: { value: number }) {
  const fill = value > 50 ? "#EF4444" : value > 20 ? "#F2A65A" : "#4CAF84";
  const data = [{ name: "risk", value: Math.max(2, value), fill }];
  return (
    <div className="relative w-full h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="78%" outerRadius="100%" data={data} startAngle={200} endAngle={-20}>
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background={{ fill: "var(--color-surface-raised)" }} dataKey="value" cornerRadius={20} angleAxisId={0} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="font-mono-num text-[48px] font-semibold text-[var(--color-text-primary)] leading-none">
          {Math.round(value)}
        </span>
        <span className="text-[var(--color-text-muted)] text-[12px] mt-2 uppercase tracking-wider">Bleaching %</span>
      </div>
    </div>
  );
}

function RiskBar({ value, label, max = 100 }: { value: number; label: string; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const color = value > 50 ? "#EF4444" : value > 20 ? "#F2A65A" : "#4CAF84";
  return (
    <div>
      <div className="flex items-center justify-between text-[12px] mb-2">
        <span className="text-[var(--color-text-secondary)]">{label}</span>
        <span className="font-mono-num text-[var(--color-text-primary)]">{value.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--color-surface-raised)] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
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
          <span className="font-mono-num">{Number(p.value).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

function Predictions() {
  const { data: poll } = useQuery<SensorPoll>({
    queryKey: ["sensor-poll", SENSOR_ID],
    queryFn: () => api.poll(SENSOR_ID),
    refetchInterval: POLL_MS,
  });

  const { data: predHistory = [] } = useQuery({
    queryKey: ["sensor-predictions", SENSOR_ID],
    queryFn: () => api.sensorPredictions(SENSOR_ID, 120),
    refetchInterval: 30_000,
  });

  const histChart = useMemo(
    () =>
      predHistory
        .slice()
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map((p) => ({
          ts: new Date(p.timestamp).getTime(),
          bleaching_pct: p.bleaching_pct,
          risk_level: p.risk_level,
          risk_7d: p.risk_7d,
          risk_14d: p.risk_14d,
        })),
    [predHistory],
  );

  if (!poll) return <div className="text-[var(--color-text-muted)]">Loading predictions…</div>;

  const pred = poll.prediction;
  const trend =
    pred.risk_7d > pred.bleaching_pct + 2 ? "up"
    : pred.risk_7d < pred.bleaching_pct - 2 ? "down"
    : "flat";
  const TrendIcon = trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : ArrowRight;
  const trendColor =
    trend === "up" ? "text-[var(--color-warm)]"
    : trend === "down" ? "text-[var(--color-primary)]"
    : "text-[var(--color-text-secondary)]";
  const trendLabel = trend === "up" ? "Worsening" : trend === "down" ? "Improving" : "Stable";

  const RiskIcon =
    pred.risk_level === "high" ? AlertOctagon
    : pred.risk_level === "medium" ? AlertTriangle : ShieldCheck;
  const riskIconColor =
    pred.risk_level === "high" ? "text-[var(--color-destructive)]"
    : pred.risk_level === "medium" ? "text-[var(--color-warm)]"
    : "text-[var(--color-success)]";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[28px] font-display">Predictions & Risk Metrics</h1>
        <p className="text-[var(--color-text-muted)] mt-1 text-sm">
          AI-driven bleaching risk assessment · sensor {SENSOR_ID} · {predHistory.length} predictions in history
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="reef-card p-6">
          <div className="label-eyebrow">Current Bleaching Risk</div>
          <Gauge value={pred.bleaching_pct} />
          <div className="mt-2 flex items-center justify-center gap-2 text-[12px]">
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full font-semibold tracking-wider uppercase"
              style={{
                background: pred.risk_level === "high" ? "#EF4444" : pred.risk_level === "medium" ? "#F2A65A" : "#4CAF84",
                color: "#fff",
              }}
            >
              {pred.risk_level} risk
            </span>
            <span className="text-[var(--color-text-muted)]">·</span>
            <span className="text-[var(--color-text-secondary)]">{pred.bleaching_level} bleaching</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="reef-card p-6">
            <div className="label-eyebrow">Trend</div>
            <div className={`mt-3 flex items-center gap-3 ${trendColor}`}>
              <TrendIcon size={28} strokeWidth={1.5} />
              <span className="font-display text-xl">{trendLabel}</span>
            </div>
            <p className="mt-3 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
              {pred.risk_description}
            </p>
          </div>

          <div className="reef-card p-6 space-y-4">
            <div className="label-eyebrow">Forecast</div>
            <RiskBar value={pred.bleaching_pct} label="Current" />
            <RiskBar value={pred.risk_7d} label="7-day outlook" />
            <RiskBar value={pred.risk_14d} label="14-day outlook" />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="reef-card p-6">
          <div className="label-eyebrow">Bleaching Status</div>
          <div className="mt-3 flex items-center gap-3">
            <RiskIcon size={20} strokeWidth={1.5} className={riskIconColor} />
            <div>
              <div className="text-[var(--color-text-primary)] capitalize">{pred.bleaching_level} bleaching</div>
              <div className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
                {pred.bleaching_event ? "Bleaching event detected" : "No active bleaching event"}
              </div>
            </div>
          </div>
        </div>
        <div className="reef-card p-6">
          <div className="label-eyebrow">Alert Status</div>
          <div className="mt-3">
            {pred.alert_sent ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-destructive)] text-white text-[12px]">
                <Bell size={12} /> Alert sent{pred.alert_type ? ` · ${pred.alert_type}` : ""}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] text-[12px]">
                <BellOff size={12} /> No alert dispatched
              </span>
            )}
          </div>
        </div>
        <div className="reef-card p-6">
          <div className="label-eyebrow">Prediction ID</div>
          <div className="mt-3 font-mono-num text-[12px] text-[var(--color-text-secondary)] break-all">{pred._id}</div>
          <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">
            {new Date(pred.timestamp).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="reef-card p-6">
        <div className="label-eyebrow">Bleaching Risk History</div>
        <p className="text-[12px] text-[var(--color-text-muted)] mt-1">
          {histChart.length} prediction snapshots
        </p>
        <div className="mt-4 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={histChart} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0B9B8A" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#0B9B8A" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" vertical={false} strokeDasharray="3 4" />
              <XAxis
                dataKey="ts"
                tickFormatter={(v) => new Date(v).toLocaleTimeString().slice(0, 5)}
                stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} minTickGap={32}
              />
              <YAxis
                stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false}
                domain={[0, 100]} width={36} unit="%"
              />
              <ReferenceLine y={20} stroke="#F2A65A" strokeDasharray="3 4"
                label={{ value: "SMS threshold", fontSize: 10, fill: "#F2A65A", position: "insideTopRight" }} />
              <ReferenceLine y={50} stroke="#EF4444" strokeDasharray="3 4"
                label={{ value: "Call threshold", fontSize: 10, fill: "#EF4444", position: "insideTopRight" }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="bleaching_pct" name="Bleaching %" stroke="#0B9B8A" strokeWidth={2} fill="url(#riskGrad)" dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="risk_7d" name="7d forecast" stroke="#F2A65A" strokeWidth={1.5} dot={false} strokeDasharray="4 3" isAnimationActive={false} />
              {histChart.filter((h) => h.risk_level === "high").map((h, i) => (
                <ReferenceDot key={i} x={h.ts} y={h.bleaching_pct} r={4} fill="#EF4444" stroke="white" />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="reef-card p-6">
          <div className="label-eyebrow">Notices</div>
          <div className="mt-4 space-y-3">
            {pred.notices.length === 0 ? (
              <div className="text-[13px] text-[var(--color-text-muted)]">No notices.</div>
            ) : (
              pred.notices.map((n, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-[var(--color-border)] last:border-0">
                  <span className="w-2 h-2 rounded-full mt-2 bg-[var(--color-warm)] shrink-0" />
                  <span className="flex-1 text-[13px]">{n}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="reef-card p-6">
          <div className="label-eyebrow">Next Steps</div>
          <ol className="mt-4 space-y-3">
            {pred.next_steps.length === 0 ? (
              <div className="text-[13px] text-[var(--color-text-muted)]">No recommendations.</div>
            ) : (
              pred.next_steps.map((s, i) => (
                <li key={i} className="flex gap-4">
                  <span className="font-mono-num text-[var(--color-primary)] w-5 shrink-0">{i + 1}</span>
                  <span className="text-[13px] text-[var(--color-text-primary)]">{s}</span>
                </li>
              ))
            )}
          </ol>
        </div>
      </div>
    </div>
  );
}
