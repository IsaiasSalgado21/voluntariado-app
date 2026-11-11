import type { SpeciesRecord, SpeciesType } from "./api";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX")
    .trim();
}

export function filterSpecies(
  records: SpeciesRecord[],
  search: string,
  type?: SpeciesType,
): SpeciesRecord[] {
  const query = normalize(search);

  return records.filter((record) => {
    if (type && record.tipo !== type) return false;
    if (!query) return true;

    return normalize([
      record.nombre,
      record.nombreCientifico ?? "",
      record.descripcion ?? "",
      record.habitat ?? "",
      record.estadoConservacion ?? "",
    ].join(" ")).includes(query);
  });
}
