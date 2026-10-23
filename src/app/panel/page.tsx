import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { LanguageSwitcher } from "@/i18n/client";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { BRAND_NAME } from "@/lib/brand";
import { db } from "@/lib/db";
import { eventCopy } from "@/lib/event-copy";
import { formatLongDate } from "@/lib/format";

export const metadata: Metadata = { robots: { index: false } };

export default async function EventsPage() {
  const user = await requireUser("/panel");
  const t = await getDictionary();
  const { panel } = t;
  const events = await db.event.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
    include: { _count: { select: { guests: true } } },
  });

  return (
    <main className="min-h-screen bg-[#f8f2e8] px-4 py-8 text-[#3f2a2d]">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="font-script text-3xl text-[#7a1f2c]">
            {BRAND_NAME}
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher className="bg-[#6b1d29]/5 text-[#4a2a2e]" />
            <form action={logout}>
              <button className="rounded-full border border-[#6b1d29]/30 px-4 py-1.5 text-sm text-[#6b1d29] transition hover:bg-[#6b1d29]/5">
                {panel.logout}
              </button>
            </form>
          </div>
        </div>

        <header className="mt-12 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-serif text-xl italic text-[#8a6a35]">{panel.greeting(user.name)}</p>
            <h1 className="mt-1 font-serif text-4xl text-[#6b1d29]">{panel.myEvents}</h1>
          </div>
          {events.length > 0 && (
            <Link
              href="/panel/nuevo"
              className="rounded-full bg-[#6b1d29] px-5 py-2.5 text-sm font-medium text-[#f6efe2] transition hover:bg-[#7d2533]"
            >
              {panel.newEvent}
            </Link>
          )}
        </header>

        {events.length > 0 ? (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {events.map((w) => (
              <li key={w.id}>
                <Link
                  href={`/panel/${w.adminToken}`}
                  className="group block rounded-2xl border border-[#c9a35f]/40 bg-[#fffaf2] p-6 transition hover:border-[#c9a35f] hover:shadow-[0_20px_40px_-24px_rgba(74,17,27,0.5)]"
                >
                  <span className="inline-block rounded-full bg-[#c9a35f]/15 px-2.5 py-0.5 text-xs font-medium text-[#8a6a35]">
                    {t.eventTypes[w.type].label}
                  </span>
                  <p className="mt-2 font-script text-4xl text-[#7a1f2c]">{w.type === "OTRO" && w.title ? w.title : eventCopy(w, t).names}</p>
                  <p className="mt-2 text-sm text-[#6b4a4a] first-letter:uppercase">{formatLongDate(w.date, t.intl)}</p>
                  <p className="text-sm text-[#a8837a]">{panel.guestsCount(w._count.guests)}</p>
                  <p className="mt-5 text-sm font-medium text-[#6b1d29] group-hover:underline">{panel.openPanel}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-8 rounded-2xl border border-[#c9a35f]/40 bg-[#fffaf2] px-6 py-12 text-center">
            <Image src="/sobre/sello.webp" alt="" width={512} height={512} sizes="80px" className="mx-auto size-20" />
            <h2 className="mt-6 font-serif text-3xl text-[#6b1d29]">{panel.emptyTitle}</h2>
            <p className="mx-auto mt-3 max-w-md text-[#6b4a4a]">{panel.emptyText}</p>
            <Link
              href="/panel/nuevo"
              className="mt-8 inline-block rounded-full bg-[#6b1d29] px-6 py-3 font-medium text-[#f6efe2] transition hover:bg-[#7d2533]"
            >
              {panel.emptyCta}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
