"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useTransition } from "react";
import { dictionaries, LOCALE_COOKIE, locales, type Dictionary, type Locale } from "./dictionaries";

// Solo se pasa el idioma: los diccionarios tienen funciones y no se pueden enviar del servidor al cliente
const I18nContext = createContext<{ locale: Locale; t: Dictionary } | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <I18nContext.Provider value={{ locale, t: dictionaries[locale] }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n debe usarse dentro de I18nProvider");
  return context;
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="group"
      aria-label={t.language.label}
      className={`flex items-center rounded-full p-0.5 text-xs font-medium ${pending ? "opacity-60" : ""} ${className}`}
    >
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          onClick={() => change(l)}
          aria-pressed={l === locale}
          title={t.language[l]}
          className={`rounded-full px-2.5 py-1 uppercase transition ${l === locale ? "bg-white text-[#3f3a33] shadow-sm" : "opacity-60 hover:opacity-100"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
