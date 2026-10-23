"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/i18n/client";

// Mensaje que manda la página de inicio al teléfono de demostración
export type ShowcaseMessage = { type: "invitacion:ir"; section: string };

type Props = {
  guestName: string;
  // Encabezado según el tipo de evento, p. ej. "Nuestra boda" o "Mis XV años"
  eyebrow: string;
  musicUrl: string | null;
  // Controles que van arriba a la derecha junto al botón de música (p. ej. el idioma)
  toolbar?: ReactNode;
};

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor" />
      {muted ? (
        <path d="M16 9.5l5 5M21 9.5l-5 5" />
      ) : (
        <>
          <path d="M15.5 9a4 4 0 0 1 0 6" />
          <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
        </>
      )}
    </svg>
  );
}

type Phase = "closed" | "opening" | "open";

export function EnvelopeIntro({ guestName, eyebrow, musicUrl, toolbar }: Props) {
  const { t } = useI18n();
  const copy = t.envelope;
  const [phase, setPhase] = useState<Phase>("closed");
  const [playing, setPlaying] = useState(false);
  const [embedded, setEmbedded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const open = useCallback(
    (withMusic: boolean) => {
      // Si el navegador bloquea la reproducción, el botón simplemente queda en "Activar música"
      if (withMusic) audioRef.current?.play().catch(() => {});
      setPhase("opening");
      setTimeout(() => setPhase("open"), 1100);
    },
    [],
  );

  const close = useCallback(() => {
    audioRef.current?.pause();
    window.scrollTo({ top: 0 });
    setPhase("closed");
  }, []);

  // Dentro del teléfono de la página de inicio, los botones bajan para no quedar bajo la muesca
  useEffect(() => setEmbedded(window.self !== window.top), []);

  // Evita que la invitación se desplace mientras el sobre está cerrado
  useEffect(() => {
    document.documentElement.style.overflow = phase === "open" ? "" : "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [phase]);

  useEffect(() => {
    function onMessage(event: MessageEvent<ShowcaseMessage>) {
      if (event.origin !== window.location.origin || event.data?.type !== "invitacion:ir") return;
      const { section } = event.data;
      if (section === "sobre") return close();
      setPhase("open");
      // Espera un cuadro para que el contenido ya se pueda desplazar. Se usa scrollTo y no
      // scrollIntoView porque este último también movería la página que contiene el teléfono.
      requestAnimationFrame(() => {
        const rect = document.getElementById(section)?.getBoundingClientRect();
        if (!rect) return;
        const top = window.scrollY + rect.top - (window.innerHeight - rect.height) / 2;
        window.scrollTo({ top, behavior: "smooth" });
      });
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [close]);

  function toggleMusic() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }

  return (
    <>
      {/* El estado del botón sigue al audio real (el sistema también puede pausarlo) */}
      {musicUrl && (
        <audio
          ref={audioRef}
          src={musicUrl}
          loop
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
      )}

      <div className={`fixed right-3 z-[60] flex items-center gap-2 ${embedded ? "top-12" : "top-3"}`}>
        {phase === "open" && musicUrl && (
          <button
            type="button"
            onClick={toggleMusic}
            aria-pressed={!playing}
            aria-label={playing ? copy.muteMusic : copy.unmuteMusic}
            className="flex items-center gap-1.5 rounded-full bg-[#3f3a33]/10 px-3 py-1.5 text-xs font-medium text-[#3f3a33] backdrop-blur-md transition hover:bg-[#3f3a33]/15"
          >
            <SpeakerIcon muted={!playing} />
            {playing ? copy.muteMusic : copy.unmuteMusic}
          </button>
        )}
        {toolbar}
      </div>

      {phase !== "open" && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-[#16120e]/95 px-4 backdrop-blur-sm transition-opacity duration-700 ${
            phase === "opening" ? "opacity-0 delay-300" : "opacity-100"
          }`}
        >
          <div
            className={`relative w-full max-w-[330px] overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-[#faf6ef] to-[#ece3d4] px-5 pb-6 pt-20 text-center text-[#3f3a33] shadow-2xl transition-all duration-700 [perspective:800px] ${
              phase === "opening" ? "-translate-y-6 scale-105" : ""
            }`}
          >
            {/* Solapa del sobre */}
            <div
              className={`absolute inset-x-0 top-0 h-28 origin-top bg-gradient-to-b from-[#efe6d6] to-[#e6dac6] transition-transform duration-700 [clip-path:polygon(0_0,100%_0,50%_100%)] ${
                phase === "opening" ? "[transform:rotateX(180deg)]" : ""
              }`}
            />
            <div className="absolute left-1/2 top-[4.25rem] flex size-12 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-br from-[#c9a35f] to-[#8a6a35] text-white shadow-lg ring-2 ring-[#f3e6c8]/60">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <path d="M12 3l1.8 4.9L19 9.7l-4.3 3 1.5 5.3L12 15l-4.2 3 1.5-5.3L5 9.7l5.2-1.8z" />
              </svg>
            </div>

            <p className="mt-12 text-[0.65rem] uppercase tracking-[0.35em] opacity-70">{eyebrow}</p>
            <p className="mt-3 text-[0.65rem] uppercase tracking-[0.35em] opacity-70">{t.invite.invitationFor}</p>
            <h2 className="mt-2 font-serif text-[2.1rem] leading-tight">{guestName}</h2>
            <div className="mx-auto mt-4 h-px w-14 bg-[#b08d57]" />

            {musicUrl && (
              <p className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-[#f1e6cf] px-4 py-1.5 text-xs">
                <span className="text-[#b08d57]">♫</span> {copy.hasMusic}
              </p>
            )}
            <p className="mt-4 font-serif text-lg italic leading-snug opacity-90">
              {musicUrl ? copy.tapWithMusic : copy.tap}
            </p>

            <div className="mt-6 space-y-2.5">
              <button
                type="button"
                onClick={() => open(Boolean(musicUrl))}
                className="w-full whitespace-nowrap rounded-full bg-gradient-to-r from-[#8b7765] to-[#b8a48c] px-4 py-3.5 text-[0.95rem] font-medium text-white shadow-md transition hover:brightness-105"
              >
                {musicUrl ? `♫  ${copy.openWithMusic}` : copy.open}
              </button>
              {musicUrl && (
                <button
                  type="button"
                  onClick={() => open(false)}
                  className="w-full rounded-full border border-[#3f3a33]/15 px-5 py-3 text-sm transition hover:bg-white/50"
                >
                  {copy.openWithoutMusic}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );
}
