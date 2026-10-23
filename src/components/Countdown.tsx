"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";

function remaining(target: number) {
  const diff = Math.max(0, target - Date.now());
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor(diff / 3_600_000) % 24,
    minutes: Math.floor(diff / 60_000) % 60,
    seconds: Math.floor(diff / 1000) % 60,
  };
}

export function Countdown({ date, className = "" }: { date: string; className?: string }) {
  const { t } = useI18n();
  const target = new Date(date).getTime();
  const [parts, setParts] = useState<ReturnType<typeof remaining> | null>(null);

  useEffect(() => {
    setParts(remaining(target));
    const id = setInterval(() => setParts(remaining(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  return (
    <div className={`flex justify-center gap-6 ${className}`}>
      {(["days", "hours", "minutes", "seconds"] as const).map((unit) => (
        <div key={unit} className="text-center">
          <div className="text-3xl tabular-nums">{parts ? parts[unit] : "–"}</div>
          <div className="text-xs uppercase tracking-widest opacity-70">{t.countdown[unit]}</div>
        </div>
      ))}
    </div>
  );
}
