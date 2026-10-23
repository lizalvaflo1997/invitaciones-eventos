import type { Guest } from "@prisma/client";
import { headers } from "next/headers";
import { getDictionary } from "@/i18n/server";
import { db } from "@/lib/db";
import { eventCopy } from "@/lib/event-copy";
import { getOwnedEvent } from "@/lib/events";
import { deleteGuest } from "../../actions";
import { AddGuestForm } from "./AddGuestForm";

const statusClassName = {
  PENDIENTE: "bg-amber-100 text-amber-800",
  CONFIRMADO: "bg-emerald-100 text-emerald-800",
  DECLINADO: "bg-neutral-200 text-neutral-700",
} as const;

function whatsappUrl(guest: Guest, text: string) {
  // Números de 10 dígitos se asumen de México (+52)
  const phone = guest.phone && guest.phone.length === 10 ? `52${guest.phone}` : guest.phone;
  return `https://wa.me/${phone ?? ""}?text=${encodeURIComponent(text)}`;
}

export default async function GuestsModule({ params }: { params: Promise<{ adminToken: string }> }) {
  const { adminToken } = await params;
  const { event } = await getOwnedEvent(adminToken);
  const t = await getDictionary();
  const { panel } = t;
  const copy = eventCopy(event, t);

  const guests = await db.guest.findMany({ where: { eventId: event.id }, orderBy: { createdAt: "asc" }, include: { table: true } });

  const h = await headers();
  const baseUrl = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  const stats = [
    { label: panel.stats.invited, value: guests.reduce((sum, g) => sum + g.seats, 0) },
    { label: panel.stats.confirmed, value: guests.reduce((sum, g) => sum + (g.status === "CONFIRMADO" ? (g.attending ?? 0) : 0), 0) },
    { label: panel.stats.pending, value: guests.filter((g) => g.status === "PENDIENTE").length },
    { label: panel.stats.declined, value: guests.filter((g) => g.status === "DECLINADO").length },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-3xl text-[#6b1d29]">{panel.guestsTitle}</h2>
        <p className="mt-1 text-[#6b4a4a]">{panel.guestsSubtitle}</p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-[#c9a35f]/40 bg-[#fffaf2] p-4">
            <p className="text-3xl font-semibold tabular-nums text-[#6b1d29]">{s.value}</p>
            <p className="text-sm text-[#6b4a4a]">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4 rounded-2xl border border-[#c9a35f]/40 bg-[#fffaf2] p-5">
        <h3 className="font-serif text-xl text-[#6b1d29]">{panel.addGuest}</h3>
        <AddGuestForm adminToken={adminToken} />
      </section>

      <section className="overflow-x-auto rounded-2xl border border-[#c9a35f]/40 bg-[#fffaf2]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#c9a35f]/30 text-xs uppercase tracking-wide text-[#8a6a35]">
            <tr>
              <th className="px-4 py-3">{panel.columns.guest}</th>
              <th className="px-4 py-3">{panel.columns.seats}</th>
              <th className="px-4 py-3">{panel.columns.status}</th>
              <th className="px-4 py-3">{panel.columns.table}</th>
              <th className="px-4 py-3">{panel.columns.notes}</th>
              <th className="px-4 py-3 text-right">{panel.columns.actions}</th>
            </tr>
          </thead>
          <tbody>
            {guests.map((g) => {
              const link = `${baseUrl}/i/${g.token}`;
              const message = panel.whatsappMessage(g.name, copy.names, copy.plural, copy.invitePhrase, link);
              return (
                <tr key={g.id} className="border-b border-[#c9a35f]/15 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">{g.name}</p>
                    {g.phone && <p className="text-xs text-[#a8837a]">{g.phone}</p>}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{g.status === "CONFIRMADO" ? panel.attendingOf(g.attending ?? 0, g.seats) : g.seats}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClassName[g.status]}`}>{panel.status[g.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-[#6b4a4a]">{g.table?.name ?? "—"}</td>
                  <td className="max-w-56 px-4 py-3 text-xs text-[#6b4a4a]">
                    {g.dietary && <p>🍽 {g.dietary}</p>}
                    {g.message && <p className="italic">“{g.message}”</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2 whitespace-nowrap">
                      <a href={link} target="_blank" rel="noreferrer" className="rounded-lg border border-[#c9a35f]/60 px-3 py-1.5 text-xs">
                        {panel.view}
                      </a>
                      <a
                        href={whatsappUrl(g, message)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
                      >
                        {panel.whatsapp}
                      </a>
                      <form action={deleteGuest.bind(null, adminToken, g.id)}>
                        <button className="rounded-lg px-2 py-1.5 text-xs text-red-700 hover:bg-red-50">{panel.remove}</button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {guests.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[#a8837a]">
                  {panel.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
