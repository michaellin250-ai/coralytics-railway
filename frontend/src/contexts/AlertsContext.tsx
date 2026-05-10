import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

export type AlertToast = {
  id: string;
  type: "SMS" | "CALL";
  sensor_id: string;
  bleaching_pct: number;
  message: string;
  ts: number;
};

type AlertsCtx = {
  toasts: AlertToast[];
  dismissToast: (id: string) => void;
  smsEnabled: boolean;
  callEnabled: boolean;
  setSmsEnabled: (v: boolean) => void;
  setCallEnabled: (v: boolean) => void;
  checkPrediction: (sensorId: string, bleaching_pct: number, risk_level: string, risk_description: string) => void;
};

const Ctx = createContext<AlertsCtx | null>(null);

export function AlertsProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<AlertToast[]>([]);
  const [smsEnabled, setSmsRaw] = useState(() => typeof window === "undefined" || localStorage.getItem("smsEnabled") !== "false");
  const [callEnabled, setCallRaw] = useState(() => typeof window === "undefined" || localStorage.getItem("callEnabled") !== "false");
  const prevPctRef = useRef<Record<string, number>>({});

  const setSmsEnabled = useCallback((v: boolean) => {
    if (typeof window !== "undefined") localStorage.setItem("smsEnabled", String(v));
    setSmsRaw(v);
  }, []);

  const setCallEnabled = useCallback((v: boolean) => {
    if (typeof window !== "undefined") localStorage.setItem("callEnabled", String(v));
    setCallRaw(v);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const checkPrediction = useCallback(
    (sensorId: string, bleaching_pct: number, _risk_level: string, risk_description: string) => {
      const prev = prevPctRef.current[sensorId] ?? 0;
      prevPctRef.current[sensorId] = bleaching_pct;
      if (bleaching_pct <= prev) return;

      const push = (type: "SMS" | "CALL") => {
        setToasts((ts) => [
          ...ts.slice(-4),
          {
            id: crypto.randomUUID(),
            type,
            sensor_id: sensorId,
            bleaching_pct,
            message: risk_description || `Bleaching risk at ${bleaching_pct.toFixed(1)}% on sensor ${sensorId}`,
            ts: Date.now(),
          },
        ]);
      };

      if (smsEnabled && bleaching_pct >= 20 && prev < 20) push("SMS");
      if (callEnabled && bleaching_pct >= 50 && prev < 50) push("CALL");
    },
    [smsEnabled, callEnabled],
  );

  return (
    <Ctx.Provider value={{ toasts, dismissToast, smsEnabled, callEnabled, setSmsEnabled, setCallEnabled, checkPrediction }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAlerts() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAlerts must be inside AlertsProvider");
  return ctx;
}
