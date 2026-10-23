"use server";

import { customAlphabet, nanoid } from "nanoid";
import { redirect } from "next/navigation";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readEventForm, type EventFormState } from "@/lib/event-form";

// Sufijo para que dos eventos con los mismos nombres no choquen; solo letras y números para que se lea bien
const slugSuffix = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

const slugify = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export async function createEvent(_prev: EventFormState, formData: FormData): Promise<EventFormState> {
  const user = await requireUser("/panel/nuevo");
  const { newEvent, intl } = await getDictionary();

  const result = await readEventForm(formData, {
    intl,
    errors: newEvent.errors,
    findTemplate: (id) => db.template.findFirst({ where: { id, isCustom: false } }),
  });
  if (!result.ok) return result.state;

  const { title, honoreeOne, honoreeTwo } = result.data;
  const base = title ?? [honoreeOne, honoreeTwo].filter(Boolean).join(" y ");
  const event = await db.event.create({
    data: {
      ...result.data,
      userId: user.id,
      slug: `${slugify(base)}-${slugSuffix()}`,
      adminToken: nanoid(16),
    },
  });

  redirect(`/panel/${event.adminToken}`);
}
