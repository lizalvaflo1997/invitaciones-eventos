"use client";

import { useActionState, useEffect, useRef } from "react";
import { useI18n } from "@/i18n/client";
import { addGuest, type AddGuestState } from "../../actions";

export function AddGuestForm({ adminToken }: { adminToken: string }) {
  const { panel } = useI18n().t;
  const [state, action, pending] = useActionState<AddGuestState, FormData>(addGuest.bind(null, adminToken), { ok: false });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  const input = "rounded-lg border border-neutral-300 px-3 py-2 text-sm";
  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-end gap-2">
      <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs text-neutral-600">
        {panel.nameLabel}
        <input name="name" placeholder={panel.namePlaceholder} required className={input} />
      </label>
      <label className="flex w-40 flex-col gap-1 text-xs text-neutral-600">
        {panel.whatsapp}
        <input name="phone" inputMode="tel" placeholder="55 1234 5678" className={input} />
      </label>
      <label className="flex w-24 flex-col gap-1 text-xs text-neutral-600">
        {panel.seats}
        <input name="seats" type="number" min={1} max={20} defaultValue={2} className={input} />
      </label>
      <button disabled={pending} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
        {pending ? panel.adding : panel.add}
      </button>
      {state.error && <p className="w-full text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
