"use client";

import { useEffect, useRef, useState } from "react";
import type { ShowcaseMessage } from "@/components/EnvelopeIntro";
import { useI18n } from "@/i18n/client";
import type { Dictionary } from "@/i18n/dictionaries";

type Feature = {
  key: keyof Dictionary["demo"]["features"];
  icon: string;
  // id de la sección dentro de la invitación; null si no tiene sección propia
  section: string | null;
};

const left: Feature[] = [
  { key: "musica", icon: "🎵", section: "sobre" },
  { key: "para", icon: "💌", section: "para" },
  { key: "cuenta", icon: "⏳", section: "cuenta-regresiva" },
  { key: "ubicacion", icon: "📍", section: "ubicacion" },
];

const right: Feature[] = [
  { key: "vestimenta", icon: "👗", section: "vestimenta" },
  { key: "regalos", icon: "🎁", section: "regalos" },
  { key: "confirmar", icon: "✅", section: "confirmar" },
  { key: "whatsapp", icon: "💬", section: null },
];

const all = [...left, ...right];

export function DemoShowcase({ demoUrl }: { demoUrl: string }) {
  const { locale, t } = useI18n();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  // Resalta las funciones una por una hasta que la persona interactúa
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setActive((i) => (i + 1) % all.length), 3500);
    return () => clearInterval(id);
  }, [paused]);

  function select(index: number) {
    setActive(index);
    setPaused(true);
    const { section } = all[index];
    if (!section) return;
    const message: ShowcaseMessage = { type: "invitacion:ir", section };
    frameRef.current?.contentWindow?.postMessage(message, window.location.origin);
  }

  function renderCard(feature: Feature, index: number) {
    const isActive = index === active;
    const copy = t.demo.features[feature.key];
    return (
      <button
        key={feature.key}
        type="button"
        onClick={() => select(index)}
        onMouseEnter={() => setActive(index)}
        aria-pressed={isActive}
        className={`w-full rounded-2xl border px-5 py-4 text-left transition duration-500 ${
          isActive
            ? "border-[#c9a35f]/50 bg-[#fffaf2] opacity-100 shadow-[0_10px_30px_-12px_rgba(74,17,27,0.35)]"
            : "border-white/60 bg-white/35 opacity-55 shadow-sm hover:opacity-80"
        }`}
      >
        <p className="flex items-center gap-2 font-serif text-lg">
          <span className="text-base">{feature.icon}</span>
          {copy.title}
        </p>
        <p className="mt-1 text-sm leading-snug opacity-80">{copy.text}</p>
      </button>
    );
  }

  return (
    <section id="demo" className="scroll-mt-24 px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] opacity-70">{t.demo.eyebrow}</p>
          <h2 className="mt-3 font-serif text-4xl text-[#6b1d29]">{t.demo.title}</h2>
          <p className="mx-auto mt-3 max-w-lg opacity-80">{t.demo.text}</p>
        </div>

        <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1fr_auto_1fr]">
          <div className="order-2 grid gap-3 sm:grid-cols-2 lg:order-1 lg:grid-cols-1 lg:justify-items-end">
            {left.map((f, i) => renderCard(f, i))}
          </div>

          {/* Teléfono */}
          <div className="order-1 mx-auto lg:order-2">
            <div className="relative h-[700px] w-[340px] max-w-[calc(100vw-2rem)] rounded-[3.2rem] bg-gradient-to-b from-[#4a1f26] to-[#2a1014] p-[11px] shadow-[0_40px_80px_-30px_rgba(74,17,27,0.6)]">
              <span className="absolute -left-[3px] top-32 h-12 w-[3px] rounded-l bg-[#2a1014]" aria-hidden />
              <span className="absolute -left-[3px] top-48 h-16 w-[3px] rounded-l bg-[#2a1014]" aria-hidden />
              <span className="absolute -right-[3px] top-40 h-20 w-[3px] rounded-r bg-[#2a1014]" aria-hidden />
              <div className="relative h-full overflow-hidden rounded-[2.6rem] bg-black">
                {/* key: al cambiar de idioma se recarga la invitación de la demo */}
                <iframe
                  key={locale}
                  ref={frameRef}
                  src={demoUrl}
                  title={t.demo.frameTitle}
                  allow="autoplay"
                  className="h-full w-full border-0"
                />
                <span className="pointer-events-none absolute left-1/2 top-3 h-7 w-24 -translate-x-1/2 rounded-full bg-black" aria-hidden />
              </div>
            </div>
          </div>

          <div className="order-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {right.map((f, i) => renderCard(f, i + left.length))}
          </div>
        </div>
      </div>
    </section>
  );
}
