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

export type AdminImageUpload = {
  uri: string;
  fileName: string | null;
  mimeType: string | null;
  file?: Blob;
};

export type AdminPlace = {
  id: string;
  nombre: string;
  descripcion: string;
  municipio: string;
  direccion: string;
  latitud: number | null;
  longitud: number | null;
  tipo: "playa" | "parque" | "reserva" | "zona_urbana" | "otro";
  imagen: string | null;
  estado: string;
  motivoRechazo: string | null;
};

export type AdminFloraFauna = {
  id: string;
  nombre: string;
  nombreCientifico: string;
  tipo: "flora" | "fauna";
  descripcion: string;
  habitat: string;
  estadoConservacion: string;
  estado: string;
  imagenes: string[];
  ubicacion: { nombre: string; latitud: number | null; longitud: number | null } | null;
  fuenteInformacion: string;
};

export type AdminArticle = {
  id: string;
  titulo: string;
  contenido: string;
  categoria: string;
  estado: string;
  imagenes: string[];
  motivoRechazo: string | null;
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

function getId(value: Record<string, unknown>): string | null {
  return typeof value.id === "string"
    ? value.id
    : typeof value._id === "string" ? value._id : null;
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseCoordinate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function parseImageList(value: unknown, fallback?: unknown): string[] {
  const images = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
  if (images.length > 0) return images;
  return typeof fallback === "string" ? [fallback] : [];
}

function parseAdminPlace(value: unknown): AdminPlace {
  const id = isRecord(value) ? getId(value) : null;
  if (!isRecord(value) || !id || typeof value.nombre !== "string"
    || typeof value.municipio !== "string"
    || !["playa", "parque", "reserva", "zona_urbana", "otro"].includes(String(value.tipo))
    || typeof value.estado !== "string") {
    throw new Error("Un lugar administrable tiene un formato inesperado.");
  }
  return {
    id,
    nombre: value.nombre,
    descripcion: typeof value.descripcion === "string" ? value.descripcion : "",
    municipio: value.municipio,
    direccion: typeof value.direccion === "string" ? value.direccion : "",
    latitud: parseCoordinate(value.latitud),
    longitud: parseCoordinate(value.longitud),
    tipo: value.tipo as AdminPlace["tipo"],
    imagen: nullableText(value.imagen),
    estado: value.estado,
    motivoRechazo: nullableText(value.motivoRechazo),
  };
}

function parseAdminFloraFauna(value: unknown): AdminFloraFauna {
  const id = isRecord(value) ? getId(value) : null;
  const location = isRecord(value) && isRecord(value.ubicacion) ? value.ubicacion : null;
  if (!isRecord(value) || !id || typeof value.nombre !== "string"
    || !["flora", "fauna"].includes(String(value.tipo))
    || typeof value.descripcion !== "string" || typeof value.estado !== "string") {
    throw new Error("Un registro de flora o fauna tiene un formato inesperado.");
  }
  return {
    id,
    nombre: value.nombre,
    nombreCientifico: typeof value.nombreCientifico === "string" ? value.nombreCientifico : "",
    tipo: value.tipo as AdminFloraFauna["tipo"],
    descripcion: value.descripcion,
    habitat: typeof value.habitat === "string" ? value.habitat : "",
    estadoConservacion: typeof value.estadoConservacion === "string" ? value.estadoConservacion : "",
    estado: value.estado,
    imagenes: parseImageList(value.imagenes),
    ubicacion: location ? {
      nombre: typeof location.nombre === "string" ? location.nombre : "",
      latitud: parseCoordinate(location.latitud),
      longitud: parseCoordinate(location.longitud),
    } : null,
    fuenteInformacion: typeof value.fuenteInformacion === "string" ? value.fuenteInformacion : "",
  };
}

function parseAdminArticle(value: unknown): AdminArticle {
  const id = isRecord(value) ? getId(value) : null;
  if (!isRecord(value) || !id || typeof value.titulo !== "string"
    || typeof value.contenido !== "string" || typeof value.categoria !== "string"
    || typeof value.estado !== "string") {
    throw new Error("Un artículo administrable tiene un formato inesperado.");
  }
  return {
    id,
    titulo: value.titulo,
    contenido: value.contenido,
    categoria: value.categoria,
    estado: value.estado,
    imagenes: parseImageList(value.imagenes, value.imagen),
    motivoRechazo: nullableText(value.motivoRechazo),
  };
}

function parseList(result: unknown, message: string): unknown[] {
  if (!isRecord(result) || !Array.isArray(result.data)) throw new Error(message);
  return result.data;
}

function parseSavedData(result: unknown, message: string): unknown {
  if (!isRecord(result) || !("data" in result)) throw new Error(message);
  return result.data;
}

function appendUpload(formData: FormData, key: string, image: AdminImageUpload): void {
  const name = image.fileName?.trim() || `imagen-${Date.now()}.jpg`;
  const type = image.mimeType || "image/jpeg";
  if (image.file) {
    formData.append(key, image.file, name);
    return;
  }
  formData.append(key, { uri: image.uri, name, type } as unknown as Blob);
}

function updateMethod(id?: string): FormData {
  const formData = new FormData();
  if (id) formData.append("_method", "PUT");
  return formData;
}

function appendPlaceFields(formData: FormData, input: AdminPlaceInput): void {
  formData.append("nombre", input.nombre);
  formData.append("descripcion", input.descripcion);
  formData.append("municipio", input.municipio);
  formData.append("direccion", input.direccion);
  formData.append("latitud", input.latitud);
  formData.append("longitud", input.longitud);
  formData.append("tipo", input.tipo);
}

export type AdminPlaceInput = {
  nombre: string;
  descripcion: string;
  municipio: string;
  direccion: string;
  latitud: string;
  longitud: string;
  tipo: AdminPlace["tipo"];
  imagen: AdminImageUpload | null;
  imagenEliminar: boolean;
};

export type AdminFloraFaunaInput = {
  nombre: string;
  nombreCientifico: string;
  tipo: AdminFloraFauna["tipo"];
  descripcion: string;
  habitat: string;
  estadoConservacion: string;
  ubicacionNombre: string;
  latitud: string;
  longitud: string;
  fuenteInformacion: string;
  imagenes: AdminImageUpload[];
  imagenesEliminar: number[];
};

export type AdminArticleInput = {
  titulo: string;
  contenido: string;
  categoria: string;
  imagenes: AdminImageUpload[];
  imagenesEliminar: number[];
};

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

export async function fetchAdminPlaces(token: string, signal?: AbortSignal): Promise<AdminPlace[]> {
  const result = await requestApiJson("/api/admin/lugares", { token, signal });
  return parseList(result, "La lista de lugares no tiene el formato esperado.").map(parseAdminPlace);
}

export async function saveAdminPlace(
  token: string,
  input: AdminPlaceInput,
  id?: string,
): Promise<AdminPlace> {
  const formData = updateMethod(id);
  appendPlaceFields(formData, input);
  if (input.imagen) appendUpload(formData, "imagen", input.imagen);
  else if (id && input.imagenEliminar) formData.append("imagenEliminar", "true");
  const result = await requestApiJson(
    id ? `/api/lugares/${encodeURIComponent(id)}` : "/api/lugares",
    { method: "POST", token, formData },
  );
  return parseAdminPlace(parseSavedData(result, "La API no confirmó el guardado del lugar."));
}

export async function fetchAdminFloraFauna(token: string, signal?: AbortSignal): Promise<AdminFloraFauna[]> {
  const result = await requestApiJson("/api/admin/flora-fauna", { token, signal });
  return parseList(result, "La lista de flora y fauna no tiene el formato esperado.").map(parseAdminFloraFauna);
}

export async function saveAdminFloraFauna(
  token: string,
  input: AdminFloraFaunaInput,
  id?: string,
): Promise<AdminFloraFauna> {
  const formData = updateMethod(id);
  formData.append("nombre", input.nombre);
  formData.append("nombreCientifico", input.nombreCientifico);
  formData.append("tipo", input.tipo);
  formData.append("descripcion", input.descripcion);
  formData.append("habitat", input.habitat);
  formData.append("estadoConservacion", input.estadoConservacion);
  formData.append("fuenteInformacion", input.fuenteInformacion);
  formData.append("ubicacion[nombre]", input.ubicacionNombre);
  formData.append("ubicacion[latitud]", input.latitud);
  formData.append("ubicacion[longitud]", input.longitud);
  for (const index of input.imagenesEliminar) formData.append("imagenesEliminar[]", String(index));
  for (const image of input.imagenes) appendUpload(formData, "imagenes[]", image);
  const result = await requestApiJson(
    id ? `/api/flora-fauna/${encodeURIComponent(id)}` : "/api/flora-fauna",
    { method: "POST", token, formData },
  );
  return parseAdminFloraFauna(parseSavedData(result, "La API no confirmó el guardado del registro."));
}

export async function fetchAdminArticles(token: string, signal?: AbortSignal): Promise<AdminArticle[]> {
  const result = await requestApiJson("/api/articulos", { token, signal });
  return parseList(result, "La lista de artículos no tiene el formato esperado.").map(parseAdminArticle);
}

export async function saveAdminArticle(
  token: string,
  input: AdminArticleInput,
  id?: string,
): Promise<AdminArticle> {
  const formData = updateMethod(id);
  formData.append("titulo", input.titulo);
  formData.append("contenido", input.contenido);
  formData.append("categoria", input.categoria);
  for (const index of input.imagenesEliminar) formData.append("imagenesEliminar[]", String(index));
  for (const image of input.imagenes) appendUpload(formData, "imagenes[]", image);
  const result = await requestApiJson(
    id ? `/api/articulos/${encodeURIComponent(id)}` : "/api/articulos",
    { method: "POST", token, formData },
  );
  return parseAdminArticle(parseSavedData(result, "La API no confirmó el guardado del artículo."));
}

export async function deleteAdminArticle(token: string, id: string): Promise<void> {
  const result = await requestApiJson(`/api/admin/articulos/${encodeURIComponent(id)}`, {
    method: "DELETE",
    token,
  });
  if (!isRecord(result) || !isRecord(result.data)) throw new Error("La API no confirmó la eliminación del artículo.");
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
  action: "approve" | "reject" | "archive" | "publish" | "unpublish",
  reason?: string,
): Promise<void> {
  let endpoint: string;
  if (item.tipo === "voluntariado") {
    if (!["approve", "reject"].includes(action)) throw new Error("La acción no es válida para un voluntariado.");
    endpoint = action === "approve" ? "aprobar" : "rechazar";
  } else if (item.tipo === "articulo") {
    const articleActions: Record<"approve" | "reject" | "publish" | "unpublish", string> = {
      approve: "aprobar",
      reject: "rechazar",
      publish: "publicar",
      unpublish: "despublicar",
    };
    if (!(action in articleActions)) throw new Error("La acción no es válida para un artículo.");
    if (action === "approve" || action === "reject") {
      if (item.estado !== "pendiente") throw new Error("Solo se pueden revisar artículos pendientes.");
    } else if (action === "publish" && item.estado !== "borrador") {
      throw new Error("Solo se pueden publicar artículos en borrador.");
    } else if (action === "unpublish" && item.estado !== "publicado") {
      throw new Error("Solo se pueden retirar artículos publicados.");
    }
    endpoint = articleActions[action as keyof typeof articleActions];
  } else if (item.tipo === "flora-fauna") {
    if (action === "approve" || action === "publish") {
      if (item.estado !== "archivado") throw new Error("Solo se pueden publicar registros archivados.");
      endpoint = "publicar";
    } else if (action === "archive") {
      if (item.estado !== "publicado") throw new Error("Solo se pueden archivar registros publicados.");
      endpoint = "archivar";
    } else {
      throw new Error("La acción no es válida para flora y fauna.");
    }
  } else if (item.tipo === "lugar" && action === "approve" && item.estado === "pendiente_de_aprobacion") {
    endpoint = "aprobar";
  } else if (item.tipo === "lugar" && action === "reject" && item.estado === "pendiente_de_aprobacion") {
    endpoint = "rechazar";
  } else if (item.tipo === "lugar" && (action === "approve" || action === "publish") && item.estado === "archivado") {
    endpoint = "publicar";
  } else if (item.tipo === "lugar" && action === "archive" && item.estado === "activo") {
    endpoint = "archivar";
  } else {
    throw new Error("La acción no está disponible para el estado actual del lugar.");
  }
  if (action === "reject" && !reason?.trim()) throw new Error("Escribe un motivo para rechazar el contenido.");
  const route = item.tipo === "voluntariado"
    ? `/api/admin/voluntariados/${encodeURIComponent(item.id)}/${endpoint}`
    : `/api/admin/${item.tipo === "flora-fauna" ? "flora-fauna" : item.tipo === "lugar" ? "lugares" : "articulos"}/${encodeURIComponent(item.id)}/${endpoint}`;
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
