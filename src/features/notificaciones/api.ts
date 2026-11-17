import { requestApiJson } from "../api-client.ts";

export type AppNotification = {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  prioridad: string;
  leida: boolean;
  fechaCreacion: string | null;
  entidad: { tipo?: string; id?: string };
  esPropia: boolean;
};

export type ReminderFrequency = "none" | "milestones" | "daily";

export type NotificationPreferences = {
  recordatorioFrecuencia: ReminderFrequency | null;
  pushActivo: boolean;
  pushDisponible: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseReminderFrequency(value: unknown): ReminderFrequency | null {
  if (value === null || value === "none" || value === "milestones" || value === "daily") return value;
  throw new Error("La API devolvió una frecuencia de recordatorio inesperada.");
}

function parseNotification(value: unknown): AppNotification {
  if (
    !isRecord(value)
    || typeof value.id !== "string"
    || typeof value.tipo !== "string"
    || typeof value.titulo !== "string"
    || typeof value.mensaje !== "string"
    || typeof value.prioridad !== "string"
    || typeof value.leida !== "boolean"
    || typeof value.esPropia !== "boolean"
    || !(value.fechaCreacion === null || typeof value.fechaCreacion === "string")
    || (value.entidad !== undefined && !isRecord(value.entidad))
  ) {
    throw new Error("La API devolvió una notificación con formato inesperado.");
  }

  const entity = isRecord(value.entidad) ? value.entidad : {};
  return {
    id: value.id,
    tipo: value.tipo,
    titulo: value.titulo,
    mensaje: value.mensaje,
    prioridad: value.prioridad,
    leida: value.leida,
    fechaCreacion: value.fechaCreacion,
    entidad: {
      ...(typeof entity.tipo === "string" ? { tipo: entity.tipo } : {}),
      ...(typeof entity.id === "string" ? { id: entity.id } : {}),
    },
    esPropia: value.esPropia,
  };
}

export function parseNotificationList(value: unknown): AppNotification[] {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new Error("La respuesta de notificaciones no tiene el formato esperado.");
  }

  return value.data.map(parseNotification);
}

export async function fetchNotifications(
  token: string,
  signal?: AbortSignal,
): Promise<AppNotification[]> {
  return parseNotificationList(await requestApiJson("/api/notificaciones", { token, signal }));
}

export async function markNotificationRead(
  token: string,
  notificationId: string,
): Promise<AppNotification> {
  const value = await requestApiJson(
    `/api/notificaciones/${encodeURIComponent(notificationId)}/leida`,
    { method: "PATCH", token },
  );

  if (!isRecord(value) || !("data" in value)) {
    throw new Error("La API no confirmó que la notificación se marcó como leída.");
  }

  return parseNotification(value.data);
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  const value = await requestApiJson("/api/notificaciones/marcar-todas-leidas", {
    method: "PATCH",
    token,
  });

  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new Error("La API no confirmó que las notificaciones se marcaron como leídas.");
  }
}

export function parseNotificationPreferences(value: unknown): NotificationPreferences {
  if (!isRecord(value) || !isRecord(value.data)
    || typeof value.data.pushActivo !== "boolean"
    || typeof value.data.pushDisponible !== "boolean") {
    throw new Error("La respuesta de preferencias de notificaciones no tiene el formato esperado.");
  }
  return {
    recordatorioFrecuencia: parseReminderFrequency(value.data.recordatorioFrecuencia),
    pushActivo: value.data.pushActivo,
    pushDisponible: value.data.pushDisponible,
  };
}

export async function fetchNotificationPreferences(token: string, signal?: AbortSignal): Promise<NotificationPreferences> {
  return parseNotificationPreferences(
    await requestApiJson("/api/notificaciones/preferencias", { token, signal }),
  );
}

export async function updateReminderFrequency(
  token: string,
  frequency: ReminderFrequency,
): Promise<ReminderFrequency> {
  const value = await requestApiJson("/api/notificaciones/preferencias", {
    method: "PATCH",
    token,
    body: { recordatorioFrecuencia: frequency },
  });
  if (!isRecord(value) || !isRecord(value.data)) {
    throw new Error("La API no confirmó el cambio de preferencia de notificaciones.");
  }
  const updated = parseReminderFrequency(value.data.recordatorioFrecuencia);
  if (!updated) throw new Error("La API no confirmó la frecuencia de recordatorio.");
  return updated;
}
