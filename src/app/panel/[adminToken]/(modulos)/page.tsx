import Link from "next/link";
import { ModuleIcon } from "@/components/panel/ModuleIcon";
import { getDictionary } from "@/i18n/server";
import { db } from "@/lib/db";
import { getOwnedEvent } from "@/lib/events";
import { UPCOMING_MODULES } from "@/lib/modules";

export default async function EventHomePage({ params }: { params: Promise<{ adminToken: string }> }) {
  const { adminToken } = await params;
  const { event } = await getOwnedEvent(adminToken);
  const t = await getDictionary();
  const { overview, panel, modules } = t;
  const base = `/panel/${adminToken}`;

  const guests = await db.guest.findMany({ where: { eventId: event.id } });
  const invited = guests.reduce((sum, g) => sum + g.seats, 0);
  const confirmed = guests.reduce((sum, g) => sum + (g.status === "CONFIRMADO" ? (g.attending ?? 0) : 0), 0);
  const answered = guests.filter((g) => g.status !== "PENDIENTE").length;
  // Lugares que ya tienen mesa: los confirmados cuentan lo que confirmaron; los pendientes, lo invitado
  const seated = guests
    .filter((g) => g.tableId && g.status !== "DECLINADO")
    .reduce((sum, g) => sum + (g.status === "CONFIRMADO" ? (g.attending ?? 0) : g.seats), 0);
  const progress = invited ? Math.round((confirmed / invited) * 100) : 0;

  const stats = [
    { label: panel.stats.invited, value: invited },
    { label: panel.stats.confirmed, value: confirmed },
    { label: panel.stats.pending, value: guests.filter((g) => g.status === "PENDIENTE").length },
    { label: overview.seated, value: seated },
  ];

  const actions = [
    { href: `${base}/invitados`, icon: "users", label: overview.manageGuests },
    { href: `${base}/mesas`, icon: "table", label: overview.manageTables },
    { href: `${base}/presupuesto`, icon: "wallet", label: overview.manageBudget },
    { href: `${base}/invitacion`, icon: "mail", label: overview.editInvitation },
  ] as const;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        {/* Invitación */}
        <section className="rounded-2xl border border-[#c9a35f]/40 bg-[#fffaf2] p-6">
          <h2 className="flex items-center gap-3 font-serif text-2xl text-[#6b1d29]">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#6b1d29]/8">
              <ModuleIcon name="mail" />
            </span>
            {overview.invitationTitle}
          </h2>
          <div className="mt-6 flex flex-col items-center gap-8 sm:flex-row sm:items-center">
            {/* Teléfono con la vista previa real, a la mitad de su tamaño */}
            <Link
              href={`${base}/vista-previa`}
              target="_blank"
              className="relative block h-[430px] w-[205px] shrink-0 rounded-[2.2rem] bg-gradient-to-b from-[#4a1f26] to-[#2a1014] p-[7px] shadow-[0_24px_50px_-24px_rgba(74,17,27,0.7)]"
              aria-label={overview.viewInvitation}
            >
              <div className="relative h-full w-full overflow-hidden rounded-[1.8rem] bg-black">
                <iframe
                  src={`${base}/vista-previa`}
                  title={overview.viewInvitation}
                  tabIndex={-1}
                  className="pointer-events-none absolute left-0 top-0 h-[832px] w-[382px] origin-top-left scale-50 border-0"
                />
                <span className="absolute left-1/2 top-2 h-4 w-14 -translate-x-1/2 rounded-full bg-black" aria-hidden />
              </div>
            </Link>

            <div className="w-full space-y-4">
              <div className="rounded-xl bg-[#c9a35f]/12 p-4">
                <p className="font-medium text-[#4a2a2e]">{overview.confirmedOf(confirmed, invited)}</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#c9a35f]/25">
                  <div className="h-full rounded-full bg-[#6b1d29]" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-2 text-sm text-[#6b4a4a]">{overview.responses(answered, guests.length)}</p>
              </div>
              <Link
                href={`${base}/invitados`}
                className="block rounded-full bg-[#6b1d29] px-6 py-3 text-center font-medium text-[#f6efe2] transition hover:bg-[#7d2533]"
              >
                {overview.sendInvitations}
              </Link>
              <Link
                href={`${base}/invitacion`}
                className="block rounded-full border border-[#6b1d29] px-6 py-3 text-center font-medium text-[#6b1d29] transition hover:bg-[#6b1d29]/5"
              >
                {overview.editInvitation}
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-[#c9a35f]/40 bg-[#fffaf2] p-4">
              <p className="text-3xl font-semibold tabular-nums text-[#6b1d29]">{s.value}</p>
              <p className="text-sm text-[#6b4a4a]">{s.label}</p>
            </div>
          ))}
        </section>
      </div>

      <aside className="space-y-6">
        <section>
          <h2 className="mb-3 font-serif text-xl text-[#6b1d29]">{overview.actions}</h2>
          <ul className="space-y-2.5">
            {actions.map((action) => (
              <li key={action.href}>
                <Link
                  href={action.href}
                  className="flex items-center gap-3 rounded-xl border border-[#c9a35f]/40 bg-[#fffaf2] px-4 py-3.5 font-medium text-[#4a2a2e] transition hover:border-[#6b1d29]/40 hover:shadow-[0_10px_24px_-16px_rgba(74,17,27,0.6)]"
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-[#6b1d29]/8 text-[#6b1d29]">
                    <ModuleIcon name={action.icon} />
                  </span>
                  {action.label}
                  <span className="ml-auto text-[#a8837a]" aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-[#c9a35f]/40 bg-[#fffaf2] p-5">
          <h2 className="font-serif text-xl text-[#6b1d29]">{overview.explore}</h2>
          <ul className="mt-4 space-y-4">
            {UPCOMING_MODULES.map((module) => (
              <li key={module.key} className="flex gap-3">
                <span className="mt-0.5 text-[#b08d57]">
                  <ModuleIcon name={module.icon} />
                </span>
                <div>
                  <p className="flex items-center gap-2 font-medium text-[#4a2a2e]">
                    {modules[module.key]}
                    <span className="rounded-full bg-[#c9a35f]/15 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-[#8a6a35]">
                      {modules.soon}
                    </span>
                  </p>
                  <p className="text-sm text-[#6b4a4a]">{modules.descriptions[module.key]}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
