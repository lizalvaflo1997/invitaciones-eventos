import Image from "next/image";
import Link from "next/link";
import { LanguageSwitcher } from "@/i18n/client";
import { getDictionary } from "@/i18n/server";
import { BRAND_NAME } from "@/lib/brand";

// Marco común de "Entrar" y "Crear cuenta": el sobre de la portada a un lado y la tarjeta marfil al otro
export async function AuthShell({ children }: { children: React.ReactNode }) {
  const { auth } = await getDictionary();

  return (
    <main className="grid min-h-[100svh] bg-[#f8f2e8] text-[#4a2a2e] lg:grid-cols-[1.05fr_1fr]">
      {/* Computadora: el sobre cerrado ocupa toda la columna izquierda */}
      <aside className="relative hidden overflow-hidden bg-[#1c080d] lg:block">
        <Image src="/sobre/sobre-vertical.webp" alt="" fill priority sizes="55vw" className="object-cover opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#1c080d_95%)]" aria-hidden />
        <div className="relative flex h-full flex-col items-center justify-center px-10 text-center">
          <Link href="/" className="font-script text-6xl text-[#e3c27a] drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
            {BRAND_NAME}
          </Link>
          <Image
            src="/sobre/sello.webp"
            alt=""
            width={512}
            height={512}
            sizes="160px"
            className="my-10 size-40 drop-shadow-[0_10px_18px_rgba(0,0,0,0.55)]"
          />
          <p className="max-w-sm font-serif text-2xl italic leading-snug text-[#f3e3c3]">{auth.sideText}</p>
        </div>
      </aside>

      <div className="flex flex-col">
        {/* Celular: una franja con el sobre y el sello montado sobre la tarjeta */}
        <div className="relative h-44 overflow-hidden bg-[#1c080d] lg:hidden">
          <Image src="/sobre/sobre-horizontal.webp" alt="" fill priority sizes="100vw" className="object-cover opacity-75" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1c080d]/70 to-transparent" aria-hidden />
          <Link href="/" className="absolute inset-x-0 top-5 text-center font-script text-4xl text-[#e3c27a]">
            {BRAND_NAME}
          </Link>
        </div>

        <div className="flex items-center justify-between px-5 pt-4 lg:px-10 lg:pt-8">
          <Link href="/" className="text-sm text-[#6b1d29]/80 transition hover:text-[#6b1d29]">
            {auth.backHome}
          </Link>
          <LanguageSwitcher className="bg-[#6b1d29]/5 text-[#4a2a2e]" />
        </div>

        <section className="flex flex-1 items-start justify-center px-5 pb-12 pt-10 lg:items-center lg:px-10 lg:pt-4">
          <div className="relative w-full max-w-md">
            <Image
              src="/sobre/sello.webp"
              alt=""
              width={512}
              height={512}
              sizes="72px"
              className="absolute -top-9 left-1/2 z-10 size-[72px] -translate-x-1/2 drop-shadow-[0_6px_10px_rgba(0,0,0,0.35)] lg:hidden"
            />
            <div className="relative rounded-sm bg-[#fffaf2] px-7 pb-9 pt-12 shadow-[0_30px_60px_-30px_rgba(74,17,27,0.45)] sm:px-10">
              <div className="pointer-events-none absolute inset-2.5 border border-[#c9a35f]/50" aria-hidden />
              <div className="pointer-events-none absolute inset-[14px] border border-[#c9a35f]/25" aria-hidden />
              <div className="relative">{children}</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
