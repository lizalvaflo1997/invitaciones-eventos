import type { Metadata } from "next";
import { ModuleNav } from "@/components/panel/ModuleNav";
import { getDictionary } from "@/i18n/server";
import { eventCopy } from "@/lib/event-copy";
import { getOwnedEvent } from "@/lib/events";
import { formatLongDate } from "@/lib/format";

export const metadata: Metadata = { robots: { index: false } };

// Días completos que faltan, contados en la Ciudad de México (zona de las invitaciones)
function daysUntil(date: Date) {
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(d);
  const diff = Date.parse(day(date)) - Date.parse(day(new Date()));
  return Math.round(diff / 86_400_000);
}

export default async function EventLayout({ children, params }: { children: React.ReactNode; params: Promise<{ adminToken: string }> }) {
  const { adminToken } = await params;
  const { event } = await getOwnedEvent(adminToken);
  const t = await getDictionary();
  const copy = eventCopy(event, t);
  const days = daysUntil(event.date);

  return (
    <div className="min-h-screen bg-[#f8f2e8] text-[#3f2a2d] lg:flex">
      <ModuleNav adminToken={adminToken} />

      <div className="min-w-0 flex-1">
        <header className="border-b border-[#c9a35f]/30 px-5 pb-6 pt-6 lg:px-10 lg:pt-8">
          <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4">
            <div>
              <span className="inline-block rounded-full bg-[#6b1d29]/8 px-3 py-1 text-xs font-medium text-[#6b1d29]">{copy.label}</span>
              <h1 className="mt-2 font-script text-5xl leading-tight text-[#7a1f2c]">{event.type === "OTRO" && event.title ? event.title : copy.names}</h1>
              <p className="text-sm text-[#6b4a4a] first-letter:uppercase">
                {formatLongDate(event.date, t.intl)} · {event.ceremonyTime}
                {days >= 0 && <span className="ml-2 font-medium text-[#8a6a35]">· {t.overview.daysLeft(days)}</span>}
              </p>
            </div>
            <a
              href={`/panel/${adminToken}/vista-previa`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[#6b1d29] px-5 py-2 text-sm font-medium text-[#6b1d29] transition hover:bg-[#6b1d29] hover:text-[#f6efe2]"
            >
              {t.overview.viewInvitation} ↗
            </a>
          </div>
        </header>

        <main className="px-5 py-8 lg:px-10">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
