"use server";

import { revalidatePath } from "next/cache";
import { getDictionary } from "@/i18n/server";
import { db } from "@/lib/db";

export type RsvpState = { ok: boolean; error?: string };

export async function submitRsvp(token: string, _prev: RsvpState, formData: FormData): Promise<RsvpState> {
  const { rsvp } = await getDictionary();
  const guest = await db.guest.findUnique({ where: { token }, include: { event: true } });
  if (!guest) return { ok: false, error: rsvp.errors.notFound };

  const deadline = guest.event.rsvpDeadline;
  if (deadline && deadline < new Date()) {
    return { ok: false, error: rsvp.errors.deadlinePassed };
  }

  const going = formData.get("going") === "si";
  const attending = going ? Number(formData.get("attending")) : 0;
  if (going && (!Number.isInteger(attending) || attending < 1 || attending > guest.seats)) {
    return { ok: false, error: rsvp.errors.invalidCount(guest.seats) };
  }

  await db.guest.update({
    where: { token },
    data: {
      status: going ? "CONFIRMADO" : "DECLINADO",
      attending,
      dietary: String(formData.get("dietary") ?? "").trim() || null,
      message: String(formData.get("message") ?? "").trim() || null,
      respondedAt: new Date(),
    },
  });

  revalidatePath(`/i/${token}`);
  // Actualiza el inicio, los invitados y las mesas del panel del evento
  revalidatePath(`/panel/${guest.event.adminToken}`, "layout");
  return { ok: true };
}
