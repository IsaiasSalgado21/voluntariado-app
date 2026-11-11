import { requestApiJson } from "../api-client.ts";

export type AdminUser = {
  id: string;
  nombre: string;
  correo: string;
  foto: string | null;
  rol: "usuario" | "organizador" | "admin";
  estado: "activo" | "inactivo";
  organizadorVerificado: boolean;
  fechaRegistro: string | null;
};

export type AdminContentItem = {
  id: string;
  tipo: "voluntariado" | "articulo" | "flora-fauna" | "lugar";
  titulo: string;
  detalle: string;
  estado: string;
  imagen: string | null;
};

export type AuditItem = {
  id: string;
  accion: string;
  entidad: string;
  entidadId: string;
  usuarioId: string;
  fecha: string | null;
  cambios: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseUser(value: unknown): AdminUser {
  const id = isRecord(value)
    ? typeof value.id === "string"
      ? value.id
      : value._id
    : undefined;
  if (!isRecord(value) || typeof id !== "string" || typeof value.nombre !== "string"
    || typeof value.correo !== "string" || !["usuario", "organizador", "admin"].includes(String(value.rol))
    || !["activo", "inactivo"].includes(String(value.estado))
    || typeof value.organizadorVerificado !== "boolean") {
    throw new Error("El perfil de usuario administrable tiene un formato inesperado.");
  }
  return {
    id,
    nombre: value.nombre,
    correo: value.correo,
    foto: typeof value.foto === "string" ? value.foto : null,
    rol: value.rol as AdminUser["rol"],
    estado: value.estado as AdminUser["estado"],
    organizadorVerificado: value.organizadorVerificado,
    fechaRegistro: typeof value.fechaRegistro === "string" ? value.fechaRegistro : null,
  };
}

function parseContent(
  value: unknown,
  type: AdminContentItem["tipo"],
): AdminContentItem {
  if (!isRecord(value) || typeof value.id !== "string") {
    throw new Error("El contenido de moderación tiene un formato inesperado.");
  }
  const title = value.titulo ?? value.nombre;
  if (typeof title !== "string") throw new Error("El contenido no tiene un título.");
  return {
    id: value.id,
    tipo: type,
    titulo: title,
    detalle: [
      typeof value.categoria === "string" ? value.categoria : null,
      typeof value.municipio === "string" ? value.municipio : null,
      typeof value.descripcion === "string" ? value.descripcion : null,
      typeof value.contenido === "string" ? value.contenido : null,
    ].filter(Boolean).join(" · "),
    estado: typeof value.estado === "string" ? value.estado : "sin estado",
    imagen: typeof value.imagen === "string" ? value.imagen : null,
  };
}

export async function fetchAdminUsers(token: string, signal?: AbortSignal): Promise<AdminUser[]> {
  const result = await requestApiJson("/api/admin/usuarios", { token, signal });
  if (!isRecord(result) || !Array.isArray(result.data)) throw new Error("La lista de usuarios no tiene el formato esperado.");
  return result.data.map(parseUser);
}

export type AdminUserInput = {
  nombre: string;
  correo: string;
  rol: AdminUser["rol"];
  estado: AdminUser["estado"];
  organizadorVerificado: boolean;
  password?: string;
};

export async function saveAdminUser(
  token: string,
  input: AdminUserInput,
  id?: string,
): Promise<AdminUser> {
  const result = await requestApiJson(
    id ? `/api/admin/usuarios/${encodeURIComponent(id)}` : "/api/admin/usuarios",
    { method: id ? "PUT" : "POST", token, body: input },
  );
  if (!isRecord(result) || !("data" in result)) throw new Error("La API no confirmó el guardado del usuario.");
  return parseUser(result.data);
}

export async function deleteAdminUser(token: string, id: string): Promise<void> {
  const result = await requestApiJson(`/api/admin/usuarios/${encodeURIComponent(id)}`, {
    method: "DELETE",
    token,
  });
  if (!isRecord(result) || result.success !== true) throw new Error("La API no confirmó la eliminación del usuario.");
}

export async function fetchModerationQueue(
  token: string,
  type: AdminContentItem["tipo"],
  signal?: AbortSignal,
): Promise<AdminContentItem[]> {
  const paths: Record<AdminContentItem["tipo"], string> = {
    voluntariado: "/api/admin/voluntariados",
    articulo: "/api/admin/articulos/pendientes",
    "flora-fauna": "/api/admin/flora-fauna",
    lugar: "/api/admin/lugares",
  };
  const result = await requestApiJson(paths[type], { token, signal });
  if (!isRecord(result) || !Array.isArray(result.data)) throw new Error("La cola de revisión no tiene el formato esperado.");
  return result.data
    .map((item) => parseContent(item, type))
    .filter((item) => type === "voluntariado"
      ? item.estado === "pendiente"
      : type === "articulo"
        ? item.estado === "pendiente"
        : type === "flora-fauna" || type === "lugar"
          ? true
          : false);
}

export async function reviewContent(
  token: string,
  item: AdminContentItem,
  action: "approve" | "reject" | "archive",
  reason?: string,
): Promise<void> {
  if (item.tipo === "flora-fauna" || item.tipo === "lugar") {
    const publishedState = item.tipo === "lugar" ? "activo" : "publicado";
    if (action === "approve" && item.estado !== "archivado") {
      throw new Error("Solo se pueden publicar registros archivados.");
    }
    if (action !== "approve" && item.estado !== publishedState) {
      throw new Error("Solo se pueden archivar registros publicados o activos.");
    }
  }
  const route = item.tipo === "voluntariado"
    ? `/api/admin/voluntariados/${encodeURIComponent(item.id)}/${action === "approve" ? "aprobar" : "rechazar"}`
    : item.tipo === "articulo"
      ? `/api/admin/articulos/${encodeURIComponent(item.id)}/${action === "approve" ? "aprobar" : "rechazar"}`
      : item.tipo === "flora-fauna"
        ? `/api/admin/flora-fauna/${encodeURIComponent(item.id)}/${action === "approve" ? "publicar" : "archivar"}`
        : `/api/admin/lugares/${encodeURIComponent(item.id)}/${action === "approve" ? "publicar" : "archivar"}`;
  const result = await requestApiJson(route, {
    method: "PATCH",
    token,
    ...(action === "reject" ? { body: { motivo: reason } } : {}),
  });
  if (!isRecord(result) || !("data" in result)) throw new Error("La API no confirmó la acción de moderación.");
}

export async function fetchAuditLog(token: string, signal?: AbortSignal): Promise<AuditItem[]> {
  const result = await requestApiJson("/api/admin/auditoria", { token, signal });
  if (!isRecord(result) || !Array.isArray(result.auditoria)) throw new Error("La respuesta de auditoría no tiene el formato esperado.");
  return result.auditoria.map((item, index) => {
    if (!isRecord(item)) throw new Error(`El registro de auditoría ${index + 1} tiene un formato inesperado.`);
    const id = typeof item.id === "string" ? item.id : item._id;
    if (typeof id !== "string") throw new Error(`El registro de auditoría ${index + 1} no tiene id.`);
    return {
      id,
      accion: typeof item.accion === "string" ? item.accion : "acción",
      entidad: typeof item.entidad === "string" ? item.entidad : "entidad",
      entidadId: typeof item.entidadId === "string" ? item.entidadId : "",
      usuarioId: typeof item.usuarioId === "string" ? item.usuarioId : "",
      fecha: typeof item.fecha === "string" ? item.fecha : null,
      cambios: item.cambios,
    };
  });
}

export async function fetchAuditDetail(token: string, id: string): Promise<AuditItem> {
  const result = await requestApiJson(`/api/admin/auditoria/${encodeURIComponent(id)}`, { token });
  if (!isRecord(result) || !isRecord(result.auditoria)) throw new Error("El detalle de auditoría no tiene el formato esperado.");
  const data = result.auditoria;
  return {
    id: typeof data.id === "string" ? data.id : typeof data._id === "string" ? data._id : id,
    accion: typeof data.accion === "string" ? data.accion : "acción",
    entidad: typeof data.entidad === "string" ? data.entidad : "entidad",
    entidadId: typeof data.entidadId === "string" ? data.entidadId : "",
    usuarioId: typeof data.usuarioId === "string" ? data.usuarioId : "",
    fecha: typeof data.fecha === "string" ? data.fecha : null,
    cambios: data.cambios,
  };
}
