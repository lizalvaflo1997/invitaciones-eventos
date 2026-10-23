import type { Guest } from "@prisma/client";
import type { Metadata } from "next";
import { EnvelopeIntro } from "@/components/EnvelopeIntro";
import { LanguageSwitcher } from "@/i18n/client";
import { getDictionary } from "@/i18n/server";
import { eventCopy } from "@/lib/event-copy";
import { getOwnedEvent } from "@/lib/events";
import { templates } from "@/templates";

export const metadata: Metadata = { robots: { index: false } };

// La invitación tal como la verá un invitado, con uno de ejemplo; solo para el dueño del evento
export default async function PreviewPage({ params }: { params: Promise<{ adminToken: string }> }) {
  const { adminToken } = await params;
  const { event } = await getOwnedEvent(adminToken);
  const t = await getDictionary();

  const Template = templates[event.template.slug];
  if (!Template) throw new Error(`Plantilla sin componente: ${event.template.slug}`);

  const guest: Guest = {
    id: "vista-previa",
    eventId: event.id,
    tableId: null,
    name: t.invite.previewGuest,
    phone: null,
    seats: 2,
    token: "vista-previa",
    status: "PENDIENTE",
    attending: null,
    dietary: null,
    message: null,
    respondedAt: null,
    createdAt: new Date(),
  };

  return (
    <>
      <EnvelopeIntro
        guestName={guest.name}
        eyebrow={eventCopy(event, t).eyebrow}
        musicUrl={event.musicUrl}
        toolbar={<LanguageSwitcher className="bg-[#3f3a33]/10 text-[#3f3a33] backdrop-blur-md" />}
      />
      <Template event={event} guest={guest} t={t} preview />
    </>
  );
}
