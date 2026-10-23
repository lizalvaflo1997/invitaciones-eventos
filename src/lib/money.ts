// El dinero se guarda en centavos (enteros) para que las sumas sean exactas. Todo en pesos mexicanos.

// "12,500", "$12,500.50" o "12500" → 1250000 centavos; null si no es un monto válido
export function parseMoney(text: string): number | null {
  const clean = text.replace(/[$\s,]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}

export function formatMoney(cents: number, intl: string) {
  return new Intl.NumberFormat(intl, {
    style: "currency",
    currency: "MXN",
    // Sin centavos cuando el monto es cerrado, para que el resumen se lea fácil
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

// Para precargar un campo de texto: 1250050 → "12500.50"
export function centsToInput(cents: number | null | undefined) {
  if (cents == null) return "";
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}
