"use server";

import { ExpenseCategory } from "@prisma/client";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDictionary } from "@/i18n/server";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readEventForm, type EventFormState } from "@/lib/event-form";
import { parseMoney } from "@/lib/money";
import { parsePlan } from "@/lib/floor-plan/sanitize";
import { normalizeSeats } from "@/lib/floor-plan/seating";

// El evento solo si es de quien tiene la sesión; si no, las acciones no hacen nada
async function ownedEvent(adminToken: string) {
  const user = await getCurrentUser();
  return user ? db.event.findFirst({ where: { adminToken, userId: user.id } }) : null;
}

// Todos los módulos comparten el resumen del evento, así que se refresca el panel completo
const refresh = (adminToken: string) => revalidatePath(`/panel/${adminToken}`, "layout");

// ——— Invitados ———

export type AddGuestState = { ok: boolean; error?: string };

export async function addGuest(adminToken: string, _prev: AddGuestState, formData: FormData): Promise<AddGuestState> {
  const { panel } = await getDictionary();
  const event = await ownedEvent(adminToken);
  if (!event) return { ok: false, error: panel.errors.notFound };

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").replace(/\D/g, "") || null;
  const seats = Number(formData.get("seats"));
  if (!name) return { ok: false, error: panel.errors.nameRequired };
  if (!Number.isInteger(seats) || seats < 1 || seats > 20) return { ok: false, error: panel.errors.invalidSeats };

  await db.guest.create({ data: { eventId: event.id, name, phone, seats, token: nanoid(10) } });
  refresh(adminToken);
  return { ok: true };
}

export async function deleteGuest(adminToken: string, guestId: string) {
  const event = await ownedEvent(adminToken);
  if (!event) return;
  await db.guest.deleteMany({ where: { id: guestId, eventId: event.id } });
  refresh(adminToken);
}

// ——— Datos de la invitación ———

export async function updateEvent(adminToken: string, _prev: EventFormState, formData: FormData): Promise<EventFormState> {
  await requireUser(`/panel/${adminToken}/invitacion`);
  const { newEvent, panel, intl } = await getDictionary();
  const event = await ownedEvent(adminToken);
  if (!event) return { error: panel.errors.notFound };

  const result = await readEventForm(formData, {
    intl,
    errors: newEvent.errors,
    currentDate: event.date,
    // Se permite conservar la plantilla actual aunque sea un diseño personalizado
    findTemplate: (id) => db.template.findFirst({ where: { id, OR: [{ isCustom: false }, { id: event.templateId }] } }),
  });
  if (!result.ok) return result.state;

  await db.event.update({ where: { id: event.id }, data: result.data });
  refresh(adminToken);
  redirect(`/panel/${adminToken}/invitacion?guardado=1`);
}

// ——— Presupuesto ———

export type BudgetFormState = { ok: boolean; error?: string; values?: Record<string, string> };

export async function setBudget(adminToken: string, _prev: BudgetFormState, formData: FormData): Promise<BudgetFormState> {
  const { budget, panel } = await getDictionary();
  const event = await ownedEvent(adminToken);
  if (!event) return { ok: false, error: panel.errors.notFound };

  const text = String(formData.get("budget") ?? "").trim();
  // Dejarlo vacío quita el presupuesto
  const cents = text ? parseMoney(text) : null;
  if (text && cents === null) return { ok: false, error: budget.errors.invalidAmount };

  await db.event.update({ where: { id: event.id }, data: { budgetCents: cents } });
  refresh(adminToken);
  return { ok: true };
}

// Crea un gasto, o lo actualiza si llega su id
export async function saveExpense(
  adminToken: string,
  expenseId: string | null,
  _prev: BudgetFormState,
  formData: FormData,
): Promise<BudgetFormState> {
  const { budget, panel } = await getDictionary();
  const event = await ownedEvent(adminToken);
  if (!event) return { ok: false, error: panel.errors.notFound };

  const values = Object.fromEntries(
    ["category", "concept", "vendor", "amount", "paid", "dueDate"].map((k) => [k, String(formData.get(k) ?? "").trim()]),
  );
  const category = Object.values(ExpenseCategory).includes(values.category as ExpenseCategory)
    ? (values.category as ExpenseCategory)
    : ExpenseCategory.OTROS;
  const amountCents = parseMoney(values.amount);
  const paidCents = values.paid ? parseMoney(values.paid) : 0;

  if (!values.concept) return { ok: false, error: budget.errors.conceptRequired, values };
  if (amountCents === null || paidCents === null) return { ok: false, error: budget.errors.invalidAmount, values };
  if (paidCents > amountCents) return { ok: false, error: budget.errors.paidOverAmount, values };

  const data = {
    category,
    concept: values.concept,
    vendor: values.vendor || null,
    amountCents,
    paidCents,
    // Las fechas se toman en hora de la Ciudad de México, igual que el resto del evento
    dueDate: values.dueDate ? new Date(`${values.dueDate}T00:00:00-06:00`) : null,
  };

  if (expenseId) {
    await db.expense.updateMany({ where: { id: expenseId, eventId: event.id }, data });
  } else {
    await db.expense.create({ data: { ...data, eventId: event.id } });
  }
  refresh(adminToken);
  return { ok: true };
}

export async function markExpensePaid(adminToken: string, expenseId: string) {
  const event = await ownedEvent(adminToken);
  if (!event) return;
  const expense = await db.expense.findFirst({ where: { id: expenseId, eventId: event.id } });
  if (!expense) return;
  await db.expense.update({ where: { id: expense.id }, data: { paidCents: expense.amountCents } });
  refresh(adminToken);
}

export async function deleteExpense(adminToken: string, expenseId: string) {
  const event = await ownedEvent(adminToken);
  if (!event) return;
  await db.expense.deleteMany({ where: { id: expenseId, eventId: event.id } });
  refresh(adminToken);
}

// ——— Plano del salón ———

const seatsNeeded = (g: { status: string; seats: number; attending: number | null }) =>
  g.status === "DECLINADO" ? 0 : g.status === "CONFIRMADO" ? (g.attending ?? 0) : g.seats;

// Guarda el plano y sincroniza mesas e invitados, para que Invitados e Inicio muestren la mesa de cada quien
export async function savePlan(adminToken: string, json: string) {
  const event = await ownedEvent(adminToken);
  const parsed = event && parsePlan(json);
  if (!event || !parsed) return { ok: false };
  const guests = await db.guest.findMany({ where: { eventId: event.id } });
  const plan = normalizeSeats(
    parsed,
    guests.map((g) => ({ id: g.id, name: g.name, needed: seatsNeeded(g), status: g.status })),
  );
  const ids = plan.tables.map((t) => t.id);
  const foreign = await db.eventTable.findMany({ where: { id: { in: ids }, NOT: { eventId: event.id } }, select: { id: true } });
  const skip = new Set(foreign.map((t) => t.id));

  await db.$transaction([
    db.guest.updateMany({ where: { eventId: event.id }, data: { tableId: null } }),
    db.eventTable.deleteMany({ where: { eventId: event.id, id: { notIn: ids } } }),
    ...plan.tables
      .filter((t) => !skip.has(t.id))
      .map((t) =>
        db.eventTable.upsert({
          where: { id: t.id },
          create: { id: t.id, eventId: event.id, name: t.name, capacity: t.capacity },
          update: { name: t.name, capacity: t.capacity },
        }),
      ),
    ...plan.tables
      .filter((t) => !skip.has(t.id))
      .flatMap((t) => [...new Set(t.seats.flatMap((s) => (s && "guestId" in s ? [s.guestId] : [])))].map((guestId) =>
        db.guest.updateMany({ where: { id: guestId, eventId: event.id }, data: { tableId: t.id } }),
      )),
    db.event.update({ where: { id: event.id }, data: { floorPlan: JSON.stringify(plan) } }),
  ]);
  refresh(adminToken);
  return { ok: true };
}

export async function addPlanGuests(adminToken: string, entries: { name: string; seats: number }[]) {
  const event = await ownedEvent(adminToken);
  const clean = (Array.isArray(entries) ? entries : [])
    .slice(0, 200)
    .map((e) => ({ name: String(e?.name ?? "").trim().slice(0, 80), seats: Math.min(20, Math.max(1, Math.round(Number(e?.seats) || 1))) }))
    .filter((e) => e.name);
  if (!event || !clean.length) return { ok: false };
  const created = await db.$transaction(clean.map((e) => db.guest.create({ data: { eventId: event.id, name: e.name, seats: e.seats, token: nanoid(10) } })));
  refresh(adminToken);
  return { ok: true, guests: created.map((g) => ({ id: g.id, name: g.name, needed: g.seats, status: g.status })) };
}
