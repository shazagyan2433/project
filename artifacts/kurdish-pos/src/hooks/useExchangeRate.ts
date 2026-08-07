import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "iqd_usd_exchange_rate";
const RATE_EVENT = "exchangeRateChanged";
export const DEFAULT_RATE = 1310;

export function useExchangeRate() {
  const [rate, setRateState] = useState<number>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? parseFloat(stored) : NaN;
    return isNaN(parsed) || parsed <= 0 ? DEFAULT_RATE : parsed;
  });

  useEffect(() => {
    const handleChange = (e: CustomEvent<number>) => setRateState(e.detail);
    window.addEventListener(RATE_EVENT, handleChange as EventListener);
    return () => window.removeEventListener(RATE_EVENT, handleChange as EventListener);
  }, []);

  const setRate = useCallback((newRate: number) => {
    if (newRate > 0) {
      localStorage.setItem(STORAGE_KEY, newRate.toString());
      setRateState(newRate);
      window.dispatchEvent(new CustomEvent<number>(RATE_EVENT, { detail: newRate }));
    }
  }, []);

  const usdToIqd = useCallback((usd: number) => Math.round(usd * rate), [rate]);
  const iqdToUsd = useCallback((iqd: number) => iqd / rate, [rate]);

  return { rate, setRate, usdToIqd, iqdToUsd };
}
