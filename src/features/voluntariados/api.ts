import type { VolunteerFilters } from "./filters";
import { fetchApiJson, requestApiJson, resolveApiAssetUrl } from "../api-client.ts";

export type CommentsDefault = "publico" | "privado";

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

export type VolunteerDetail = {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string | null;
  imagen: string | null;
  imagenes: string[];
  estado: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  lugarId: string;
  latitud: number | null;
  longitud: number | null;
  cupo: number;
  requisitos: string[];
  materiales: string[];
  organizadorNombre: string | null;
  organizadorId: string | null;
  organizadorFoto: string | null;
  finalizadoPorFecha: boolean;
  comentariosPorDefecto: CommentsDefault;
};

export type VolunteerPlaceDetail = {
  id: string;
  nombre: string;
  descripcion: string | null;
  municipio: string | null;
  tipo: string | null;
  latitud: number | null;
  longitud: number | null;
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

export function isCommentsDefault(value: unknown): value is CommentsDefault {
  return value === "publico" || value === "privado";
}

function nullableNumber(value: unknown, field: string): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`El registro no contiene ${field} válido.`);
  }
  return value;
}

function parseStringList(value: unknown, field: string): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`El voluntariado no contiene ${field} válidos.`);
  }
  return value;
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

export function parseVolunteerDetail(value: unknown, fallbackId: string): VolunteerDetail {
  const id = isRecord(value)
    ? typeof value.id === "string"
      ? value.id
      : typeof value._id === "string"
        ? value._id
        : fallbackId
    : fallbackId;
  if (
    !isRecord(value)
    || !id
    || typeof value.titulo !== "string"
    || typeof value.descripcion !== "string"
    || !nullableStringField(value.categoria)
    || typeof value.estado !== "string"
    || !nullableStringField(value.fechaInicio)
    || !nullableStringField(value.fechaFin)
    || !nullableStringField(value.horaInicio)
    || !nullableStringField(value.horaFin)
    || typeof value.lugarId !== "string"
    || typeof value.cupo !== "number"
    || !Number.isFinite(value.cupo)
    || !nullableStringField(value.imagen)
    || !nullableStringField(value.organizadorNombre)
    || !nullableStringField(value.organizadorId)
    || !nullableStringField(value.organizadorFoto)
    || (value.finalizadoPorFecha !== undefined && typeof value.finalizadoPorFecha !== "boolean")
    || (
      value.comentarios_por_defecto !== undefined
      && value.comentarios_por_defecto !== null
      && !isCommentsDefault(value.comentarios_por_defecto)
    )
  ) {
    throw new Error("El voluntariado tiene un formato inesperado.");
  }

  const imageUrls = Array.isArray(value.imagenes)
    ? value.imagenes
      .filter((image): image is string => typeof image === "string")
      .map((image) => resolveApiAssetUrl(image))
      .filter((image): image is string => image !== null)
    : [];

  return {
    id,
    titulo: value.titulo,
    descripcion: value.descripcion,
    categoria: typeof value.categoria === "string" ? value.categoria : null,
    imagen: resolveApiAssetUrl(typeof value.imagen === "string" ? value.imagen : null),
    imagenes: imageUrls,
    estado: value.estado,
    fechaInicio: typeof value.fechaInicio === "string" ? value.fechaInicio : null,
    fechaFin: typeof value.fechaFin === "string" ? value.fechaFin : null,
    horaInicio: typeof value.horaInicio === "string" ? value.horaInicio : null,
    horaFin: typeof value.horaFin === "string" ? value.horaFin : null,
    lugarId: value.lugarId,
    latitud: nullableNumber(value.latitud, "la latitud"),
    longitud: nullableNumber(value.longitud, "la longitud"),
    cupo: value.cupo,
    requisitos: parseStringList(value.requisitos, "los requisitos"),
    materiales: parseStringList(value.materiales, "los materiales"),
    organizadorNombre: typeof value.organizadorNombre === "string" ? value.organizadorNombre : null,
    organizadorId: typeof value.organizadorId === "string" ? value.organizadorId : null,
    organizadorFoto: resolveApiAssetUrl(
      typeof value.organizadorFoto === "string" ? value.organizadorFoto : null,
    ),
    finalizadoPorFecha: value.finalizadoPorFecha === true,
    comentariosPorDefecto: isCommentsDefault(value.comentarios_por_defecto)
      ? value.comentarios_por_defecto
      : "publico",
  };
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

export function parseVolunteerPlaceDetail(value: unknown): VolunteerPlaceDetail {
  if (
    !isRecord(value)
    || !isRecord(value.data)
    || typeof value.data.id !== "string"
    || typeof value.data.nombre !== "string"
    || !nullableStringField(value.data.descripcion)
    || !nullableStringField(value.data.municipio)
    || !nullableStringField(value.data.tipo)
  ) {
    throw new Error("El lugar del voluntariado tiene un formato inesperado.");
  }

  return {
    id: value.data.id,
    nombre: value.data.nombre,
    descripcion: typeof value.data.descripcion === "string" ? value.data.descripcion : null,
    municipio: typeof value.data.municipio === "string" ? value.data.municipio : null,
    tipo: typeof value.data.tipo === "string" ? value.data.tipo : null,
    latitud: nullableNumber(value.data.latitud, "la latitud del lugar"),
    longitud: nullableNumber(value.data.longitud, "la longitud del lugar"),
  };
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
): Promise<VolunteerDetail> {
  const result = await fetchApiJson(`/api/voluntariados/${encodeURIComponent(id)}`, signal);
  if (!isRecord(result) || result.success !== true || !isRecord(result.voluntariado)) {
    throw new Error("La respuesta del detalle de voluntariado tiene un formato inesperado.");
  }
  return parseVolunteerDetail(result.voluntariado, id);
}

export async function fetchVolunteerMapItem(
  id: string,
  signal?: AbortSignal,
): Promise<VolunteerMapItem | null> {
  const items = await fetchVoluntariados({}, signal);
  return items.find((item) => item.id === id) ?? null;
}

export async function fetchVolunteerPlace(
  id: string,
  signal?: AbortSignal,
): Promise<VolunteerPlaceDetail> {
  const result = await requestApiJson(`/api/lugares/${encodeURIComponent(id)}`, { signal });
  return parseVolunteerPlaceDetail(result);
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
