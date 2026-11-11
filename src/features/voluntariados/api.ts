import type { VolunteerFilters } from "./filters";
import { fetchApiJson, resolveApiAssetUrl } from "../api-client.ts";

export type VolunteerMapItem = {
  id: string;
  titulo: string;
  descripcion: string;
  imagen: string | null;
  imagenes: string[];
  categoria: string | null;
  fecha_inicio: string | null;
  lugar_id: string;
  lugar_nombre: string | null;
  cupo: number;
  inscripciones_activas: number;
  lleno: boolean;
  lat: number;
  lng: number;
};

export type PlaceOption = {
  id: string;
  nombre: string;
  descripcion: string | null;
  municipio: string | null;
  tipo: string | null;
  imagen: string | null;
  lat: number;
  lng: number;
};

type ApiEnvelope = {
  success: boolean;
  data: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullableStringField(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}

function isCoordinate(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

async function getEnvelope(
  path: string,
  signal?: AbortSignal,
): Promise<ApiEnvelope> {
  const body = await fetchApiJson(path, signal);

  if (!isRecord(body) || body.success !== true || !Array.isArray(body.data)) {
    throw new Error("La respuesta de la API no coincide con el contrato del mapa.");
  }

  return body as ApiEnvelope;
}

export function parseVolunteerMapItems(data: unknown): VolunteerMapItem[] {
  if (!Array.isArray(data)) {
    throw new Error("La respuesta de voluntariados no contiene una lista válida.");
  }

  return data.map((value, index) => {
    if (
      !isRecord(value)
      || typeof value.id !== "string"
      || typeof value.titulo !== "string"
      || typeof value.descripcion !== "string"
      || typeof value.cupo !== "number"
      || typeof value.inscripciones_activas !== "number"
      || typeof value.lleno !== "boolean"
      || typeof value.lat !== "number"
      || typeof value.lng !== "number"
    ) {
      throw new Error(`El voluntariado ${index + 1} tiene un formato inesperado.`);
    }

    return {
      id: value.id,
      titulo: value.titulo,
      descripcion: value.descripcion,
      imagen: resolveApiAssetUrl(typeof value.imagen === "string"
        ? value.imagen
        : Array.isArray(value.imagenes) && typeof value.imagenes[0] === "string"
          ? value.imagenes[0]
          : null),
      imagenes: Array.isArray(value.imagenes)
        ? value.imagenes
          .filter((image): image is string => typeof image === "string")
          .map((image) => resolveApiAssetUrl(image))
          .filter((image): image is string => image !== null)
        : [],
      categoria: typeof value.categoria === "string" ? value.categoria : null,
      fecha_inicio: typeof value.fecha_inicio === "string" ? value.fecha_inicio : null,
      lugar_id: typeof value.lugar_id === "string" ? value.lugar_id : "",
      lugar_nombre: typeof value.lugar_nombre === "string" ? value.lugar_nombre : null,
      cupo: value.cupo,
      inscripciones_activas: value.inscripciones_activas,
      lleno: value.lleno,
      lat: value.lat,
      lng: value.lng,
    };
  });
}

export function parsePlaces(data: unknown): PlaceOption[] {
  if (!Array.isArray(data)) {
    throw new Error("La respuesta de lugares no contiene una lista válida.");
  }

  return data.map((value, index) => {
    if (
      !isRecord(value)
      || typeof value.id !== "string"
      || typeof value.nombre !== "string"
      || !nullableStringField(value.descripcion)
      || !nullableStringField(value.municipio)
      || !nullableStringField(value.tipo_lugar)
      || !nullableStringField(value.imagen)
      || !isCoordinate(value.lat, -90, 90)
      || !isCoordinate(value.lng, -180, 180)
    ) {
      throw new Error(`El lugar ${index + 1} tiene un formato inesperado.`);
    }

    return {
      id: value.id,
      nombre: value.nombre,
      descripcion: typeof value.descripcion === "string" ? value.descripcion : null,
      municipio: typeof value.municipio === "string" ? value.municipio : null,
      tipo: typeof value.tipo_lugar === "string" ? value.tipo_lugar : null,
      imagen: typeof value.imagen === "string" ? value.imagen : null,
      lat: value.lat,
      lng: value.lng,
    };
  });
}

export async function fetchVoluntariados(
  filters: VolunteerFilters = {},
  signal?: AbortSignal,
): Promise<VolunteerMapItem[]> {
  const query = buildVolunteerQuery(filters);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  const envelope = await getEnvelope(`/api/v1/mapa/voluntariados${suffix}`, signal);
  return parseVolunteerMapItems(envelope.data);
}

export async function fetchPlaces(signal?: AbortSignal): Promise<PlaceOption[]> {
  const envelope = await getEnvelope("/api/v1/mapa/lugares", signal);
  return parsePlaces(envelope.data);
}

export async function fetchVoluntariado(
  id: string,
  signal?: AbortSignal,
): Promise<VolunteerMapItem | null> {
  const items = await fetchVoluntariados({}, signal);
  return items.find((item) => item.id === id) ?? null;
}

export function buildVolunteerQuery(filters: VolunteerFilters): URLSearchParams {
  const query = new URLSearchParams();
  if (filters.categoria) query.set("categoria", filters.categoria);
  if (filters.fecha_desde) query.set("fecha_desde", filters.fecha_desde);
  if (filters.fecha_hasta) query.set("fecha_hasta", filters.fecha_hasta);
  if (filters.lugar_id) query.set("lugar_id", filters.lugar_id);
  if (filters.disponibles !== undefined) {
    query.set("disponibles", filters.disponibles ? "1" : "0");
  }
  return query;
}
