import { requestApiJson } from "../api-client.ts";

export type AttendanceResult = {
  id: string;
  usuarioId: string;
  voluntariadoId: string;
  metodo: string;
  confirmada: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseAttendance(value: unknown): AttendanceResult {
  if (!isRecord(value) || typeof value.success !== "boolean" || value.success !== true
    || !isRecord(value.asistencia)) {
    throw new Error("La API no confirmó el registro de asistencia.");
  }
  const attendance = value.asistencia;
  const id = typeof attendance.id === "string" ? attendance.id : attendance._id;
  if (typeof id !== "string" || typeof attendance.usuarioId !== "string"
    || typeof attendance.voluntariadoId !== "string" || typeof attendance.metodo !== "string"
    || typeof attendance.confirmada !== "boolean") {
    throw new Error("El registro de asistencia tiene un formato inesperado.");
  }
  return {
    id,
    usuarioId: attendance.usuarioId,
    voluntariadoId: attendance.voluntariadoId,
    metodo: attendance.metodo,
    confirmada: attendance.confirmada,
  };
}

export async function scanAttendanceQr(token: string, qrToken: string): Promise<AttendanceResult> {
  return parseAttendance(await requestApiJson("/api/asistencias", {
    method: "POST",
    token,
    body: { metodo: "QR", tokenAsistencia: qrToken },
  }));
}

export async function registerManualAttendance(
  token: string,
  userId: string,
  volunteerId: string,
): Promise<AttendanceResult> {
  return parseAttendance(await requestApiJson("/api/asistencias", {
    method: "POST",
    token,
    body: { metodo: "manual", usuarioId: userId, voluntariadoId: volunteerId },
  }));
}

export async function updateAttendanceCode(
  token: string,
  volunteerId: string,
  active: boolean,
): Promise<void> {
  const result = await requestApiJson(
    `/api/admin/voluntariados/${encodeURIComponent(volunteerId)}/codigo-asistencia`,
    { method: "PATCH", token, body: { codigoAsistenciaActivo: active } },
  );
  if (!isRecord(result) || !("data" in result)) {
    throw new Error("La API no confirmó el cambio del código de asistencia.");
  }
}
