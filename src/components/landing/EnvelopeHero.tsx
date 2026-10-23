"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LanguageSwitcher, useI18n } from "@/i18n/client";
import { BRAND_NAME } from "@/lib/brand";

// Se recuerda en el navegador para que quien regresa entre con el sobre ya abierto
const OPENED_KEY = "sello-y-sobre:abierto";
const AUTO_OPEN_MS = 3200;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const phase = (p: number, from: number, to: number) => clamp01((p - from) / (to - from));
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Chispas doradas que salen cuando se rompe el sello
const SPARKS = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2 + 0.3;
  return { x: Math.cos(angle), y: Math.sin(angle), size: 3 + (i % 3) };
});

// Recortes de cada solapa medidos sobre las fotos (porcentajes del sobre). Si cambias una
// foto, vuelve a medir dónde caen sus pliegues: la solapa de arriba termina en `tip`.
const LAYOUTS = {
  portrait: {
    src: "/sobre/sobre-vertical.webp",
    ratio: 1.5,
    tip: [50, 46.6],
    flap: "polygon(0.8% 0, 100% 0, 100% 4.6%, 50% 46.6%)",
    pockets: [
      "polygon(0 0, 0.8% 0, 50% 46.6%, 50% 47.3%, 0 90.2%)",
      "polygon(100% 4.6%, 50% 46.6%, 50% 47.3%, 100% 95.5%)",
      "polygon(0 90.2%, 50% 47.3%, 100% 95.5%, 100% 100%, 0 100%)",
    ],
  },
  landscape: {
    src: "/sobre/sobre-horizontal.webp",
    ratio: 2 / 3,
    tip: [49.5, 59.6],
    flap: "polygon(0 0, 100% 0, 100% 5.9%, 49.5% 59.6%)",
    pockets: [
      "polygon(0 0, 49.5% 59.6%, 49.7% 60%, 9.8% 100%, 0 100%)",
      "polygon(100% 5.9%, 49.5% 59.6%, 49.7% 60%, 100% 94.2%)",
      "polygon(9.8% 100%, 49.7% 60%, 100% 94.2%, 100% 100%)",
    ],
  },
} as const;

type Layout = keyof typeof LAYOUTS;

export function EnvelopeHero({ loggedIn }: { loggedIn: boolean }) {
  const { t } = useI18n();
  const { welcome, hero } = t.landing;

  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const envRef = useRef<HTMLDivElement>(null);
  const flapRef = useRef<HTMLDivElement>(null);
  const flapBackRef = useRef<HTMLDivElement>(null);
  const sealRef = useRef<HTMLButtonElement>(null);
  const sealLeftRef = useRef<HTMLDivElement>(null);
  const sealRightRef = useRef<HTMLDivElement>(null);
  const sparksRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const autoOpenRef = useRef<() => void>(() => {});
  const skipRef = useRef<() => void>(() => {});
  // Se decide en el navegador según el tamaño de pantalla; hasta entonces el sobre no se muestra
  const [layout, setLayout] = useState<Layout | null>(null);

  useEffect(() => {
    const section = sectionRef.current!;
    const stage = stageRef.current!;
    const env = envRef.current!;
    const flap = flapRef.current!;
    const seal = sealRef.current!;
    const card = cardRef.current!;
    const heroEl = heroRef.current!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let geo = { vw: 0, vh: 0, w: 0, h: 0, left: 0, top: 0, range: 1 };
    let frame = 0;
    let tween = 0;

    function measure() {
      const vw = stage.clientWidth;
      const vh = stage.clientHeight;
      // Vertical en celular (como una invitación en la mano), horizontal en computadora
      const portrait = vw < 768 || vh > vw;
      const config = LAYOUTS[portrait ? "portrait" : "landscape"];
      setLayout(portrait ? "portrait" : "landscape");
      const ratio = config.ratio;
      let w = portrait ? Math.min(vw * 0.8, 400) : Math.min(vw * 0.46, 640);
      let h = w * ratio;
      const maxH = vh * (portrait ? 0.6 : 0.56);
      if (h > maxH) {
        h = maxH;
        w = h / ratio;
      }
      const left = (vw - w) / 2;
      const top = (vh - h) / 2 + vh * 0.05;
      geo = { vw, vh, w, h, left, top, range: Math.max(1, section.offsetHeight - vh) };

      Object.assign(env.style, { left: `${left}px`, top: `${top}px`, width: `${w}px`, height: `${h}px` });
      // El sello va justo en la punta de la solapa
      const tipX = left + (w * config.tip[0]) / 100;
      const tipY = top + (h * config.tip[1]) / 100;
      const sealSize = Math.min(Math.max(Math.min(w, h) * 0.3, 72), 130);
      Object.assign(seal.style, {
        width: `${sealSize}px`,
        height: `${sealSize}px`,
        left: `${tipX - sealSize / 2}px`,
        top: `${tipY - sealSize / 2}px`,
      });
      Object.assign(sparksRef.current!.style, { left: `${tipX}px`, top: `${tipY}px` });
      Object.assign(titleRef.current!.style, { top: `${Math.max(16, top - 104)}px` });
      Object.assign(hintRef.current!.style, { top: `${Math.min(vh - 40, top + h + 22)}px` });
      Object.assign(heroEl.style, { width: `${vw}px`, height: `${vh}px` });
      render();
      // Si la orientación cambió, las piezas del sobre se montan después: se vuelve a dibujar
      requestAnimationFrame(render);
    }

    function render() {
      const { vw, vh, w, h, left, top, range } = geo;
      const p = clamp01(-section.getBoundingClientRect().top / range);

      const sealBreak = ease(phase(p, 0, 0.14));
      const flapOpen = ease(phase(p, 0.1, 0.34));
      const rise = ease(phase(p, 0.3, 0.62));
      const expand = ease(phase(p, 0.62, 1));

      // Rectángulo de la tarjeta: empieza dentro del sobre, sube y luego llena la pantalla
      const startTop = top + h * 0.04;
      const lift = Math.min(h * 0.62, startTop - 12) * rise;
      const rect = reduce
        ? { l: 0, t: 0, w: vw, h: vh }
        : {
            l: lerp(left + w * 0.05, 0, expand),
            t: lerp(startTop - lift, 0, expand),
            w: lerp(w * 0.9, vw, expand),
            h: lerp(h * 0.9, vh, expand),
          };
      const scale = Math.min(rect.w / vw, rect.h / vh);
      Object.assign(card.style, {
        left: `${rect.l}px`,
        top: `${rect.t}px`,
        width: `${rect.w}px`,
        height: `${rect.h}px`,
        zIndex: reduce || rise > 0.55 ? "5" : "2",
        borderRadius: `${lerp(4, 0, expand)}px`,
        opacity: reduce ? String(phase(p, 0, 0.5)) : "1",
        pointerEvents: p > 0.97 ? "auto" : "none",
      });
      heroEl.style.transform = `translate(${(rect.w - vw * scale) / 2}px, ${(rect.h - vh * scale) / 2}px) scale(${scale})`;

      const envFade = reduce ? 1 - phase(p, 0, 0.5) : 1 - expand;
      // Solo se aplica opacidad cuando hace falta: con opacidad < 1 el sobre crearía su
      // propia capa y la tarjeta ya no podría quedar entre el fondo y las solapas
      env.style.opacity = envFade < 1 ? String(envFade) : "";
      // El nombre se va antes que el sobre para que no asome detrás de la tarjeta que sube
      titleRef.current!.style.opacity = String(Math.min(envFade, 1 - phase(p, 0.28, 0.45)));
      flap.style.transform = reduce ? "" : `perspective(1100px) rotateX(${180 * flapOpen}deg)`;
      flap.style.zIndex = flapOpen > 0.5 ? "0" : "4";
      // La foto ya trae sus sombras; solo se agrega una mientras la solapa se levanta
      flap.style.filter = flapOpen > 0 && flapOpen < 1 ? "drop-shadow(0 6px 8px rgba(0,0,0,0.45))" : "none";
      // Pasados los 90° se ve el reverso de la solapa: el papel interior
      if (flapBackRef.current) flapBackRef.current.style.opacity = flapOpen > 0.5 ? "1" : "0";

      seal.style.opacity = String(1 - sealBreak);
      seal.style.pointerEvents = p > 0.02 ? "none" : "auto";
      seal.dataset.idle = String(p === 0);
      sealLeftRef.current!.style.transform = `translate(${-18 * sealBreak}px, ${12 * sealBreak}px) rotate(${-28 * sealBreak}deg)`;
      sealRightRef.current!.style.transform = `translate(${18 * sealBreak}px, ${12 * sealBreak}px) rotate(${28 * sealBreak}deg)`;
      const sparkGlow = reduce ? 0 : Math.sin(Math.PI * phase(p, 0, 0.16));
      sparksRef.current!.style.opacity = String(sparkGlow);
      sparksRef.current!.style.setProperty("--spread", `${70 * phase(p, 0, 0.16)}px`);

      hintRef.current!.style.opacity = String(1 - phase(p, 0, 0.06));
      const chromeFade = 1 - phase(p, 0.6, 0.8);
      chromeRef.current!.style.opacity = String(chromeFade);
      chromeRef.current!.style.pointerEvents = chromeFade > 0.1 ? "auto" : "none";

      if (p >= 0.999) {
        try {
          localStorage.setItem(OPENED_KEY, "1");
        } catch {}
      }
    }

    function onScroll() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(render);
    }

    const end = () => section.offsetTop + geo.range;
    const stopTween = () => cancelAnimationFrame(tween);

    // Al tocar el sello, se desplaza solo hasta el final para que la animación se vea completa
    autoOpenRef.current = () => {
      if (reduce) return window.scrollTo({ top: end() });
      stopTween();
      const from = window.scrollY;
      const to = end();
      const start = performance.now();
      const step = (now: number) => {
        const k = clamp01((now - start) / AUTO_OPEN_MS);
        window.scrollTo(0, lerp(from, to, ease(k)));
        if (k < 1) tween = requestAnimationFrame(step);
      };
      tween = requestAnimationFrame(step);
    };
    skipRef.current = () => {
      stopTween();
      window.scrollTo({ top: end() });
    };

    measure();
    let opened = false;
    try {
      opened = localStorage.getItem(OPENED_KEY) === "1";
    } catch {}
    if (opened && window.scrollY < 5 && !window.location.hash) window.scrollTo({ top: end() });

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    // Si la persona mueve la rueda o el dedo, se detiene la apertura automática
    window.addEventListener("wheel", stopTween, { passive: true });
    window.addEventListener("touchstart", stopTween, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      stopTween();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      window.removeEventListener("wheel", stopTween);
      window.removeEventListener("touchstart", stopTween);
    };
  }, []);

  return (
    <section id="bienvenida" ref={sectionRef} className="relative h-[280svh] bg-[#1c080d]">
      <div ref={stageRef} className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#3a0f18_0%,#1c080d_65%)]" aria-hidden />

        <div ref={chromeRef} className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
          <LanguageSwitcher className="bg-white/10 text-[#e3c27a]" />
          <div className="flex items-center gap-1">
            <Link
              href={loggedIn ? "/panel" : "/entrar"}
              className="rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.25em] text-[#a8837a] transition hover:text-[#e3c27a]"
            >
              {loggedIn ? t.nav.myPanel : t.nav.login}
            </Link>
            <button
              type="button"
              onClick={() => skipRef.current()}
              className="rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.25em] text-[#a8837a] transition hover:text-[#e3c27a]"
            >
              {welcome.skip}
            </button>
          </div>
        </div>

        <div ref={titleRef} className="absolute inset-x-0 text-center">
          <p className="font-script text-4xl text-[#e3c27a] sm:text-5xl">{BRAND_NAME}</p>
          <p className="mt-2 font-serif text-xs uppercase tracking-[0.4em] text-[#a8837a]">{welcome.tagline}</p>
        </div>

        {/* Sobre: fondo, tarjeta (fuera de este contenedor), bolsillos y solapa */}
        <div ref={envRef} className={layout ? "absolute" : "invisible absolute"}>
          <div className="absolute inset-0 z-[1] overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)]">
            <Image src="/sobre/interior.webp" alt="" fill sizes="(max-width: 768px) 80vw, 46vw" className="object-cover" />
            <div className="absolute inset-0 bg-black/15" />
          </div>
          {layout &&
            LAYOUTS[layout].pockets.map((clip) => (
              <div key={clip} className="absolute inset-0 z-[3]" style={{ clipPath: clip }}>
                <Image
                  src={LAYOUTS[layout].src}
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 768px) 80vw, 46vw"
                  quality={85}
                  className="object-cover"
                />
              </div>
            ))}
          {/* Solapa: ocupa todo el sobre y se recorta, así gira sobre el borde de arriba */}
          <div ref={flapRef} className="absolute inset-0 z-[4] origin-top">
            {layout && (
              <div className="absolute inset-0" style={{ clipPath: LAYOUTS[layout].flap }}>
                <Image
                  src={LAYOUTS[layout].src}
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 768px) 80vw, 46vw"
                  quality={85}
                  className="object-cover"
                />
                <div ref={flapBackRef} className="absolute inset-0 opacity-0">
                  <Image src="/sobre/interior.webp" alt="" fill sizes="(max-width: 768px) 80vw, 46vw" className="object-cover" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          ref={cardRef}
          className="absolute overflow-hidden bg-[#f6efe2] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]"
          onFocusCapture={() => skipRef.current()}
        >
          <div ref={heroRef} className="absolute left-0 top-0 origin-top-left">
            <div className="pointer-events-none absolute inset-3 border border-[#c9a35f]/60 sm:inset-5" aria-hidden />
            <div className="pointer-events-none absolute inset-[18px] border border-[#c9a35f]/30 sm:inset-[26px]" aria-hidden />
            <div className="flex h-full flex-col items-center justify-center px-8 text-center text-[#3f1a20]">
              <p className="font-serif text-[0.7rem] uppercase tracking-[0.3em] text-[#8a6a35] sm:text-xs sm:tracking-[0.4em]">{hero.eyebrow}</p>
              <h1 className="mt-6 font-script text-6xl leading-[1.05] text-[#7a1f2c] sm:text-8xl">
                {hero.titleLine1}
                <br />
                {hero.titleLine2}
              </h1>
              <div className="my-6 h-px w-16 bg-[#c9a35f]" aria-hidden />
              <p className="max-w-xl font-serif text-xl leading-relaxed text-[#6b4a4a] sm:text-2xl">{hero.text}</p>
              <div className="mt-10 flex flex-wrap justify-center gap-3">
                <Link
                  href={loggedIn ? "/panel" : "/registro"}
                  className="rounded-full bg-[#6b1d29] px-7 py-3 font-medium text-[#f6efe2] transition hover:bg-[#7d2533]"
                >
                  {hero.ctaCreate}
                </Link>
                <a
                  href="#demo"
                  className="rounded-full border border-[#6b1d29] px-7 py-3 font-medium text-[#6b1d29] transition hover:bg-[#6b1d29]/5"
                >
                  {hero.ctaDemo}
                </a>
              </div>
              <p className="mt-12 animate-bounce text-xs uppercase tracking-[0.3em] text-[#a8837a]">{hero.scrollHint} ↓</p>
            </div>
          </div>
        </div>

        <div ref={sparksRef} className="pointer-events-none absolute z-[6] opacity-0" aria-hidden>
          {SPARKS.map((spark, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-[#f3d58a]"
              style={{
                width: spark.size,
                height: spark.size,
                left: 0,
                top: 0,
                transform: `translate(calc(${spark.x} * var(--spread, 0px) - 50%), calc(${spark.y} * var(--spread, 0px) - 50%))`,
              }}
            />
          ))}
        </div>

        <button
          ref={sealRef}
          type="button"
          onClick={() => autoOpenRef.current()}
          aria-label={welcome.openSeal}
          className="seal absolute z-[6] cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e3c27a]"
        >
          {/* La misma imagen dos veces, cada una recortada a una mitad, para que el sello se parta */}
          {[
            { ref: sealLeftRef, clip: "inset(0 50% 0 0)" },
            { ref: sealRightRef, clip: "inset(0 0 0 50%)" },
          ].map(({ ref, clip }) => (
            <div key={clip} ref={ref} className="absolute inset-0" style={{ clipPath: clip }}>
              <Image
                src="/sobre/sello.webp"
                alt=""
                width={512}
                height={512}
                sizes="130px"
                priority
                className="h-full w-full drop-shadow-[0_6px_8px_rgba(0,0,0,0.5)]"
              />
            </div>
          ))}
        </button>

        <p ref={hintRef} className="absolute inset-x-0 text-center font-serif text-lg italic text-[#a8837a]">
          {welcome.hint}
        </p>
      </div>
    </section>
  );
}
