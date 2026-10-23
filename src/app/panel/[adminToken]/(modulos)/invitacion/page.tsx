import { EventForm } from "@/components/event/EventForm";
import { getDictionary } from "@/i18n/server";
import { db } from "@/lib/db";
import { eventToFormValues } from "@/lib/event-form";
import { getOwnedEvent } from "@/lib/events";
import { updateEvent } from "../../actions";

type Props = {
  params: Promise<{ adminToken: string }>;
  searchParams: Promise<{ guardado?: string }>;
};

export default async function InvitationModule({ params, searchParams }: Props) {
  const { adminToken } = await params;
  const saved = (await searchParams).guardado === "1";
  const { event } = await getOwnedEvent(adminToken);
  const { editEvent: copy, panel, landing } = await getDictionary();

  // Las plantillas del catálogo y, si es un diseño personalizado, la de este evento
  const templates = await db.template.findMany({
    where: { OR: [{ isCustom: false }, { id: event.templateId }] },
    orderBy: { name: "asc" },
  });
  const minDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());

  return (
    <div className="mx-auto max-w-3xl">
      {saved && (
        <p role="status" className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✓ {panel.saved}
        </p>
      )}
      <header className="mb-8">
        <h2 className="font-serif text-3xl text-[#6b1d29]">{copy.title}</h2>
        <p className="mt-1 text-[#6b4a4a]">{copy.subtitle}</p>
      </header>
      <EventForm
        action={updateEvent.bind(null, adminToken)}
        initialValues={eventToFormValues(event)}
        submitLabel={copy.submit}
        submittingLabel={copy.submitting}
        minDate={minDate}
        templates={templates.map((t) => ({
          id: t.id,
          slug: t.slug,
          name: landing.templates[t.slug]?.name ?? t.name,
          description: landing.templates[t.slug]?.description ?? t.description,
        }))}
      />
    </div>
  );
}
