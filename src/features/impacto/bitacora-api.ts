import { requestApiJson } from "../api-client.ts";

export type ImpactLogFilters = {
  desde?: string;
  hasta?: string;
  categoria?: string;
  lugarId?: string;
  estado?: string;
};

export type ImpactLogData = {
  kpis: {
    voluntariados: number;
    participantes: number;
    horas: number;
    kilogramosResiduos: number;
    kilometrosCosta: number;
    plantasReforestadas: number;
    superficieRecuperada: number;
    ubicaciones: number;
  };
  evolucion: Array<{
    periodo: string;
    voluntariados: number;
    participaciones: number;
    horas: number;
  }>;
  categorias: Array<{ categoria: string; voluntariados: number }>;
  historial: Array<{
    id: string;
    titulo: string;
    categoria: string;
    estado: string;
    fechaInicio: string | null;
    lugar: string;
    participantes: number;
    horas: number;
  }>;
  opciones: {
    categorias: Array<{ id: string; nombre: string }>;
    lugares: Array<{ id: string; nombre: string; municipio: string | null }>;
    estados: string[];
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string") throw new Error(`La bitácora de impacto no contiene ${field} válido.`);
  return value;
}

function number(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`La bitácora de impacto no contiene ${field} válido.`);
  }
  return value;
}

function parseKpis(value: unknown): ImpactLogData["kpis"] {
  if (!isRecord(value)) throw new Error("Los indicadores de impacto tienen un formato inesperado.");
  return {
    voluntariados: number(value.voluntariados, "el total de voluntariados"),
    participantes: number(value.participantes, "el total de participantes"),
    horas: number(value.horas, "las horas"),
    kilogramosResiduos: number(value.kilogramosResiduos, "los residuos recolectados"),
    kilometrosCosta: number(value.kilometrosCosta, "los kilómetros de costa"),
    plantasReforestadas: number(value.plantasReforestadas, "las plantas reforestadas"),
    superficieRecuperada: number(value.superficieRecuperada, "la superficie recuperada"),
    ubicaciones: number(value.ubicaciones, "las ubicaciones"),
  };
}

function parseEvolution(value: unknown): ImpactLogData["evolucion"][number] {
  if (!isRecord(value)) throw new Error("Una serie temporal de impacto tiene un formato inesperado.");
  return {
    periodo: text(value.periodo, "el periodo"),
    voluntariados: number(value.voluntariados, "los voluntariados del periodo"),
    participaciones: number(value.participaciones, "las asistencias del periodo"),
    horas: number(value.horas, "las horas del periodo"),
  };
}

function parseCategory(value: unknown): ImpactLogData["categorias"][number] {
  if (!isRecord(value)) throw new Error("Una categoría de impacto tiene un formato inesperado.");
  return {
    categoria: text(value.categoria, "la categoría"),
    voluntariados: number(value.voluntariados, "los voluntariados de la categoría"),
  };
}

function parseHistory(value: unknown): ImpactLogData["historial"][number] {
  if (!isRecord(value)
    || !(value.fechaInicio === null || typeof value.fechaInicio === "string")) {
    throw new Error("Una actividad de la bitácora tiene un formato inesperado.");
  }
  return {
    id: text(value.id, "el identificador de actividad"),
    titulo: text(value.titulo, "el título de actividad"),
    categoria: text(value.categoria, "la categoría de actividad"),
    estado: text(value.estado, "el estado de actividad"),
    fechaInicio: value.fechaInicio,
    lugar: text(value.lugar, "la ubicación de actividad"),
    participantes: number(value.participantes, "las asistencias de actividad"),
    horas: number(value.horas, "las horas de actividad"),
  };
}

function parseOptions(value: unknown): ImpactLogData["opciones"] {
  if (!isRecord(value)
    || !Array.isArray(value.categorias)
    || !Array.isArray(value.lugares)
    || !Array.isArray(value.estados)) {
    throw new Error("Las opciones de filtro de la bitácora tienen un formato inesperado.");
  }
  const categories = value.categorias.map((item) => {
    if (!isRecord(item)) throw new Error("Una opción de categoría tiene un formato inesperado.");
    return { id: text(item.id, "el identificador de categoría"), nombre: text(item.nombre, "el nombre de categoría") };
  });
  const places = value.lugares.map((item) => {
    if (!isRecord(item)
      || !(item.municipio === null || typeof item.municipio === "string")) {
      throw new Error("Una opción de ubicación tiene un formato inesperado.");
    }
    return {
      id: text(item.id, "el identificador de ubicación"),
      nombre: text(item.nombre, "el nombre de ubicación"),
      municipio: item.municipio,
    };
  });
  return {
    categorias: categories,
    lugares: places,
    estados: value.estados.map((item) => text(item, "el estado disponible")),
  };
}

export function parseImpactLog(value: unknown): ImpactLogData {
  if (!isRecord(value) || !isRecord(value.data)) {
    throw new Error("La respuesta de la bitácora de impacto tiene un formato inesperado.");
  }
  const data = value.data;
  if (!Array.isArray(data.evolucion) || !Array.isArray(data.categorias) || !Array.isArray(data.historial)) {
    throw new Error("La respuesta de la bitácora de impacto tiene un formato inesperado.");
  }
  return {
    kpis: parseKpis(data.kpis),
    evolucion: data.evolucion.map(parseEvolution),
    categorias: data.categorias.map(parseCategory),
    historial: data.historial.map(parseHistory),
    opciones: parseOptions(data.opciones),
  };
}

export async function fetchImpactLog(
  token: string,
  role: "admin" | "organizador",
  filters: ImpactLogFilters = {},
  signal?: AbortSignal,
): Promise<ImpactLogData> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) query.set(key, value);
  }
  const endpoint = role === "admin" ? "/api/admin/bitacora-impacto" : "/api/organizador/bitacora-impacto";
  const queryString = query.toString();
  const suffix = queryString ? `?${queryString}` : "";
  return parseImpactLog(await requestApiJson(`${endpoint}${suffix}`, { token, signal }));
}
