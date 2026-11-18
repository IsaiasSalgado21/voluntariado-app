import { requestApiJson, resolveApiAssetUrl } from "../api-client.ts";
import { isCommentsDefault, type CommentsDefault } from "../voluntariados/api.ts";

export type AttendanceCorrectionRequest = {
  id: string;
  estado: "pendiente" | "aceptando" | "aceptada" | "rechazada";
  motivoRespuesta: string | null;
};

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
  iniciadoPorFecha: boolean;
  tokenAsistencia: string | null;
  codigoCorto: string | null;
  codigoAsistenciaActivo: boolean;
};

export type VolunteerFormValues = Omit<
  ManagedVolunteer,
  | "id"
  | "organizadorId"
  | "estado"
  | "iniciadoPorFecha"
  | "tokenAsistencia"
  | "codigoCorto"
  | "codigoAsistenciaActivo"
> & { organizadorId?: string };

export type OrganizerOption = {
  id: string;
  nombre: string;
  correo: string;
};

export type ManagedPlaceOption = {
  id: string;
  nombre: string;
  municipio: string;
  descripcion: string;
};

export type VolunteerCategoryOption = {
  value: string;
  label: string;
};

export type VolunteerDashboard = {
  volunteer: ManagedVolunteer & {
    finalizadoPorFecha: boolean;
    cancelado: boolean;
    lugar: { nombre: string; municipio: string; direccion: string | null } | null;
  };
  statistics: {
    inscritos: number;
    cupo: number;
    disponibles: number;
    ocupacion: number;
    asistencias: number;
    porcentajeAsistencia: number;
    pendientes: number;
    faltas: number;
    canceladas: number;
    registrosQr: number;
  };
  participants: Array<{
    id: string;
    usuarioId: string;
    nombre: string | null;
    correo: string | null;
    foto: string | null;
    estadoInscripcion: string;
    falto: boolean;
    solicitudAsistencia: AttendanceCorrectionRequest | null;
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

export function parseManagedVolunteer(value: unknown): ManagedVolunteer {
  if (
    !isRecord(value)
    || typeof value.cupo !== "number"
    || typeof value.iniciadoPorFecha !== "boolean"
    || (value.categoria !== undefined
      && value.categoria !== null
      && typeof value.categoria !== "string")
    || (value.codigoCorto !== undefined
      && value.codigoCorto !== null
      && typeof value.codigoCorto !== "string")
  ) {
    throw new Error("La respuesta de voluntariado administrado no tiene el formato esperado.");
  }
  const stringArray = (input: unknown) => Array.isArray(input)
    ? input.filter((item): item is string => typeof item === "string")
    : [];
  return {
    id: asString(value.id, "id"),
    titulo: asString(value.titulo, "título"),
    descripcion: asString(value.descripcion, "descripción"),
    categoria: typeof value.categoria === "string" ? value.categoria.trim() : "",
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
    iniciadoPorFecha: value.iniciadoPorFecha,
    tokenAsistencia: typeof value.tokenAsistencia === "string" ? value.tokenAsistencia : null,
    codigoCorto: typeof value.codigoCorto === "string" ? value.codigoCorto : null,
    codigoAsistenciaActivo: typeof value.codigoAsistenciaActivo === "boolean"
      ? value.codigoAsistenciaActivo
      : true,
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

export async function fetchManagedCommentsDefault(
  token: string,
  id: string,
  signal?: AbortSignal,
): Promise<CommentsDefault> {
  const result = await requestApiJson(
    `/api/voluntariados/${encodeURIComponent(id)}`,
    { token, signal },
  );
  if (!isRecord(result) || !isRecord(result.voluntariado)) {
    throw new Error("La configuración de comentarios no tiene el formato esperado.");
  }
  const value = result.voluntariado.comentarios_por_defecto;
  if (value === undefined || value === null) return "publico";
  if (!isCommentsDefault(value)) {
    throw new Error("La configuración de comentarios contiene una opción no válida.");
  }
  return value;
}

export async function updateManagedCommentsDefault(
  token: string,
  id: string,
  commentsDefault: CommentsDefault,
): Promise<CommentsDefault> {
  const result = await requestApiJson(
    `/api/voluntariados/${encodeURIComponent(id)}/config-comentarios`,
    {
      method: "PATCH",
      token,
      body: { comentarios_por_defecto: commentsDefault },
    },
  );
  if (!isRecord(result) || !isRecord(result.data)) {
    throw new Error("La API no confirmó la configuración de comentarios.");
  }
  const value = result.data.comentarios_por_defecto;
  if (typeof result.data.voluntariado_id !== "string" || !isCommentsDefault(value)) {
    throw new Error("La configuración de comentarios devuelta por la API no es válida.");
  }
  return value;
}

export async function fetchManagedPlaceOptions(token: string, signal?: AbortSignal): Promise<ManagedPlaceOption[]> {
  return parseManagedPlaceOptions(await requestApiJson("/api/lugares", { token, signal }));
}

export function parseManagedPlaceOptions(result: unknown): ManagedPlaceOption[] {
  if (!isRecord(result)) throw new Error("La lista de lugares no tiene el formato esperado.");
  const places = Array.isArray(result.data) ? result.data : result.lugares;
  if (!Array.isArray(places)) throw new Error("La lista de lugares no tiene el formato esperado.");
  return places.map((place, index) => {
    if (!isRecord(place)) throw new Error(`El lugar ${index + 1} tiene un formato inesperado.`);
    const id = place.id ?? place._id ?? place.lugares_id;
    if (typeof id !== "string" && typeof id !== "number") {
      throw new Error(`El lugar ${index + 1} no contiene un identificador válido.`);
    }
    if (typeof place.nombre !== "string") {
      throw new Error(`El lugar ${index + 1} no contiene un nombre válido.`);
    }
    return {
      id: String(id),
      nombre: place.nombre,
      municipio: typeof place.municipio === "string" ? place.municipio : "",
      descripcion: typeof place.descripcion === "string" ? place.descripcion : "",
    };
  });
}

export async function fetchVolunteerCategoryOptions(signal?: AbortSignal): Promise<VolunteerCategoryOption[]> {
  return parseVolunteerCategoryOptions(await requestApiJson("/api/voluntariados/categorias", { signal }));
}

export function parseVolunteerCategoryOptions(result: unknown): VolunteerCategoryOption[] {
  if (!isRecord(result) || !Array.isArray(result.categorias)) {
    throw new Error("La lista de categorías no tiene el formato esperado.");
  }
  return result.categorias.map((category, index) => {
    if (typeof category !== "string" || category.trim() === "") {
      throw new Error(`La categoría ${index + 1} tiene un formato inesperado.`);
    }
    return { value: category, label: formatCategoryLabel(category) };
  });
}

export function normalizeCategory(value: string): string {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
}

function formatCategoryLabel(value: string): string {
  const labels: Record<string, string> = {
    "limpieza-de-playas": "Limpieza de playas",
    limpieza: "Limpieza",
    reforestacion: "Reforestación",
    restauracion: "Restauración",
    conservacion: "Conservación",
    monitoreo: "Monitoreo",
    "educacion-ambiental": "Educación ambiental",
  };
  return labels[value.toLocaleLowerCase()] ?? value.replace(/[-_]/g, " ")
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());
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

export async function deleteManagedVolunteer(token: string, id: string): Promise<void> {
  const result = await requestApiJson(
    `/api/admin/voluntariados/${encodeURIComponent(id)}`,
    { method: "DELETE", token },
  );
  if (!isRecord(result) || !isRecord(result.data) || result.data.id !== id) {
    throw new Error("La API no confirmó la eliminación del voluntariado.");
  }
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
  if (
    !isRecord(rawStats)
    || !isRecord(rawVolunteer)
    || typeof rawVolunteer.finalizadoPorFecha !== "boolean"
    || typeof rawVolunteer.cancelado !== "boolean"
    || !Array.isArray(rawParticipants)
  ) {
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
    volunteer: {
      ...volunteer,
      finalizadoPorFecha: rawVolunteer.finalizadoPorFecha,
      cancelado: rawVolunteer.cancelado,
      lugar: place,
    },
    statistics: {
      inscritos: asNumber(rawStats.inscritos, "inscritos"),
      cupo: asNumber(rawStats.cupo, "cupo"),
      disponibles: asNumber(rawStats.disponibles, "disponibles"),
      ocupacion: asNumber(rawStats.ocupacion, "ocupación"),
      asistencias: asNumber(rawStats.asistencias, "asistencias"),
      porcentajeAsistencia: asNumber(rawStats.porcentajeAsistencia, "porcentaje de asistencia"),
      pendientes: asNumber(rawStats.pendientes, "asistencias pendientes"),
      faltas: asNumber(rawStats.faltas, "faltas"),
      canceladas: asNumber(rawStats.canceladas, "cancelaciones"),
      registrosQr: asNumber(rawStats.registrosQr, "registros QR"),
    },
    participants: rawParticipants.map((item, index) => {
      if (!isRecord(item) || typeof item.id !== "string" || typeof item.usuarioId !== "string"
        || typeof item.estadoInscripcion !== "string" || typeof item.falto !== "boolean"
        || (item.foto !== undefined && item.foto !== null && typeof item.foto !== "string")) {
        throw new Error(`El participante ${index + 1} tiene un formato inesperado.`);
      }
      const attendanceRequest = item.solicitudAsistencia === undefined || item.solicitudAsistencia === null
        ? null
        : parseAttendanceCorrectionRequest(item.solicitudAsistencia, index);
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
        foto: resolveApiAssetUrl(typeof item.foto === "string" ? item.foto : null),
        estadoInscripcion: item.estadoInscripcion,
        falto: item.falto,
        solicitudAsistencia: attendanceRequest,
        asistencia: attendance,
      };
    }),
  };
}

function parseAttendanceCorrectionRequest(value: unknown, index: number): AttendanceCorrectionRequest {
  if (
    !isRecord(value)
    || typeof value.id !== "string"
    || !isAttendanceCorrectionState(value.estado)
    || (value.motivoRespuesta !== undefined
      && value.motivoRespuesta !== null
      && typeof value.motivoRespuesta !== "string")
  ) {
    throw new Error(`La solicitud de asistencia del participante ${index + 1} tiene un formato inesperado.`);
  }
  return {
    id: value.id,
    estado: value.estado,
    motivoRespuesta: typeof value.motivoRespuesta === "string" ? value.motivoRespuesta : null,
  };
}

function isAttendanceCorrectionState(
  value: unknown,
): value is AttendanceCorrectionRequest["estado"] {
  return value === "pendiente"
    || value === "aceptando"
    || value === "aceptada"
    || value === "rechazada";
}
