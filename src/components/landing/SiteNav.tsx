"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LanguageSwitcher, useI18n } from "@/i18n/client";

const links = [
  { href: "#demo", key: "demo" },
  { href: "#plantillas", key: "templates" },
  { href: "#paquetes", key: "plans" },
] as const;

export function SiteNav({ loggedIn }: { loggedIn: boolean }) {
  const { t } = useI18n();
  const [current, setCurrent] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  // Mientras el sobre de bienvenida se abre, el menú se queda oculto
  useEffect(() => {
    function update() {
      const welcome = document.getElementById("bienvenida");
      if (!welcome) return setVisible(true);
      const { bottom, height } = welcome.getBoundingClientRect();
      const range = height - window.innerHeight;
      setVisible(bottom - window.innerHeight <= range * 0.08);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Marca en el menú la sección que está a la vista
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setCurrent(`#${entry.target.id}`);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const { href } of links) {
      const el = document.querySelector(href);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-hidden={!visible}
      inert={!visible}
      className={`fixed inset-x-0 top-4 z-50 flex justify-center px-4 transition duration-500 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-6 opacity-0"
      }`}
    >
      <div className="flex items-center gap-1 rounded-full border border-[#e8dccb] bg-[#fffaf2]/85 p-1.5 shadow-[0_8px_30px_-12px_rgba(74,17,27,0.35)] backdrop-blur-md">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={`hidden rounded-full px-4 py-2 text-sm transition sm:block ${
              current === link.href ? "bg-white font-medium text-[#6b1d29] shadow-sm" : "text-[#4a2a2e]/70 hover:text-[#6b1d29]"
            }`}
          >
            {t.nav[link.key]}
          </a>
        ))}
        <Link
          href={loggedIn ? "/panel" : "/entrar"}
          className="rounded-full px-3 py-2 text-sm text-[#4a2a2e]/80 transition hover:text-[#6b1d29] sm:px-4"
        >
          {loggedIn ? t.nav.myPanel : t.nav.login}
        </Link>
        <Link
          href={loggedIn ? "/panel" : "/registro"}
          className="hidden rounded-full bg-[#6b1d29] px-5 py-2 text-sm font-medium text-[#f6efe2] shadow-sm transition hover:bg-[#7d2533] min-[420px]:block"
        >
          {t.nav.create}
        </Link>
        <LanguageSwitcher className="bg-[#6b1d29]/5 text-[#4a2a2e]" />
      </div>
    </nav>
  );
}
