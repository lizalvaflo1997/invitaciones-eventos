import type { Metadata } from "next";
import Link from "next/link";
import { LanguageSwitcher } from "@/i18n/client";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { BRAND_NAME } from "@/lib/brand";
import { db } from "@/lib/db";
import { EventForm } from "@/components/event/EventForm";
import { createEvent } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const { newEvent } = await getDictionary();
  return { title: newEvent.meta, robots: { index: false } };
}

export default async function NewEventPage() {
  await requireUser("/panel/nuevo");
  const { newEvent: copy, panel, landing } = await getDictionary();
  const templates = await db.template.findMany({ where: { isCustom: false }, orderBy: { name: "asc" } });
  // Hoy en la Ciudad de México, en el formato que usan los campos de fecha (AAAA-MM-DD)
  const minDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());

  return (
    <main className="min-h-screen bg-[#f8f2e8] px-4 py-8 text-[#3f2a2d]">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/panel" className="text-sm text-[#6b1d29]/80 transition hover:text-[#6b1d29]">
            {panel.backToEvents}
          </Link>
          <LanguageSwitcher className="bg-[#6b1d29]/5 text-[#4a2a2e]" />
        </div>

        <header className="mb-8 mt-10 text-center">
          <p className="font-script text-3xl text-[#b08d57]">{BRAND_NAME}</p>
          <h1 className="mt-2 font-serif text-4xl text-[#6b1d29] sm:text-5xl">{copy.title}</h1>
          <div className="mx-auto my-4 h-px w-14 bg-[#c9a35f]" aria-hidden />
          <p className="font-serif text-lg text-[#6b4a4a]">{copy.subtitle}</p>
        </header>

        <EventForm
          action={createEvent}
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
    </main>
  );
}
