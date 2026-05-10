import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAlerts } from "@/contexts/AlertsContext";

export function AlertWatcher({ sensorId = "1" }: { sensorId?: string }) {
  const { checkPrediction } = useAlerts();
  const { data: poll } = useQuery({
    queryKey: ["sensor-poll-watcher", sensorId],
    queryFn: () => api.poll(sensorId),
    refetchInterval: 5_000,
  });
  const lastIdRef = useRef("");

  useEffect(() => {
    if (!poll?.prediction) return;
    const pred = poll.prediction;
    if (pred._id === lastIdRef.current) return;
    lastIdRef.current = pred._id;
    checkPrediction(sensorId, pred.bleaching_pct, pred.risk_level, pred.risk_description);
  }, [poll, sensorId, checkPrediction]);

  return null;
}
