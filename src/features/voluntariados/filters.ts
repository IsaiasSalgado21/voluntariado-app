import type { VolunteerMapItem } from "./api";

export type VolunteerFilters = {
  categoria?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  lugar_id?: string;
  disponibles?: boolean;
};

export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX")
    .trim();
}

export function filterVoluntariados(
  items: VolunteerMapItem[],
  search: string,
): VolunteerMapItem[] {
  const query = normalizeSearch(search);
  if (!query) return items;

  return items.filter((item) =>
    normalizeSearch(
      [item.titulo, item.descripcion, item.categoria ?? "", item.lugar_nombre ?? ""].join(" "),
    ).includes(query),
  );
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export function validateDateRange(
  from?: string,
  to?: string,
): string | null {
  if (from && !isValidIsoDate(from)) return "Escribe la fecha inicial como AAAA-MM-DD.";
  if (to && !isValidIsoDate(to)) return "Escribe la fecha final como AAAA-MM-DD.";
  if (from && to && from > to) return "La fecha inicial no puede ser posterior a la fecha final.";
  return null;
}
