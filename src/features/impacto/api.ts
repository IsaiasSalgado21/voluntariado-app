import { requestApiJson } from "../api-client.ts";

export type ImpactMetric = {
  tipo: string;
  etiqueta: string;
  unidad: string;
};

export type ImpactTotal = ImpactMetric & {
  cantidad: number;
  registros: number;
  actividades?: number;
};

export type ImpactRecord = ImpactMetric & {
  id: string;
  cantidad: number;
  nota: string | null;
  registradoEn: string | null;
};

export type VolunteerImpactSummary = {
  voluntariadoId: string;
  catalogo: ImpactMetric[];
  registros: ImpactRecord[];
  totales: ImpactTotal[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`El resumen de impacto no contiene ${field} válido.`);
  }
  return value;
}

function asNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`El resumen de impacto no contiene ${field} válido.`);
  }
  return value;
}

function parseMetric(value: unknown): ImpactMetric {
  if (!isRecord(value)) throw new Error("La métrica de impacto tiene un formato inesperado.");
  return {
    tipo: asString(value.tipo, "el tipo"),
    etiqueta: asString(value.etiqueta, "la etiqueta"),
    unidad: asString(value.unidad, "la unidad"),
  };
}

function parseTotal(value: unknown): ImpactTotal {
  if (!isRecord(value)) throw new Error("El total de impacto tiene un formato inesperado.");
  return {
    ...parseMetric(value),
    cantidad: asNumber(value.cantidad, "la cantidad"),
    registros: asNumber(value.registros, "el número de registros"),
    ...(typeof value.actividades === "number" && Number.isFinite(value.actividades)
      ? { actividades: value.actividades }
      : {}),
  };
}

function parseRecord(value: unknown): ImpactRecord {
  if (!isRecord(value)) throw new Error("El registro de impacto tiene un formato inesperado.");
  return {
    id: asString(value.id, "el identificador"),
    ...parseMetric(value),
    cantidad: asNumber(value.cantidad, "la cantidad"),
    nota: typeof value.nota === "string" ? value.nota : null,
    registradoEn: typeof value.registradoEn === "string" ? value.registradoEn : null,
  };
}

export function parseVolunteerImpactSummary(value: unknown): VolunteerImpactSummary {
  if (!isRecord(value) || !isRecord(value.data)) {
    throw new Error("El impacto de la actividad tiene un formato inesperado.");
  }
  const data = value.data;
  if (!Array.isArray(data.catalogo) || !Array.isArray(data.registros) || !Array.isArray(data.totales)) {
    throw new Error("El impacto de la actividad tiene un formato inesperado.");
  }
  return {
    voluntariadoId: asString(data.voluntariadoId, "el identificador de actividad"),
    catalogo: data.catalogo.map(parseMetric),
    registros: data.registros.map(parseRecord),
    totales: data.totales.map(parseTotal),
  };
}

export function parseGlobalImpactTotals(value: unknown): ImpactTotal[] {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new Error("El resumen acumulado de impacto tiene un formato inesperado.");
  }
  return value.data.map(parseTotal);
}

export async function fetchVolunteerImpact(
  volunteerId: string,
  signal?: AbortSignal,
): Promise<VolunteerImpactSummary> {
  return parseVolunteerImpactSummary(await requestApiJson(
    `/api/voluntariados/${encodeURIComponent(volunteerId)}/impactos`,
    { signal },
  ));
}

export async function fetchGlobalImpact(signal?: AbortSignal): Promise<ImpactTotal[]> {
  return parseGlobalImpactTotals(await requestApiJson("/api/impactos/resumen", { signal }));
}

export async function createVolunteerImpact(
  token: string,
  volunteerId: string,
  values: { tipo: string; cantidad: number; nota?: string },
): Promise<ImpactRecord> {
  const result = await requestApiJson(
    `/api/admin/voluntariados/${encodeURIComponent(volunteerId)}/impactos`,
    { method: "POST", token, body: values },
  );
  if (!isRecord(result) || !("data" in result)) {
    throw new Error("La API no confirmó el registro del impacto.");
  }
  return parseRecord(result.data);
}
