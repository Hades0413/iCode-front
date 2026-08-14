/**
 * Fechas en castellano, sin Intl a propósito: el diseño usa formas
 * concretas ("16 ago", "11 de agosto de 2026") y las abreviaturas de
 * Intl.DateTimeFormat cambian según el runtime ("ago." con punto, "sept").
 *
 * Las fechas ISO del backend se parsean a mano en lugar de con
 * "new Date(iso)": un "2026-08-16T10:30" sin zona lo interpreta cada
 * navegador a su manera y una cita puede correrse un día.
 */

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const MONTHS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

interface DateParts {
  day: number;
  month: number;
  year: number;
}

function parseIsoDate(iso: string): DateParts | null {
  const [date] = iso.split('T');
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return { day, month, year };
}

/** "16 ago" — para tablas y avisos donde el año se sobreentiende. */
export function formatShortDate(iso: string): string {
  const parts = parseIsoDate(iso);
  if (!parts) return iso;
  return `${parts.day} ${MONTHS_SHORT[parts.month - 1]}`;
}

/** "11 de agosto de 2026". */
export function formatLongDate(date: Date): string {
  return `${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
}

/** "10:13 p. m." — 12 horas, con el punto y el espacio que usa Perú (Intl lo escribe distinto según runtime). */
export function formatClockTime(date: Date): string {
  const hour24 = date.getHours();
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const minute = String(date.getMinutes()).padStart(2, '0');
  const meridiem = hour24 < 12 ? 'a. m.' : 'p. m.';
  return `${hour12}:${minute} ${meridiem}`;
}
