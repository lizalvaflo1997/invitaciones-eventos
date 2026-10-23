import { Countdown } from "@/components/Countdown";
import { RsvpForm } from "@/components/RsvpForm";
import { eventCopy } from "@/lib/event-copy";
import { formatLongDate, formatShortDate, mapsUrl } from "@/lib/format";
import type { TemplateProps } from "./types";

const gold = "text-[#9a7b4f]";

function Divider() {
  return (
    <div className={`my-10 flex items-center justify-center gap-3 ${gold}`} aria-hidden>
      <span className="h-px w-16 bg-current opacity-50" />
      <span className="text-sm">✦</span>
      <span className="h-px w-16 bg-current opacity-50" />
    </div>
  );
}

type VenueProps = { title: string; name: string; address: string; time: string; linkLabel: string };

function Venue({ title, name, address, time, linkLabel }: VenueProps) {
  return (
    <div className="space-y-1">
      <h3 className={`font-script text-4xl ${gold}`}>{title}</h3>
      <p className="font-serif text-2xl">{name}</p>
      <p className="text-sm opacity-80">{time}</p>
      <p className="text-sm opacity-80">{address}</p>
      <a
        href={mapsUrl(address)}
        target="_blank"
        rel="noreferrer"
        className={`mt-3 inline-block rounded-full border border-current px-5 py-1.5 text-xs uppercase tracking-widest ${gold}`}
      >
        {linkLabel}
      </a>
    </div>
  );
}

export function Clasico({ event, guest, t, preview }: TemplateProps) {
  const { invite } = t;
  const copy = eventCopy(event, t);
  return (
    <main className="min-h-screen bg-[#faf6ef] px-6 py-16 text-center text-[#3f3a33]">
      <div className="mx-auto max-w-xl">
        <p className="text-xs uppercase tracking-[0.3em] opacity-70">{copy.eyebrow}</p>
        <h1 className={`mt-6 font-script text-6xl leading-tight sm:text-7xl ${gold}`}>
          {event.honoreeOne}
          {event.honoreeTwo && (
            <>
              <span className="block font-serif text-3xl">&amp;</span>
              {event.honoreeTwo}
            </>
          )}
        </h1>
        <p className="mt-6 font-serif text-xl first-letter:uppercase">{formatLongDate(event.date, t.intl)}</p>

        <Divider />

        {event.message && <p className="font-serif text-xl leading-relaxed italic">{event.message}</p>}

        <div id="para" className="mt-10 rounded-2xl border border-[#9a7b4f]/30 bg-white/60 px-6 py-8">
          <p className="text-xs uppercase tracking-[0.3em] opacity-70">{invite.invitationFor}</p>
          <p className="mt-2 font-serif text-3xl">{guest.name}</p>
          <p className="mt-2 text-sm opacity-80">{invite.seatsReserved(guest.seats)}</p>
        </div>

        <Divider />

        <div id="cuenta-regresiva">
          <Countdown date={event.date.toISOString()} className="font-serif" />
        </div>

        <Divider />

        <div id="ubicacion" className="space-y-12">
          <Venue
            title={copy.ceremony}
            name={event.ceremonyVenue}
            address={event.ceremonyAddress}
            time={event.ceremonyTime}
            linkLabel={invite.viewLocation}
          />
          {event.receptionVenue && event.receptionAddress && (
            <Venue
              title={copy.reception}
              name={event.receptionVenue}
              address={event.receptionAddress}
              time={event.receptionTime ?? ""}
              linkLabel={invite.viewLocation}
            />
          )}
        </div>

        {(event.dressCode || event.giftRegistry) && <Divider />}
        {event.dressCode && (
          <div id="vestimenta" className="space-y-1">
            <h3 className={`font-script text-4xl ${gold}`}>{invite.dressCode}</h3>
            <p className="font-serif text-2xl">{event.dressCode}</p>
          </div>
        )}
        {event.giftRegistry && (
          <div id="regalos" className="mt-10 space-y-1">
            <h3 className={`font-script text-4xl ${gold}`}>{invite.giftRegistry}</h3>
            <p className="font-serif text-xl">{event.giftRegistry}</p>
          </div>
        )}

        <Divider />

        <section id="confirmar" className="space-y-6">
          <h2 className={`font-script text-5xl ${gold}`}>{invite.rsvpTitle}</h2>
          {event.rsvpDeadline && (
            <p className="text-sm opacity-80">{invite.rsvpBefore(formatShortDate(event.rsvpDeadline, t.intl))}</p>
          )}
          <RsvpForm
            token={guest.token}
            seats={guest.seats}
            status={guest.status}
            attending={guest.attending}
            buttonClassName="bg-[#9a7b4f] text-white"
            preview={preview}
          />
        </section>

        <p className={`mt-16 font-script text-4xl ${gold}`}>
          {copy.initials}
        </p>
      </div>
    </main>
  );
}
