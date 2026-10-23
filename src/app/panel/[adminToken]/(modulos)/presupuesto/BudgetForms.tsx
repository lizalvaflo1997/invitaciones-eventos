"use client";

import type { ExpenseCategory } from "@prisma/client";
import { useActionState, useEffect, useRef } from "react";
import { useI18n } from "@/i18n/client";
import { saveExpense, setBudget, type BudgetFormState } from "../../actions";

const CATEGORIES: ExpenseCategory[] = [
  "LUGAR",
  "BANQUETE",
  "BEBIDAS",
  "MUSICA",
  "FOTO_VIDEO",
  "DECORACION",
  "VESTIMENTA",
  "PASTEL",
  "INVITACIONES",
  "RECUERDOS",
  "TRANSPORTE",
  "OTROS",
];

const input =
  "w-full rounded-lg border border-[#c9a35f]/50 bg-white/70 px-3 py-2 text-sm text-[#4a2a2e] outline-none focus:border-[#6b1d29] focus:ring-2 focus:ring-[#6b1d29]/15";
const labelClass = "flex flex-col gap-1 text-xs text-[#6b4a4a]";

export function BudgetTotalForm({ adminToken, initial }: { adminToken: string; initial: string }) {
  const { budget } = useI18n().t;
  const [state, action, pending] = useActionState<BudgetFormState, FormData>(setBudget.bind(null, adminToken), { ok: false });

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <label className={`${labelClass} min-w-44 flex-1`}>
        {budget.totalLabel}
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#a8837a]">$</span>
          <input name="budget" inputMode="decimal" defaultValue={initial} placeholder={budget.totalPlaceholder} className={`${input} pl-7`} />
        </div>
      </label>
      <button disabled={pending} className="rounded-lg bg-[#6b1d29] px-4 py-2 text-sm font-medium text-[#f6efe2] disabled:opacity-60">
        {pending ? budget.saving : budget.saveTotal}
      </button>
      {state.error && <p className="w-full text-sm text-[#b4232f]">{state.error}</p>}
    </form>
  );
}

type ExpenseValues = { category: string; concept: string; vendor: string; amount: string; paid: string; dueDate: string };

// Agregar un gasto (sin `expenseId`) o editarlo (con `expenseId`, dentro de un <details> que se cierra al guardar)
export function ExpenseForm({ adminToken, expenseId, initial }: { adminToken: string; expenseId?: string; initial?: ExpenseValues }) {
  const { budget } = useI18n().t;
  const [state, action, pending] = useActionState<BudgetFormState, FormData>(saveExpense.bind(null, adminToken, expenseId ?? null), {
    ok: false,
  });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.ok) return;
    if (expenseId) formRef.current?.closest("details")?.removeAttribute("open");
    else formRef.current?.reset();
  }, [state, expenseId]);

  // Tras un error se conserva lo escrito; si no, lo guardado (al editar) o vacío (al agregar)
  const value = (key: keyof ExpenseValues) => (state.values?.[key] ?? initial?.[key] ?? "") as string;
  const money = (name: "amount" | "paid", label: string) => (
    <label className={labelClass}>
      {label}
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#a8837a]">$</span>
        <input name={name} inputMode="decimal" defaultValue={value(name)} placeholder="0" required={name === "amount"} className={`${input} pl-7`} />
      </div>
    </label>
  );

  return (
    <form ref={formRef} action={action} className="grid gap-3 sm:grid-cols-6">
      <label className={`${labelClass} sm:col-span-2`}>
        {budget.concept}
        <input name="concept" defaultValue={value("concept")} placeholder={budget.conceptPlaceholder} required className={input} />
      </label>
      <label className={`${labelClass} sm:col-span-2`}>
        {budget.category}
        <select name="category" defaultValue={value("category") || "LUGAR"} className={input}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {budget.categories[c]}
            </option>
          ))}
        </select>
      </label>
      <label className={`${labelClass} sm:col-span-2`}>
        <span>
          {budget.vendor} <span className="text-[#a8837a]">({budget.optional})</span>
        </span>
        <input name="vendor" defaultValue={value("vendor")} placeholder={budget.vendorPlaceholder} className={input} />
      </label>
      <div className="sm:col-span-2">{money("amount", budget.amount)}</div>
      <div className="sm:col-span-2">{money("paid", budget.paid)}</div>
      <label className={`${labelClass} sm:col-span-2`}>
        <span>
          {budget.dueDate} <span className="text-[#a8837a]">({budget.optional})</span>
        </span>
        <input name="dueDate" type="date" defaultValue={value("dueDate")} className={input} />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-6">
        <button disabled={pending} className="rounded-lg bg-[#6b1d29] px-5 py-2 text-sm font-medium text-[#f6efe2] disabled:opacity-60">
          {pending ? (expenseId ? budget.saving : budget.adding) : expenseId ? budget.save : budget.add}
        </button>
        {state.error && <p className="text-sm text-[#b4232f]">{state.error}</p>}
      </div>
    </form>
  );
}
