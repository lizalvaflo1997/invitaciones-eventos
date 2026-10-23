import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EnvelopeIntro } from "@/components/EnvelopeIntro";
import { LanguageSwitcher } from "@/i18n/client";
import { getDictionary } from "@/i18n/server";
import { db } from "@/lib/db";
import { eventCopy } from "@/lib/event-copy";
import { templates } from "@/templates";

type Params = { params: Promise<{ token: string }> };

async function getGuest(token: string) {
  return db.guest.findUnique({
    where: { token },
    include: { event: { include: { template: true } } },
  });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const guest = await getGuest((await params).token);
  if (!guest) return {};
  const t = await getDictionary();
  const copy = eventCopy(guest.event, t);
  return {
    title: t.invite.metaTitle(copy.names, copy.eyebrow),
    description: t.invite.metaDescription(guest.name),
    robots: { index: false },
  };
}

export default async function InvitationPage({ params }: Params) {
  const guest = await getGuest((await params).token);
  if (!guest) notFound();
  const t = await getDictionary();

  const { event } = guest;
  const Template = templates[event.template.slug];
  if (!Template) throw new Error(`Plantilla sin componente: ${event.template.slug}`);

  return (
    <>
      <EnvelopeIntro
        guestName={guest.name}
        eyebrow={eventCopy(event, t).eyebrow}
        musicUrl={event.musicUrl}
        toolbar={<LanguageSwitcher className="bg-[#3f3a33]/10 text-[#3f3a33] backdrop-blur-md" />}
      />
      <Template event={event} guest={guest} t={t} />
    </>
  );
}
