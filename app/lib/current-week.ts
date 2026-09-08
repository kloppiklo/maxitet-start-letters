export type AcademicWeek = "Нечётная" | "Чётная";

const ODD_WEEK_MONDAY_UTC = Date.UTC(2026, 7, 31);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function getCurrentAcademicWeek(date = new Date()): AcademicWeek {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const currentDateUtc = Date.UTC(Number(value.year), Number(value.month) - 1, Number(value.day));
  const weekIndex = Math.floor((currentDateUtc - ODD_WEEK_MONDAY_UTC) / WEEK_MS);
  return ((weekIndex % 2) + 2) % 2 === 0 ? "Нечётная" : "Чётная";
}
