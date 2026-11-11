export function parseDateValue(value: string | null | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

export function parseTimeValue(value: string | null | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value);
  if (!match) return fallback;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return fallback;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function formatDateValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
