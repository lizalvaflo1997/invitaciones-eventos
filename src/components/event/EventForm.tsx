"use client";

import { useActionState, useState } from "react";
import { useI18n } from "@/i18n/client";
import type { EventType } from "@prisma/client";
import type { EventField, EventFormState, EventFormValues } from "@/lib/event-form";

const EVENT_TYPES: EventType[] = ["BODA", "XV_ANOS", "BAUTIZO", "PRIMERA_COMUNION", "CUMPLEANOS", "OTRO"];

export type TemplateOption = { id: string; slug: string; name: string; description: string };
type Props = {
  // Crear o editar: la acción del servidor que valida y guarda
  action: (state: EventFormState, formData: FormData) => Promise<EventFormState>;
  initialValues?: EventFormValues;
  templates: TemplateOption[];
  minDate: string;
  submitLabel: string;
  submittingLabel: string;
};

const inputClass =
  "mt-1.5 w-full rounded-lg border bg-white/70 px-4 py-3 text-[#4a2a2e] outline-none transition placeholder:text-[#a8837a]/70 focus:border-[#6b1d29] focus:ring-2 focus:ring-[#6b1d29]/15";

// Miniatura de cada plantilla con los nombres que se van escribiendo
function TemplatePreview({ slug, names }: { slug: string; names: string }) {
  if (slug === "minimalista") {
    return (
      <div className="flex h-28 flex-col justify-center bg-white px-4 text-left text-neutral-900">
        <p className="text-xl font-light leading-tight tracking-tight">{names}</p>
        <div className="mt-2 h-px w-10 bg-neutral-300" />
      </div>
    );
  }
  return (
    <div className="flex h-28 flex-col items-center justify-center bg-[#faf6ef] px-4 text-center">
      <p className="text-[0.55rem] uppercase tracking-[0.3em] text-[#3f3a33]/60">✦</p>
      <p className="font-script text-3xl leading-tight text-[#9a7b4f]">{names}</p>
    </div>
  );
}

// Fuera del formulario para que React no los vuelva a montar en cada tecla (los campos perderían el foco)
function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-[#c9a35f]/40 bg-[#fffaf2] p-6 sm:p-8">
      <legend className="sr-only">{title}</legend>
      <h2 className="font-serif text-2xl text-[#6b1d29]" aria-hidden>
        {title}
      </h2>
      {hint && <p className="mt-1 text-sm text-[#a8837a]">{hint}</p>}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Label({ htmlFor, children, optional }: { htmlFor: string; children: React.ReactNode; optional?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium">
      {children}
      {optional && <span className="ml-1 font-normal text-[#a8837a]">({optional})</span>}
    </label>
  );
}

function FieldError({ name, message }: { name: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={`${name}-error`} className="mt-1.5 text-sm text-[#b4232f]">
      {message}
    </p>
  );
}

export function EventForm({ action: submit, initialValues, templates, minDate, submitLabel, submittingLabel }: Props) {
  const { t } = useI18n();
  const copy = t.newEvent;
  const [state, action, pending] = useActionState<EventFormState, FormData>(submit, { values: initialValues });
  const [type, setType] = useState<EventType>((initialValues?.type as EventType) ?? "BODA");
  const [names, setNames] = useState({ one: initialValues?.honoreeOne ?? "", two: initialValues?.honoreeTwo ?? "" });
  const [templateId, setTemplateId] = useState(initialValues?.templateId ?? templates[0]?.id ?? "");

  const value = (field: EventField) => state.values?.[field];
  const error = (field: EventField) => state.fieldErrors?.[field];
  const field = (name: EventField) => ({
    name,
    id: name,
    defaultValue: value(name),
    "aria-invalid": Boolean(error(name)) || undefined,
    "aria-describedby": error(name) ? `${name}-error` : undefined,
    className: `${inputClass} ${error(name) ? "border-[#b4232f]" : "border-[#c9a35f]/50"}`,
  });

  const isWedding = type === "BODA";
  const previewNames = isWedding
    ? names.one || names.two
      ? `${names.one || "…"} & ${names.two || "…"}`
      : copy.sampleNames
    : names.one || copy.honoreePlaceholder;

  return (
    <form action={action} className="space-y-6" noValidate>
      {state.error && (
        <p role="alert" className="rounded-lg bg-[#6b1d29]/8 px-4 py-3 text-sm text-[#7a1f2c]">
          {state.error}
        </p>
      )}

      <fieldset className="rounded-2xl border border-[#c9a35f]/40 bg-[#fffaf2] p-6 sm:p-8">
        <legend className="sr-only">{copy.sections.type}</legend>
        <h2 className="font-serif text-2xl text-[#6b1d29]" aria-hidden>
          {copy.sections.type}
        </h2>
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {EVENT_TYPES.map((option) => (
            <label
              key={option}
              className={`cursor-pointer rounded-xl border-2 px-4 py-3 text-center text-sm font-medium transition ${
                option === type ? "border-[#6b1d29] bg-[#6b1d29] text-[#f6efe2]" : "border-[#c9a35f]/40 hover:border-[#c9a35f]"
              }`}
            >
              <input type="radio" name="type" value={option} checked={option === type} onChange={() => setType(option)} className="sr-only" />
              {t.eventTypes[option].label}
            </label>
          ))}
        </div>
        <FieldError name="type" message={error("type")} />
      </fieldset>

      <Section title={copy.sections.who}>
        {type === "OTRO" && (
          <div className="sm:col-span-2">
            <Label htmlFor="title">{copy.eventTitle}</Label>
            <input {...field("title")} placeholder={copy.eventTitlePlaceholder} autoComplete="off" />
            <FieldError name="title" message={error("title")} />
          </div>
        )}
        <div className={isWedding ? "" : "sm:col-span-2"}>
          <Label htmlFor="honoreeOne">{isWedding ? copy.coupleOne : type === "OTRO" ? copy.host : copy.honoree}</Label>
          <input
            {...field("honoreeOne")}
            placeholder={isWedding ? "Ana" : type === "OTRO" ? copy.hostPlaceholder : copy.honoreePlaceholder}
            autoComplete="off"
            onChange={(e) => setNames((n) => ({ ...n, one: e.target.value }))}
          />
          <FieldError name="honoreeOne" message={error("honoreeOne")} />
        </div>
        {isWedding && (
          <div>
            <Label htmlFor="honoreeTwo">{copy.coupleTwo}</Label>
            <input {...field("honoreeTwo")} placeholder="Luis" autoComplete="off" onChange={(e) => setNames((n) => ({ ...n, two: e.target.value }))} />
            <FieldError name="honoreeTwo" message={error("honoreeTwo")} />
          </div>
        )}
      </Section>

      <Section title={copy.sections.ceremony}>
        <div>
          <Label htmlFor="date">{copy.date}</Label>
          <input {...field("date")} type="date" min={minDate} />
          <FieldError name="date" message={error("date")} />
        </div>
        <div>
          <Label htmlFor="ceremonyTime">{copy.time}</Label>
          <input {...field("ceremonyTime")} type="time" />
          <FieldError name="ceremonyTime" message={error("ceremonyTime")} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="ceremonyVenue">{copy.venue}</Label>
          <input {...field("ceremonyVenue")} placeholder={copy.ceremonyVenuePlaceholder} />
          <FieldError name="ceremonyVenue" message={error("ceremonyVenue")} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="ceremonyAddress">{copy.address}</Label>
          <input {...field("ceremonyAddress")} placeholder={copy.addressPlaceholder} autoComplete="street-address" />
          <FieldError name="ceremonyAddress" message={error("ceremonyAddress")} />
        </div>
      </Section>

      <Section title={copy.sections.reception} hint={copy.sections.receptionHint}>
        <div className="sm:col-span-2">
          <Label htmlFor="receptionVenue">{copy.venue}</Label>
          <input {...field("receptionVenue")} placeholder={copy.receptionVenuePlaceholder} />
          <FieldError name="receptionVenue" message={error("receptionVenue")} />
        </div>
        <div>
          <Label htmlFor="receptionAddress">{copy.address}</Label>
          <input {...field("receptionAddress")} placeholder={copy.addressPlaceholder} />
        </div>
        <div>
          <Label htmlFor="receptionTime">{copy.time}</Label>
          <input {...field("receptionTime")} type="time" />
        </div>
      </Section>

      <Section title={copy.sections.details}>
        <div>
          <Label htmlFor="dressCode" optional={copy.optional}>
            {copy.dressCode}
          </Label>
          <input {...field("dressCode")} placeholder={copy.dressCodePlaceholder} />
        </div>
        <div>
          <Label htmlFor="rsvpDeadline" optional={copy.optional}>
            {copy.rsvpDeadline}
          </Label>
          <input {...field("rsvpDeadline")} type="date" min={minDate} />
          <FieldError name="rsvpDeadline" message={error("rsvpDeadline")} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="giftRegistry" optional={copy.optional}>
            {copy.giftRegistry}
          </Label>
          <input {...field("giftRegistry")} placeholder={copy.giftRegistryPlaceholder} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="message" optional={copy.optional}>
            {copy.message}
          </Label>
          <textarea {...field("message")} rows={3} placeholder={copy.messagePlaceholder} />
        </div>
      </Section>

      <fieldset className="rounded-2xl border border-[#c9a35f]/40 bg-[#fffaf2] p-6 sm:p-8">
        <legend className="sr-only">{copy.sections.template}</legend>
        <h2 className="font-serif text-2xl text-[#6b1d29]" aria-hidden>
          {copy.sections.template}
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {templates.map((template) => {
            const selected = template.id === templateId;
            return (
              <label
                key={template.id}
                className={`cursor-pointer overflow-hidden rounded-xl border-2 transition ${
                  selected ? "border-[#6b1d29] shadow-[0_12px_30px_-18px_rgba(107,29,41,0.7)]" : "border-[#c9a35f]/30 hover:border-[#c9a35f]"
                }`}
              >
                <input
                  type="radio"
                  name="templateId"
                  value={template.id}
                  checked={selected}
                  onChange={() => setTemplateId(template.id)}
                  className="sr-only"
                />
                <TemplatePreview slug={template.slug} names={previewNames} />
                <div className="flex items-start justify-between gap-3 border-t border-[#c9a35f]/30 bg-white/60 px-4 py-3">
                  <div>
                    <p className="font-medium">{template.name}</p>
                    <p className="text-sm text-[#6b4a4a]">{template.description}</p>
                  </div>
                  <span
                    className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border ${
                      selected ? "border-[#6b1d29] bg-[#6b1d29] text-white" : "border-[#c9a35f]"
                    }`}
                    aria-hidden
                  >
                    {selected && "✓"}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
        <FieldError name="templateId" message={error("templateId")} />
      </fieldset>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-[#6b1d29] px-8 py-3.5 font-medium text-[#f6efe2] shadow-[0_10px_24px_-12px_rgba(107,29,41,0.8)] transition hover:bg-[#7d2533] disabled:opacity-60 sm:w-auto"
        >
          {pending ? submittingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
