import { notFound } from "next/navigation";
import { cache } from "react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

// El evento del panel, solo si es de quien tiene la sesión. Se comparte entre el menú y cada módulo
// de la misma petición, así se consulta una sola vez.
export const getOwnedEvent = cache(async (adminToken: string) => {
  const user = await requireUser(`/panel/${adminToken}`);
  const event = await db.event.findFirst({ where: { adminToken, userId: user.id }, include: { template: true } });
  // Si es de otra cuenta se responde igual que si no existiera
  if (!event) notFound();
  return { user, event };
});
