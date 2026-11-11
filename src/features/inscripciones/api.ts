import { requestApiJson } from "../api-client.ts";

export type EnrollmentStatus = "inscrita" | "activa" | "cancelada" | "completada";

export type Enrollment = {
  id: string;
  usuarioId: string;
  voluntariadoId: string;
  fechaInscripcion: string | null;
  estado: EnrollmentStatus;
  observaciones: string | null;
};

function isEnrollmentStatus(value: unknown): value is EnrollmentStatus {
  return value === "inscrita"
    || value === "activa"
    || value === "cancelada"
    || value === "completada";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEnrollment(value: unknown): Enrollment {
  const id = isRecord(value)
    ? typeof value.id === "string"
      ? value.id
      : value._id
    : undefined;

  if (
    !isRecord(value)
    || typeof id !== "string"
    || typeof value.usuarioId !== "string"
    || typeof value.voluntariadoId !== "string"
    || !isEnrollmentStatus(value.estado)
    || (value.fechaInscripcion !== undefined
      && value.fechaInscripcion !== null
      && typeof value.fechaInscripcion !== "string")
    || (value.observaciones !== undefined
      && value.observaciones !== null
      && typeof value.observaciones !== "string")
  ) {
    throw new Error("La API devolvió una inscripción con formato inesperado.");
  }

  return {
    id,
    usuarioId: value.usuarioId,
    voluntariadoId: value.voluntariadoId,
    fechaInscripcion: typeof value.fechaInscripcion === "string" ? value.fechaInscripcion : null,
    estado: value.estado,
    observaciones: typeof value.observaciones === "string" ? value.observaciones : null,
  };
}

export function parseEnrollmentList(value: unknown): Enrollment[] {
  if (!isRecord(value) || value.success !== true || !Array.isArray(value.inscripciones)) {
    throw new Error("La respuesta de inscripciones no tiene el formato esperado.");
  }

  return value.inscripciones.map(parseEnrollment);
}

export function parseMyEnrollment(value: unknown): {
  enrolled: boolean;
  enrollmentId: string | null;
} {
  if (
    !isRecord(value)
    || value.success !== true
    || typeof value.inscrito !== "boolean"
    || !(value.inscripcionId === null || typeof value.inscripcionId === "string")
    || (value.inscrito && typeof value.inscripcionId !== "string")
    || (!value.inscrito && value.inscripcionId !== null)
  ) {
    throw new Error("La respuesta de participación no tiene el formato esperado.");
  }

  return { enrolled: value.inscrito, enrollmentId: value.inscripcionId };
}

export async function fetchMyEnrollments(
  token: string,
  signal?: AbortSignal,
): Promise<Enrollment[]> {
  return parseEnrollmentList(await requestApiJson("/api/inscripciones", { token, signal }));
}

export async function fetchMyEnrollment(
  token: string,
  volunteerId: string,
  signal?: AbortSignal,
): Promise<{ enrolled: boolean; enrollmentId: string | null }> {
  const path = `/api/inscripciones/voluntariado/${encodeURIComponent(volunteerId)}/mia`;
  return parseMyEnrollment(await requestApiJson(path, { token, signal }));
}

export async function createEnrollment(
  token: string,
  volunteerId: string,
): Promise<Enrollment> {
  const value = await requestApiJson("/api/inscripciones", {
    method: "POST",
    token,
    body: { voluntariadoId: volunteerId },
  });

  if (!isRecord(value) || value.success !== true || !("inscripcion" in value)) {
    throw new Error("La API no confirmó la inscripción.");
  }

  return parseEnrollment(value.inscripcion);
}

export async function cancelEnrollment(token: string, enrollmentId: string): Promise<void> {
  const value = await requestApiJson(
    `/api/inscripciones/${encodeURIComponent(enrollmentId)}/cancelar`,
    { method: "POST", token },
  );

  if (!isRecord(value) || value.success !== true) {
    throw new Error("La API no confirmó la cancelación.");
  }
}
