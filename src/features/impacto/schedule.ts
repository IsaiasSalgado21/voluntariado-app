export function hasVolunteerEnded(
  dateValue: string | null | undefined,
  timeValue: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!dateValue) return false;
  const endDate = dateValue.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return false;

  const endTime = timeValue
    ? timeValue.length === 5 ? `${timeValue}:00` : timeValue.slice(0, 8)
    : "23:59:59";
  const currentParts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Mazatlan",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: string) => currentParts.find((item) => item.type === type)?.value ?? "";
  const current = `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}:${part("second")}`;
  return `${endDate} ${endTime}` < current;
}
