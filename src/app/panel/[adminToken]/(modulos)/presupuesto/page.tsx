import type { Expense } from "@prisma/client";
import { getDictionary } from "@/i18n/server";
import { db } from "@/lib/db";
import { getOwnedEvent } from "@/lib/events";
import { formatShortDate } from "@/lib/format";
import { centsToInput, formatMoney } from "@/lib/money";
import { deleteExpense, markExpensePaid } from "../../actions";
import { BudgetTotalForm, ExpenseForm } from "./BudgetForms";

const mexicoDay = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(date);

type Status = "paid" | "partial" | "unpaid" | "overdue";

function expenseStatus(expense: Expense, today: string): Status {
  if (expense.paidCents >= expense.amountCents) return "paid";
  if (expense.dueDate && mexicoDay(expense.dueDate) < today) return "overdue";
  return expense.paidCents > 0 ? "partial" : "unpaid";
}

const statusClassName: Record<Status, string> = {
  paid: "bg-emerald-100 text-emerald-800",
  partial: "bg-sky-100 text-sky-800",
  unpaid: "bg-amber-100 text-amber-800",
  overdue: "bg-red-100 text-red-800",
};

export default async function BudgetModule({ params }: { params: Promise<{ adminToken: string }> }) {
  const { adminToken } = await params;
  const { event } = await getOwnedEvent(adminToken);
  const t = await getDictionary();
  const copy = t.budget;
  const { intl } = t;
  const money = (cents: number) => formatMoney(cents, intl);

  // Primero lo que vence antes; los gastos sin fecha al final
  const expenses = await db.expense.findMany({
    where: { eventId: event.id },
    orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
  });

  const committed = expenses.reduce((sum, e) => sum + e.amountCents, 0);
  const paid = expenses.reduce((sum, e) => sum + e.paidCents, 0);
  const total = event.budgetCents;
  const available = total != null ? total - committed : null;
  const usedPercent = total ? Math.round((committed / total) * 100) : null;
  const today = mexicoDay(new Date());

  const byCategory = Object.entries(
    expenses.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.category]: (acc[e.category] ?? 0) + e.amountCents }), {}),
  ).sort((a, b) => b[1] - a[1]);
  const biggest = byCategory[0]?.[1] ?? 0;

  const summary = [
    { label: copy.summary.budget, value: total != null ? money(total) : "—" },
    { label: copy.summary.committed, value: money(committed) },
    { label: copy.summary.paid, value: money(paid) },
    { label: copy.summary.pending, value: money(committed - paid) },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-3xl text-[#6b1d29]">{copy.title}</h2>
        <p className="mt-1 text-[#6b4a4a]">{copy.subtitle}</p>
      </header>

      <section className="grid gap-6 rounded-2xl border border-[#c9a35f]/40 bg-[#fffaf2] p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {summary.map((s) => (
              <div key={s.label}>
                <p className="text-sm text-[#6b4a4a]">{s.label}</p>
                <p className="text-2xl font-semibold tabular-nums text-[#6b1d29]">{s.value}</p>
              </div>
            ))}
          </div>

          {total != null ? (
            <div className="mt-5">
              <div className="h-2.5 overflow-hidden rounded-full bg-[#c9a35f]/25">
                <div
                  className={`h-full rounded-full ${available! < 0 ? "bg-[#b4232f]" : "bg-[#6b1d29]"}`}
                  style={{ width: `${Math.min(100, usedPercent ?? 0)}%` }}
                />
              </div>
              <p className="mt-2 flex flex-wrap justify-between gap-2 text-sm">
                <span className="text-[#6b4a4a]">{copy.usedOfBudget(usedPercent ?? 0)}</span>
                <span className={`font-medium ${available! < 0 ? "text-[#b4232f]" : "text-emerald-700"}`}>
                  {available! < 0 ? `${copy.summary.over} ${money(-available!)}` : `${copy.summary.available}: ${money(available!)}`}
                </span>
              </p>
            </div>
          ) : (
            <p className="mt-5 rounded-lg bg-[#c9a35f]/12 px-4 py-3 text-sm text-[#6b4a4a]">{copy.noTotal}</p>
          )}
        </div>

        <div className="lg:border-l lg:border-[#c9a35f]/30 lg:pl-6">
          <BudgetTotalForm adminToken={adminToken} initial={centsToInput(total)} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-[#c9a35f]/40 bg-[#fffaf2] p-5">
            <h3 className="mb-4 font-serif text-xl text-[#6b1d29]">{copy.addExpense}</h3>
            <ExpenseForm adminToken={adminToken} />
          </section>

          <section>
            <h3 className="mb-3 font-serif text-xl text-[#6b1d29]">{copy.expensesTitle}</h3>
            {expenses.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#c9a35f]/60 px-6 py-10 text-center text-[#a8837a]">{copy.empty}</p>
            ) : (
              <ul className="space-y-2.5">
                {expenses.map((expense) => {
                  const status = expenseStatus(expense, today);
                  const pendingCents = expense.amountCents - expense.paidCents;
                  return (
                    <li key={expense.id} className="rounded-xl border border-[#c9a35f]/40 bg-[#fffaf2] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-[#4a2a2e]">{expense.concept}</p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6b4a4a]">
                            <span className="rounded-full bg-[#6b1d29]/8 px-2 py-0.5 text-[#6b1d29]">{copy.categories[expense.category]}</span>
                            {expense.vendor && <span>{expense.vendor}</span>}
                            {expense.dueDate && status !== "paid" && (
                              <span className={status === "overdue" ? "font-medium text-red-700" : ""}>
                                {copy.due(formatShortDate(expense.dueDate, intl))}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold tabular-nums text-[#4a2a2e]">{money(expense.amountCents)}</p>
                          <p className="text-xs tabular-nums text-[#6b4a4a]">
                            {status === "paid" ? money(expense.paidCents) : copy.pendingAmount(money(pendingCents))}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClassName[status]}`}>{copy.status[status]}</span>
                        {status !== "paid" && expense.paidCents > 0 && (
                          <span className="text-xs text-[#a8837a]">{copy.paidOf(money(expense.paidCents), money(expense.amountCents))}</span>
                        )}
                        <div className="ml-auto flex items-center gap-1">
                          {status !== "paid" && (
                            <form action={markExpensePaid.bind(null, adminToken, expense.id)}>
                              <button className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50">{copy.markPaid}</button>
                            </form>
                          )}
                          <form action={deleteExpense.bind(null, adminToken, expense.id)}>
                            <button className="rounded-lg px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50">{copy.remove}</button>
                          </form>
                        </div>
                      </div>

                      <details className="group mt-2">
                        <summary className="cursor-pointer list-none text-xs font-medium text-[#6b1d29] hover:underline">{copy.edit}</summary>
                        <div className="mt-3 border-t border-[#c9a35f]/30 pt-3">
                          <ExpenseForm
                            adminToken={adminToken}
                            expenseId={expense.id}
                            initial={{
                              category: expense.category,
                              concept: expense.concept,
                              vendor: expense.vendor ?? "",
                              amount: centsToInput(expense.amountCents),
                              paid: centsToInput(expense.paidCents),
                              dueDate: expense.dueDate ? mexicoDay(expense.dueDate) : "",
                            }}
                          />
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-[#c9a35f]/40 bg-[#fffaf2] p-5">
          <h3 className="font-serif text-xl text-[#6b1d29]">{copy.byCategory}</h3>
          {byCategory.length === 0 ? (
            <p className="mt-3 text-sm text-[#a8837a]">—</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {byCategory.map(([category, cents]) => (
                <li key={category}>
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="text-[#4a2a2e]">{copy.categories[category as Expense["category"]]}</span>
                    <span className="tabular-nums text-[#6b4a4a]">{money(cents)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#c9a35f]/25">
                    <div className="h-full rounded-full bg-[#b08d57]" style={{ width: `${(cents / biggest) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
