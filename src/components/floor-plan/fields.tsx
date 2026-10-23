"use client";

import { useState } from "react";

export const inputClass =
  "w-full rounded-lg border border-[#e3ddd5] bg-white px-2.5 py-1.5 text-sm text-[#3f2a2d] outline-none transition focus:border-[#6b1d29] focus:ring-2 focus:ring-[#6b1d29]/15";

// Campo numérico que solo guarda al salir o con Enter, para que cada tecla no sea un paso del historial
export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onCommit: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const [prev, setPrev] = useState(value);
  // Si el valor cambia desde fuera (deshacer, otra selección), se actualiza el campo
  if (prev !== value) {
    setPrev(value);
    setText(String(value));
  }
  const commit = () => {
    const n = Number(text.replace(",", "."));
    if (!Number.isFinite(n)) return setText(String(value));
    const clamped = Math.min(max, Math.max(min, n));
    setText(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };
  return (
    <label className="flex flex-col gap-1 text-xs text-[#7a6a62]">
      {label}
      <input
        inputMode="decimal"
        value={text}
        step={step}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
        className={inputClass}
      />
    </label>
  );
}

export function TextField({ label, value, onCommit }: { label: string; value: string; onCommit: (value: string) => void }) {
  const [text, setText] = useState(value);
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setText(value);
  }
  const commit = () => {
    const clean = text.trim().slice(0, 40);
    if (!clean) return setText(value);
    if (clean !== value) onCommit(clean);
  };
  return (
    <label className="flex flex-col gap-1 text-xs text-[#7a6a62]">
      {label}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
        className={inputClass}
      />
    </label>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-[#3f2a2d]">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-[#6b1d29]" : "bg-[#d9d2c9]"}`}
      >
        <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}

export function Section({ title, children, action }: { title?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="border-b border-[#eee9e2] px-4 py-4 last:border-0">
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8a7d74]">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export const primaryButton =
  "rounded-lg bg-[#6b1d29] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#7d2533] disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryButton =
  "rounded-lg border border-[#e3ddd5] bg-white px-3 py-2 text-sm font-medium text-[#3f2a2d] transition hover:border-[#c9b9a6] hover:bg-[#faf8f5] disabled:cursor-not-allowed disabled:opacity-50";
