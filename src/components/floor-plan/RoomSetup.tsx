"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { inputClass, primaryButton, secondaryButton } from "./fields";

// Primer paso: medidas del salón (en metros) o un salón de ejemplo
export function RoomSetup({ existingTables, onCreate, onDemo }: { existingTables: number; onCreate: (lengthCm: number, widthCm: number) => void; onDemo: () => void }) {
  const { floorPlan: t } = useI18n().t;
  const copy = t.setup;
  const [length, setLength] = useState("20");
  const [width, setWidth] = useState("15");
  const [error, setError] = useState(false);

  const l = Number(length.replace(",", "."));
  const w = Number(width.replace(",", "."));
  const area = l * w;
  // Cabe en un recuadro de 160 × 96 px conservando la proporción
  const previewScale = area > 0 ? Math.min(160 / l, 96 / w) : 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(l >= 2 && l <= 200 && w >= 2 && w <= 200)) return setError(true);
    onCreate(Math.round(l * 100), Math.round(w * 100));
  };


  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-[#ece6de] bg-white p-7 shadow-[0_20px_50px_-30px_rgba(63,42,45,0.4)]">
        <h1 className="text-2xl font-semibold text-[#3f2a2d]">{copy.title}</h1>
        <p className="mt-2 text-sm text-[#7a6a62]">{copy.subtitle}</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-[#7a6a62]">
            {copy.length}
            <input inputMode="decimal" value={length} onChange={(e) => {
                setLength(e.target.value);
                setError(false);
              }} className={`${inputClass} text-base`} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[#7a6a62]">
            {copy.width}
            <input inputMode="decimal" value={width} onChange={(e) => {
                setWidth(e.target.value);
                setError(false);
              }} className={`${inputClass} text-base`} />
          </label>
        </div>
        {/* Vista previa proporcional del salón */}
        {area > 0 && (
          <div className="mt-4 flex h-28 items-center justify-center rounded-lg bg-[#f6f3ef]">
            <div
              className="rounded-sm border-2 border-[#3f2a2d] bg-white"
              style={{ width: `${l * previewScale}px`, height: `${w * previewScale}px` }}
            />
            <span className="ml-3 text-sm tabular-nums text-[#7a6a62]">{Math.round(area)} m²</span>
          </div>
        )}
        {error && <p className="mt-3 text-sm text-[#b4232f]">{copy.invalid}</p>}
        {existingTables > 0 && <p className="mt-3 rounded-lg bg-[#c9a35f]/12 px-3 py-2 text-xs text-[#6b4a4a]">{copy.existing(existingTables)}</p>}

        <button className={`${primaryButton} mt-5 w-full py-2.5`}>{copy.create}</button>
        <div className="mt-3 border-t border-[#eee9e2] pt-3">
          <button type="button" onClick={onDemo} className={`${secondaryButton} w-full`}>
            {copy.demo}
          </button>
          <p className="mt-1.5 text-center text-xs text-[#a59a92]">{copy.demoHint}</p>
        </div>
      </form>
    </div>
  );
}
