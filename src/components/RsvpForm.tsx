"use client";

import { useActionState, useState } from "react";
import { submitRsvp, type RsvpState } from "@/app/i/[token]/actions";
import { useI18n } from "@/i18n/client";

type Props = {
  token: string;
  seats: number;
  status: "PENDIENTE" | "CONFIRMADO" | "DECLINADO";
  attending: number | null;
  // Clases de la plantilla para que el formulario combine con su estilo
  buttonClassName: string;
  // En la vista previa del panel se muestra el formulario, pero no se envía
  preview?: boolean;
};

export function RsvpForm({ token, seats, status, attending, buttonClassName, preview }: Props) {
  const { t } = useI18n();
  const copy = t.rsvp;
  const [state, action, pending] = useActionState<RsvpState, FormData>(submitRsvp.bind(null, token), { ok: false });
  const [going, setGoing] = useState(status !== "DECLINADO");
  const [editing, setEditing] = useState(status === "PENDIENTE");

  if (!editing || state.ok) {
    const confirmed = state.ok ? going : status === "CONFIRMADO";
    return (
      <div className="space-y-3 text-center">
        <p className="text-lg">{confirmed ? copy.thanksConfirmed(state.ok ? null : attending) : copy.thanksDeclined}</p>
        <button type="button" onClick={() => setEditing(true)} className="text-sm underline opacity-70">
          {copy.change}
        </button>
      </div>
    );
  }

  return (
    <form
      action={preview ? undefined : action}
      onSubmit={preview ? (e) => e.preventDefault() : undefined}
      className="mx-auto max-w-sm space-y-4 text-left"
    >
      <fieldset className="grid grid-cols-2 gap-2">
        {[
          { value: "si", label: copy.yes },
          { value: "no", label: copy.no },
        ].map((opt) => (
          <label
            key={opt.value}
            className={`cursor-pointer rounded-lg border px-3 py-2 text-center text-sm transition ${
              (opt.value === "si") === going ? "border-current font-medium" : "border-current/20 opacity-60"
            }`}
          >
            <input
              type="radio"
              name="going"
              value={opt.value}
              checked={(opt.value === "si") === going}
              onChange={() => setGoing(opt.value === "si")}
              className="sr-only"
            />
            {opt.label}
          </label>
        ))}
      </fieldset>

      {going && (
        <>
          <label className="block text-sm">
            {copy.howMany}
            <select
              name="attending"
              defaultValue={attending || seats}
              className="mt-1 w-full rounded-lg border border-current/30 bg-transparent px-3 py-2"
            >
              {Array.from({ length: seats }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {copy.people(n)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            {copy.dietary}
            <input
              name="dietary"
              placeholder={copy.optional}
              className="mt-1 w-full rounded-lg border border-current/30 bg-transparent px-3 py-2"
            />
          </label>
        </>
      )}

      <label className="block text-sm">
        {copy.message}
        <textarea
          name="message"
          rows={2}
          placeholder={copy.optional}
          className="mt-1 w-full rounded-lg border border-current/30 bg-transparent px-3 py-2"
        />
      </label>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || preview}
        className={`w-full rounded-lg px-4 py-3 font-medium disabled:opacity-60 ${buttonClassName}`}
      >
        {pending ? copy.sending : copy.send}
      </button>
      {preview && <p className="text-center text-xs opacity-70">{t.invite.previewNotice}</p>}
    </form>
  );
}
