import { fetchApiJson } from "../api-client.ts";

export type SpeciesMapPoint = {
  id: string;
  tipo: "flora" | "fauna";
  nombre: string;
  nombreCientifico: string | null;
  descripcion: string | null;
  estadoConservacion: string | null;
  lat: number;
  lng: number;
  zonaAproximada: boolean;
  radioMetros: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function parseSpeciesMapPoints(value: unknown): SpeciesMapPoint[] {
  if (!isRecord(value) || value.success !== true || !Array.isArray(value.data)) {
    throw new Error("La respuesta de flora y fauna del mapa tiene un formato inesperado.");
  }

  return value.data.map((item, index) => {
    if (
      !isRecord(item)
      || typeof item.id !== "string"
      || (item.tipo !== "flora" && item.tipo !== "fauna")
      || typeof item.nombre !== "string"
      || !isNullableString(item.nombre_cientifico)
      || !isNullableString(item.descripcion)
      || !isNullableString(item.estado_conservacion)
      || !isFiniteNumber(item.lat)
      || item.lat < -90
      || item.lat > 90
      || !isFiniteNumber(item.lng)
      || item.lng < -180
      || item.lng > 180
      || typeof item.zona_aproximada !== "boolean"
      || !(
        item.radio_metros === null
        || (isFiniteNumber(item.radio_metros) && item.radio_metros >= 0)
      )
    ) {
      throw new Error(`La especie ${index + 1} del mapa tiene un formato inesperado.`);
    }

    return {
      id: item.id,
      tipo: item.tipo,
      nombre: item.nombre,
      nombreCientifico: typeof item.nombre_cientifico === "string" ? item.nombre_cientifico : null,
      descripcion: typeof item.descripcion === "string" ? item.descripcion : null,
      estadoConservacion: typeof item.estado_conservacion === "string" ? item.estado_conservacion : null,
      lat: item.lat,
      lng: item.lng,
      zonaAproximada: item.zona_aproximada,
      radioMetros: typeof item.radio_metros === "number" ? item.radio_metros : null,
    };
  });
}

export async function fetchSpeciesMapPoints(signal?: AbortSignal): Promise<SpeciesMapPoint[]> {
  return parseSpeciesMapPoints(await fetchApiJson("/api/v1/mapa/flora-fauna", signal));
}
