"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(auth)/actions";
import { LanguageSwitcher, useI18n } from "@/i18n/client";
import { BRAND_NAME } from "@/lib/brand";
import { MODULES } from "@/lib/modules";
import { ModuleIcon } from "./ModuleIcon";

// Menú de módulos: columna lateral en computadora y fila deslizable en celular
export function ModuleNav({ adminToken }: { adminToken: string }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const base = `/panel/${adminToken}`;

  const items = MODULES.map((module) => {
    const href = "path" in module ? `${base}${module.path}` : null;
    return { ...module, href, label: t.modules[module.key], active: href !== null && pathname === href };
  });

  return (
    <>
      {/* Computadora */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-[#c9a35f]/30 bg-[#fffaf2] lg:flex">
        <div className="px-6 pb-4 pt-6">
          <Link href="/panel" className="font-script text-3xl text-[#7a1f2c]">
            {BRAND_NAME}
          </Link>
          <Link href="/panel" className="mt-2 block text-sm text-[#6b1d29]/70 transition hover:text-[#6b1d29]">
            {t.panel.backToEvents}
          </Link>
        </div>
        <nav aria-label={t.modules.menu} className="flex-1 overflow-y-auto px-3 pb-4">
          <ul className="space-y-0.5">
            {items.map((item) => (
              <li key={item.key}>
                {item.href ? (
                  <Link
                    href={item.href}
                    aria-current={item.active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                      item.active ? "bg-[#6b1d29] font-medium text-[#f6efe2]" : "text-[#4a2a2e] hover:bg-[#6b1d29]/5"
                    }`}
                  >
                    <ModuleIcon name={item.icon} />
                    {item.label}
                  </Link>
                ) : (
                  <span aria-disabled className="flex cursor-default items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#4a2a2e]/45">
                    <ModuleIcon name={item.icon} />
                    {item.label}
                    <span className="ml-auto rounded-full bg-[#c9a35f]/15 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-[#8a6a35]">
                      {t.modules.soon}
                    </span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center justify-between gap-2 border-t border-[#c9a35f]/30 px-5 py-4">
          <LanguageSwitcher className="bg-[#6b1d29]/5 text-[#4a2a2e]" />
          <form action={logout}>
            <button className="text-sm text-[#6b1d29]/80 transition hover:text-[#6b1d29]">{t.panel.logout}</button>
          </form>
        </div>
      </aside>

      {/* Celular */}
      <div className="sticky top-0 z-30 border-b border-[#c9a35f]/30 bg-[#fffaf2]/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 pt-3">
          <Link href="/panel" className="font-script text-2xl text-[#7a1f2c]">
            {BRAND_NAME}
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher className="bg-[#6b1d29]/5 text-[#4a2a2e]" />
            <form action={logout}>
              <button className="text-xs text-[#6b1d29]/80">{t.panel.logout}</button>
            </form>
          </div>
        </div>
        <nav aria-label={t.modules.menu} className="overflow-x-auto px-3 py-2.5 [scrollbar-width:none]">
          <ul className="flex w-max gap-1.5">
            {items
              .filter((item) => item.href)
              .map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href!}
                    aria-current={item.active ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm whitespace-nowrap transition ${
                      item.active ? "bg-[#6b1d29] text-[#f6efe2]" : "bg-[#6b1d29]/5 text-[#4a2a2e]"
                    }`}
                  >
                    <ModuleIcon name={item.icon} className="size-4" />
                    {item.label}
                  </Link>
                </li>
              ))}
          </ul>
        </nav>
      </div>
    </>
  );
}
