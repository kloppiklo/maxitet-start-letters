export type AcademicWeek = "Нечётная" | "Чётная";

const ODD_WEEK_MONDAY_UTC = Date.UTC(2026, 7, 31);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function moscowDateUtc(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Date.UTC(Number(value.year), Number(value.month) - 1, Number(value.day));
}

export function getCurrentAcademicWeek(date = new Date()): AcademicWeek {
  const currentDateUtc = moscowDateUtc(date);
  const weekIndex = Math.floor((currentDateUtc - ODD_WEEK_MONDAY_UTC) / WEEK_MS);
  return ((weekIndex % 2) + 2) % 2 === 0 ? "Нечётная" : "Чётная";
}

export function getCurrentAcademicWeekRange(date = new Date()) {
  const currentDateUtc = moscowDateUtc(date);
  const day = new Date(currentDateUtc).getUTCDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(currentDateUtc - daysFromMonday * 24 * 60 * 60 * 1000);
  const friday = new Date(monday.getTime() + 4 * 24 * 60 * 60 * 1000);
  const month = new Intl.DateTimeFormat("ru-RU", { month: "long", timeZone: "UTC" }).format(friday);
  return `${monday.getUTCDate()}–${friday.getUTCDate()} ${month}`;
}

export function getCurrentDateLabel(date = new Date()) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Moscow" }).format(date);
}
