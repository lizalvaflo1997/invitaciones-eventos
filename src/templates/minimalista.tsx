import { Countdown } from "@/components/Countdown";
import { RsvpForm } from "@/components/RsvpForm";
import { eventCopy } from "@/lib/event-copy";
import { formatLongDate, formatShortDate, mapsUrl } from "@/lib/format";
import type { TemplateProps } from "./types";

function Block({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <section id={id} className="border-t border-neutral-200 py-10">
      <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">{label}</h2>
      {children}
    </section>
  );
}

function Venue({ name, address, time, linkLabel }: { name: string; address: string; time: string; linkLabel: string }) {
  return (
    <div>
      <p className="text-xl font-medium">{name}</p>
      <p className="text-neutral-600">{time}</p>
      <p className="text-neutral-600">{address}</p>
      <a href={mapsUrl(address)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm underline underline-offset-4">
        {linkLabel}
      </a>
    </div>
  );
}

export function Minimalista({ event, guest, t, preview }: TemplateProps) {
  const { invite } = t;
  const copy = eventCopy(event, t);
  return (
    <main className="min-h-screen bg-white px-6 py-20 text-neutral-900">
      <div className="mx-auto max-w-lg">
        <p className="mb-5 text-xs font-medium uppercase tracking-[0.25em] text-neutral-500">{copy.eyebrow}</p>
        <h1 className="text-5xl font-light tracking-tight sm:text-6xl">
          {event.honoreeOne}
          {event.honoreeTwo && (
            <>
              <br />+ {event.honoreeTwo}
            </>
          )}
        </h1>
        <p className="mt-6 text-lg first-letter:uppercase text-neutral-600">{formatLongDate(event.date, t.intl)}</p>
        <p id="para" className="mt-10 text-lg">
          {invite.joinUs(guest.name)} <span className="text-neutral-500">({invite.seats(guest.seats)})</span>
        </p>
        {event.message && <p className="mt-4 text-neutral-600">{event.message}</p>}

        <div id="cuenta-regresiva" className="my-14">
          <Countdown date={event.date.toISOString()} className="justify-start font-light" />
        </div>

        <Block id="ubicacion" label={copy.ceremony}>
          <Venue
            name={event.ceremonyVenue}
            address={event.ceremonyAddress}
            time={event.ceremonyTime}
            linkLabel={invite.openInMaps}
          />
        </Block>
        {event.receptionVenue && event.receptionAddress && (
          <Block id="recepcion" label={copy.reception}>
            <Venue
              name={event.receptionVenue}
              address={event.receptionAddress}
              time={event.receptionTime ?? ""}
              linkLabel={invite.openInMaps}
            />
          </Block>
        )}
        {event.dressCode && (
          <Block id="vestimenta" label={invite.dressCodeShort}>
            <p className="text-xl">{event.dressCode}</p>
          </Block>
        )}
        {event.giftRegistry && (
          <Block id="regalos" label={invite.giftRegistry}>
            <p className="text-xl">{event.giftRegistry}</p>
          </Block>
        )}

        <Block id="confirmar" label={invite.rsvpTitle}>
          {event.rsvpDeadline && (
            <p className="mb-6 text-neutral-600">{invite.rsvpBeforeShort(formatShortDate(event.rsvpDeadline, t.intl))}</p>
          )}
          <RsvpForm
            token={guest.token}
            seats={guest.seats}
            status={guest.status}
            attending={guest.attending}
            buttonClassName="bg-neutral-900 text-white"
            preview={preview}
          />
        </Block>
      </div>
    </main>
  );
}
