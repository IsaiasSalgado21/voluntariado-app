import { requestApiJson } from "../api-client.ts";

export type ManagedVolunteer = {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  lugarId: string;
  organizadorId: string;
  fechaInicio: string;
  fechaFin: string;
  horaInicio: string;
  horaFin: string;
  cupo: number;
  requisitos: string[];
  materiales: string[];
  estado: string;
  tokenAsistencia: string | null;
  codigoAsistenciaActivo: boolean;
};

export type VolunteerFormValues = Omit<
  ManagedVolunteer,
  "id" | "organizadorId" | "estado" | "tokenAsistencia" | "codigoAsistenciaActivo"
> & { organizadorId?: string };

export type OrganizerOption = {
  id: string;
  nombre: string;
  correo: string;
};

export type VolunteerDashboard = {
  volunteer: ManagedVolunteer & { lugar: { nombre: string; municipio: string; direccion: string | null } | null };
  statistics: {
    inscritos: number;
    cupo: number;
    disponibles: number;
    ocupacion: number;
    asistencias: number;
    porcentajeAsistencia: number;
    pendientes: number;
    canceladas: number;
    registrosQr: number;
  };
  participants: Array<{
    id: string;
    usuarioId: string;
    nombre: string | null;
    correo: string | null;
    estadoInscripcion: string;
    asistencia: { confirmada: boolean; fecha: string | null; hora: string | null; metodo: string | null } | null;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string") throw new Error(`El voluntariado no contiene ${field}.`);
  return value;
}

function asNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Las estadísticas no contienen ${field} válido.`);
  }
  return value;
}

function parseManagedVolunteer(value: unknown): ManagedVolunteer {
  if (!isRecord(value) || typeof value.cupo !== "number" || typeof value.codigoAsistenciaActivo !== "boolean") {
    throw new Error("La respuesta de voluntariado administrado no tiene el formato esperado.");
  }
  const stringArray = (input: unknown) => Array.isArray(input)
    ? input.filter((item): item is string => typeof item === "string")
    : [];
  return {
    id: asString(value.id, "id"),
    titulo: asString(value.titulo, "título"),
    descripcion: asString(value.descripcion, "descripción"),
    categoria: asString(value.categoria, "categoría"),
    lugarId: asString(value.lugarId, "lugar"),
    organizadorId: asString(value.organizadorId, "organizador"),
    fechaInicio: asString(value.fechaInicio, "fecha de inicio"),
    fechaFin: asString(value.fechaFin, "fecha de fin"),
    horaInicio: asString(value.horaInicio, "hora de inicio"),
    horaFin: asString(value.horaFin, "hora de fin"),
    cupo: value.cupo,
    requisitos: stringArray(value.requisitos),
    materiales: stringArray(value.materiales),
    estado: asString(value.estado, "estado"),
    tokenAsistencia: typeof value.tokenAsistencia === "string" ? value.tokenAsistencia : null,
    codigoAsistenciaActivo: value.codigoAsistenciaActivo,
  };
}

export function parseManagedVolunteerList(value: unknown): ManagedVolunteer[] {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new Error("La respuesta de actividades administradas no tiene el formato esperado.");
  }
  return value.data.map(parseManagedVolunteer);
}

export async function fetchManagedVolunteers(token: string, signal?: AbortSignal): Promise<ManagedVolunteer[]> {
  return parseManagedVolunteerList(await requestApiJson("/api/admin/voluntariados", { token, signal }));
}

export async function fetchAdminOrganizers(token: string, signal?: AbortSignal): Promise<OrganizerOption[]> {
  const result = await requestApiJson("/api/admin/voluntariados/organizadores", { token, signal });
  if (!isRecord(result) || !Array.isArray(result.data)) {
    throw new Error("La lista de organizadores no tiene el formato esperado.");
  }
  return result.data.map((item, index) => {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.nombre !== "string"
      || typeof item.correo !== "string") {
      throw new Error(`El organizador ${index + 1} tiene un formato inesperado.`);
    }
    return { id: item.id, nombre: item.nombre, correo: item.correo };
  });
}

export async function createManagedVolunteer(
  token: string,
  values: VolunteerFormValues,
): Promise<ManagedVolunteer> {
  return parseManagedVolunteer(await requestApiJson("/api/admin/voluntariados", {
    method: "POST",
    token,
    body: values,
  }).then((result) => {
    if (!isRecord(result) || !("data" in result)) {
      throw new Error("La API no confirmó la creación del voluntariado.");
    }
    return result.data;
  }));
}

export async function updateManagedVolunteer(
  token: string,
  id: string,
  values: Partial<VolunteerFormValues>,
): Promise<ManagedVolunteer> {
  const result = await requestApiJson(`/api/admin/voluntariados/${encodeURIComponent(id)}`, {
    method: "PUT",
    token,
    body: values,
  });
  if (!isRecord(result) || !("data" in result)) {
    throw new Error("La API no confirmó la actualización del voluntariado.");
  }
  return parseManagedVolunteer(result.data);
}

export async function fetchVolunteerDashboard(
  token: string,
  id: string,
  signal?: AbortSignal,
): Promise<VolunteerDashboard> {
  const result = await requestApiJson(
    `/api/admin/voluntariados/${encodeURIComponent(id)}/dashboard`,
    { token, signal },
  );
  if (!isRecord(result) || !isRecord(result.data)) {
    throw new Error("El dashboard del voluntariado no tiene el formato esperado.");
  }
  const rawStats = result.data.estadisticas;
  const rawVolunteer = result.data.voluntariado;
  const rawParticipants = result.data.participantes;
  if (!isRecord(rawStats) || !isRecord(rawVolunteer) || !Array.isArray(rawParticipants)) {
    throw new Error("El dashboard del voluntariado no tiene el formato esperado.");
  }
  const volunteer = parseManagedVolunteer(rawVolunteer);
  const rawPlace = rawVolunteer.lugar;
  const place = isRecord(rawPlace)
    && typeof rawPlace.nombre === "string"
    && typeof rawPlace.municipio === "string"
    ? {
      nombre: rawPlace.nombre,
      municipio: rawPlace.municipio,
      direccion: typeof rawPlace.direccion === "string"
        ? rawPlace.direccion
        : null,
    }
    : null;

  return {
    volunteer: { ...volunteer, lugar: place },
    statistics: {
      inscritos: asNumber(rawStats.inscritos, "inscritos"),
      cupo: asNumber(rawStats.cupo, "cupo"),
      disponibles: asNumber(rawStats.disponibles, "disponibles"),
      ocupacion: asNumber(rawStats.ocupacion, "ocupación"),
      asistencias: asNumber(rawStats.asistencias, "asistencias"),
      porcentajeAsistencia: asNumber(rawStats.porcentajeAsistencia, "porcentaje de asistencia"),
      pendientes: asNumber(rawStats.pendientes, "asistencias pendientes"),
      canceladas: asNumber(rawStats.canceladas, "cancelaciones"),
      registrosQr: asNumber(rawStats.registrosQr, "registros QR"),
    },
    participants: rawParticipants.map((item, index) => {
      if (!isRecord(item) || typeof item.id !== "string" || typeof item.usuarioId !== "string"
        || typeof item.estadoInscripcion !== "string") {
        throw new Error(`El participante ${index + 1} tiene un formato inesperado.`);
      }
      const attendance = isRecord(item.asistencia) && typeof item.asistencia.confirmada === "boolean"
        ? {
          confirmada: item.asistencia.confirmada,
          fecha: typeof item.asistencia.fecha === "string" ? item.asistencia.fecha : null,
          hora: typeof item.asistencia.hora === "string" ? item.asistencia.hora : null,
          metodo: typeof item.asistencia.metodo === "string" ? item.asistencia.metodo : null,
        }
        : null;
      return {
        id: item.id,
        usuarioId: item.usuarioId,
        nombre: typeof item.nombre === "string" ? item.nombre : null,
        correo: typeof item.correo === "string" ? item.correo : null,
        estadoInscripcion: item.estadoInscripcion,
        asistencia: attendance,
      };
    }),
  };
}
