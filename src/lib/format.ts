const TIME_ZONE = "America/Mexico_City";

// `intl` es la configuración regional del diccionario activo, p. ej. "es-MX" o "en-US"
export function formatLongDate(date: Date, intl: string) {
  return new Intl.DateTimeFormat(intl, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(date);
}

export function formatShortDate(date: Date, intl: string) {
  return new Intl.DateTimeFormat(intl, {
    day: "numeric",
    month: "long",
    timeZone: TIME_ZONE,
  }).format(date);
}

export function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
