import { useEffect } from "react";
import { X, MessageSquare, Phone } from "lucide-react";
import { useAlerts, type AlertToast } from "@/contexts/AlertsContext";

export function AlertToastContainer() {
  const { toasts, dismissToast } = useAlerts();
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <AlertToastItem key={t.id} toast={t} dismiss={() => dismissToast(t.id)} />
      ))}
    </div>
  );
}

function AlertToastItem({ toast, dismiss }: { toast: AlertToast; dismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(dismiss, 9000);
    return () => clearTimeout(timer);
  }, [dismiss]);

  const isCall = toast.type === "CALL";
  const bg = isCall ? "#FEF2F2" : "#FEFCE8";
  const border = isCall ? "#EF4444" : "#CA8A04";
  const iconBg = isCall ? "#EF4444" : "#EAB308";
  const headColor = isCall ? "#B91C1C" : "#92400E";
  const bodyColor = isCall ? "#7F1D1D" : "#78350F";

  return (
    <div
      className="pointer-events-auto flex items-start gap-3 p-4 rounded-xl border max-w-[340px] shadow-lg"
      style={{ background: bg, borderColor: border, animation: "alert-in 220ms cubic-bezier(0.22,1,0.36,1)" }}
    >
      <style>{`@keyframes alert-in{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}`}</style>
      <div
        className="w-8 h-8 rounded-lg grid place-items-center shrink-0 mt-0.5"
        style={{ background: iconBg }}
      >
        {isCall
          ? <Phone size={14} className="text-white" strokeWidth={1.75} />
          : <MessageSquare size={14} className="text-white" strokeWidth={1.75} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: headColor }}>
          {isCall ? "Voice Call Alert" : "SMS Alert"} · {toast.sensor_id}
        </div>
        <div className="mt-1 text-[12px] leading-snug line-clamp-3" style={{ color: bodyColor }}>
          {toast.message}
        </div>
        <div className="mt-1.5 font-mono-num text-[11px]" style={{ color: headColor, opacity: 0.7 }}>
          Risk: {toast.bleaching_pct.toFixed(1)}%
        </div>
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 mt-0.5 hover:opacity-100 transition-opacity"
        style={{ color: headColor, opacity: 0.5 }}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
