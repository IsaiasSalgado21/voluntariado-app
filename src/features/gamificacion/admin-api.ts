import { requestApiJson } from "../api-client.ts";

export type AdminQuizStatistics = {
  slug: string;
  titulo: string;
  version: number;
  totalPreguntas: number;
  minimoAprobacion: number;
  puntosAprobacion: number;
  medalla: string | null;
  intentos: number;
  aprobados: number;
  noAprobados: number;
  enCurso: number;
};

export type AdminQuizAttempt = {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  usuarioFoto: string | null;
  usuarioCorreo: string | null;
  cuestionarioSlug: string;
  cuestionarioTitulo: string;
  estado: string;
  puntuacion: number | null;
  fechaUltimoIntento: string | null;
  fechaAprobacion: string | null;
};

export type AdminGamificationStatistics = {
  cuestionarios: AdminQuizStatistics[];
  totalIntentos: number;
  totalAprobados: number;
  puntosOtorgados: number;
  medallasDesbloqueadas: number;
  organizadoresCertificados: number;
  intentosRecientes: AdminQuizAttempt[];
};

export type AdminQuizQuestionAnswer = {
  id: string;
  texto: string;
  respuestaElegida: string | null;
  respuestaCorrecta: string | null;
  correcta: boolean | null;
  explicacion: string;
  respondidaEn: string | null;
};

export type AdminQuizAttemptDetail = {
  id: string;
  usuarioNombre: string;
  usuarioFoto: string | null;
  cuestionarioTitulo: string;
  cuestionarioVersion: number;
  estado: string;
  puntuacion: number | null;
  preguntas: AdminQuizQuestionAnswer[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function string(value: unknown, field: string): string {
  if (typeof value !== "string") throw new Error(`Las estadísticas de aprendizaje no contienen ${field} válido.`);
  return value;
}

function number(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Las estadísticas de aprendizaje no contienen ${field} válido.`);
  }
  return value;
}

function nullableString(value: unknown, field: string): string | null {
  if (value === null || typeof value === "string") return value;
  throw new Error(`Las estadísticas de aprendizaje no contienen ${field} válido.`);
}

function nullableNumber(value: unknown, field: string): number | null {
  if (value === null) return null;
  return number(value, field);
}

function parseQuiz(value: unknown): AdminQuizStatistics {
  if (!isRecord(value)) throw new Error("Un cuestionario tiene un formato inesperado.");
  return {
    slug: string(value.slug, "el slug del cuestionario"),
    titulo: string(value.titulo, "el título del cuestionario"),
    version: number(value.version, "la versión del cuestionario"),
    totalPreguntas: number(value.totalPreguntas, "el total de preguntas"),
    minimoAprobacion: number(value.minimoAprobacion, "el mínimo de aprobación"),
    puntosAprobacion: number(value.puntosAprobacion, "los puntos de aprobación"),
    medalla: nullableString(value.medalla, "la medalla"),
    intentos: number(value.intentos, "los intentos del cuestionario"),
    aprobados: number(value.aprobados, "las aprobaciones del cuestionario"),
    noAprobados: number(value.noAprobados, "los intentos no aprobados"),
    enCurso: number(value.enCurso, "los intentos en curso"),
  };
}

function parseAttempt(value: unknown): AdminQuizAttempt {
  if (!isRecord(value)) throw new Error("Un intento reciente tiene un formato inesperado.");
  return {
    id: string(value.id, "el identificador del intento"),
    usuarioId: string(value.usuarioId, "el identificador del usuario"),
    usuarioNombre: string(value.usuarioNombre, "el nombre del usuario"),
    usuarioFoto: nullableString(value.usuarioFoto, "la foto del usuario"),
    usuarioCorreo: nullableString(value.usuarioCorreo, "el correo del usuario"),
    cuestionarioSlug: string(value.cuestionarioSlug, "el slug del cuestionario"),
    cuestionarioTitulo: string(value.cuestionarioTitulo, "el título del cuestionario"),
    estado: string(value.estado, "el estado del intento"),
    puntuacion: nullableNumber(value.puntuacion, "la puntuación"),
    fechaUltimoIntento: nullableString(value.fechaUltimoIntento, "la fecha del intento"),
    fechaAprobacion: nullableString(value.fechaAprobacion, "la fecha de aprobación"),
  };
}

export function parseAdminGamificationStatistics(value: unknown): AdminGamificationStatistics {
  if (!isRecord(value) || !isRecord(value.data)) {
    throw new Error("La respuesta de estadísticas de aprendizaje tiene un formato inesperado.");
  }
  const data = value.data;
  if (!Array.isArray(data.cuestionarios) || !Array.isArray(data.intentosRecientes)) {
    throw new Error("La respuesta de estadísticas de aprendizaje tiene un formato inesperado.");
  }
  return {
    cuestionarios: data.cuestionarios.map(parseQuiz),
    totalIntentos: number(data.totalIntentos, "el total de intentos"),
    totalAprobados: number(data.totalAprobados, "el total de aprobaciones"),
    puntosOtorgados: number(data.puntosOtorgados, "los puntos otorgados"),
    medallasDesbloqueadas: number(data.medallasDesbloqueadas, "las medallas desbloqueadas"),
    organizadoresCertificados: number(data.organizadoresCertificados, "los organizadores certificados"),
    intentosRecientes: data.intentosRecientes.map(parseAttempt),
  };
}

function parseQuestion(value: unknown): AdminQuizQuestionAnswer {
  if (!isRecord(value)
    || !(value.correcta === null || typeof value.correcta === "boolean")) {
    throw new Error("Una respuesta del intento tiene un formato inesperado.");
  }
  return {
    id: string(value.id, "el identificador de pregunta"),
    texto: string(value.texto, "el texto de pregunta"),
    respuestaElegida: nullableString(value.respuestaElegida, "la respuesta elegida"),
    respuestaCorrecta: nullableString(value.respuestaCorrecta, "la respuesta correcta"),
    correcta: value.correcta,
    explicacion: string(value.explicacion, "la explicación"),
    respondidaEn: nullableString(value.respondidaEn, "la fecha de respuesta"),
  };
}

export function parseAdminQuizAttemptDetail(value: unknown): AdminQuizAttemptDetail {
  if (!isRecord(value) || !isRecord(value.data)) {
    throw new Error("El detalle del intento de aprendizaje tiene un formato inesperado.");
  }
  const data = value.data;
  if (!Array.isArray(data.preguntas)) {
    throw new Error("El detalle del intento de aprendizaje tiene un formato inesperado.");
  }
  return {
    id: string(data.id, "el identificador del intento"),
    usuarioNombre: string(data.usuarioNombre, "el nombre del usuario"),
    usuarioFoto: nullableString(data.usuarioFoto, "la foto del usuario"),
    cuestionarioTitulo: string(data.cuestionarioTitulo, "el título del cuestionario"),
    cuestionarioVersion: number(data.cuestionarioVersion, "la versión del cuestionario"),
    estado: string(data.estado, "el estado del intento"),
    puntuacion: nullableNumber(data.puntuacion, "la puntuación"),
    preguntas: data.preguntas.map(parseQuestion),
  };
}

export async function fetchAdminGamificationStatistics(
  token: string,
  signal?: AbortSignal,
): Promise<AdminGamificationStatistics> {
  return parseAdminGamificationStatistics(
    await requestApiJson("/api/admin/gamificacion/estadisticas", { token, signal }),
  );
}

export async function fetchAdminQuizAttempt(
  token: string,
  attemptId: string,
  signal?: AbortSignal,
): Promise<AdminQuizAttemptDetail> {
  return parseAdminQuizAttemptDetail(
    await requestApiJson(`/api/admin/gamification/intentos/${encodeURIComponent(attemptId)}`, { token, signal }),
  );
}
