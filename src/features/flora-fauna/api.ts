import { fetchApiJson } from "../api-client.ts";

export type SpeciesType = "flora" | "fauna";

export type SpeciesRecord = {
  id: string;
  nombre: string;
  nombreCientifico: string | null;
  tipo: SpeciesType;
  descripcion: string | null;
  habitat: string | null;
  estadoConservacion: string | null;
  imagenes: string[];
  ubicacionNombre: string | null;
  zonaAproximada: boolean;
  fuenteInformacion: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function parseSpeciesList(data: unknown): SpeciesRecord[] {
  if (!Array.isArray(data)) {
    throw new Error("La respuesta de flora y fauna no contiene una lista válida.");
  }

  return data.map((value, index) => {
    const location = isRecord(value) ? value.ubicacion : null;

    if (
      !isRecord(value)
      || typeof value.id !== "string"
      || typeof value.nombre !== "string"
      || (value.tipo !== "flora" && value.tipo !== "fauna")
      || !nullableString(value.nombreCientifico)
      || !nullableString(value.descripcion)
      || !nullableString(value.habitat)
      || !nullableString(value.estadoConservacion)
      || !Array.isArray(value.imagenes)
      || !value.imagenes.every((image) => typeof image === "string")
      || (location !== null && !isRecord(location))
      || (isRecord(location) && !nullableString(location.nombre))
      || typeof value.zonaAproximada !== "boolean"
      || !nullableString(value.fuenteInformacion)
    ) {
      throw new Error(`El registro de flora/fauna ${index + 1} tiene un formato inesperado.`);
    }

    return {
      id: value.id,
      nombre: value.nombre,
      nombreCientifico: value.nombreCientifico,
      tipo: value.tipo,
      descripcion: value.descripcion,
      habitat: value.habitat,
      estadoConservacion: value.estadoConservacion,
      imagenes: value.imagenes,
      ubicacionNombre: isRecord(location) && typeof location.nombre === "string"
        ? location.nombre
        : null,
      zonaAproximada: value.zonaAproximada,
      fuenteInformacion: value.fuenteInformacion,
    };
  });
}

export async function fetchSpecies(signal?: AbortSignal): Promise<SpeciesRecord[]> {
  const body = await fetchApiJson("/api/flora-fauna", signal);
  if (!isRecord(body) || !Array.isArray(body.data)) {
    throw new Error("La respuesta de la API no coincide con el contrato de flora y fauna.");
  }

  return parseSpeciesList(body.data);
}
