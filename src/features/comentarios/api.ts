import { requestApiJson, resolveApiAssetUrl } from "../api-client.ts";

export type CommentAuthor = {
  nombre: string | null;
  rol: string | null;
  foto: string | null;
};

export type VolunteerComment = {
  id: string;
  parentId: string | null;
  contenido: string;
  esPrivado: boolean;
  esPublicado: boolean;
  createdAt: string | null;
  autor: CommentAuthor;
  puedeModerar: boolean;
  puedePublicar: boolean;
  puedeEliminar: boolean;
};

export function canCreateCommentForRole(role: string | null | undefined): boolean {
  return role === "usuario" || role === "organizador" || role === "admin";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullableString(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new Error(`El comentario no contiene ${field} válido.`);
  }
  return value;
}

export function parseVolunteerComment(value: unknown): VolunteerComment {
  if (
    !isRecord(value)
    || typeof value.id !== "string"
    || typeof value.contenido !== "string"
    || typeof value.es_privado !== "boolean"
    || typeof value.es_publicado !== "boolean"
    || (value.parent_id !== null && typeof value.parent_id !== "string")
    || !isRecord(value.autor)
    || typeof value.puede_moderar !== "boolean"
    || typeof value.puede_publicar !== "boolean"
    || typeof value.puede_eliminar !== "boolean"
  ) {
    throw new Error("Un comentario tiene un formato inesperado.");
  }

  const authorPhoto = nullableString(value.autor.foto, "la foto del autor");

  return {
    id: value.id,
    parentId: value.parent_id,
    contenido: value.contenido,
    esPrivado: value.es_privado,
    esPublicado: value.es_publicado,
    createdAt: nullableString(value.created_at, "la fecha de creación"),
    autor: {
      nombre: nullableString(value.autor.nombre, "el nombre del autor"),
      rol: nullableString(value.autor.rol, "el rol del autor"),
      foto: resolveApiAssetUrl(authorPhoto),
    },
    puedeModerar: value.puede_moderar,
    puedePublicar: value.puede_publicar,
    puedeEliminar: value.puede_eliminar,
  };
}

export function parseVolunteerComments(value: unknown): VolunteerComment[] {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new Error("La lista de comentarios tiene un formato inesperado.");
  }
  return value.data.map(parseVolunteerComment);
}

function parseCommentAction(value: unknown): VolunteerComment {
  if (!isRecord(value) || !("data" in value)) {
    throw new Error("La API no confirmó el comentario.");
  }
  return parseVolunteerComment(value.data);
}

export async function fetchVolunteerComments(
  token: string,
  volunteerId: string,
  signal?: AbortSignal,
): Promise<VolunteerComment[]> {
  const path = `/api/voluntariados/${encodeURIComponent(volunteerId)}/comentarios`;
  return parseVolunteerComments(await requestApiJson(path, { token, signal }));
}

export async function createVolunteerComment(
  token: string,
  volunteerId: string,
  contenido: string,
  esPrivado: boolean,
): Promise<VolunteerComment> {
  const path = `/api/voluntariados/${encodeURIComponent(volunteerId)}/comentarios`;
  const result = await requestApiJson(path, {
    method: "POST",
    token,
    body: { contenido, es_privado: esPrivado },
  });
  return parseCommentAction(result);
}

export async function replyToVolunteerComment(
  token: string,
  commentId: string,
  contenido: string,
): Promise<VolunteerComment> {
  const result = await requestApiJson(
    `/api/comentarios/${encodeURIComponent(commentId)}/responder`,
    { method: "POST", token, body: { contenido } },
  );
  return parseCommentAction(result);
}

export async function updateVolunteerCommentVisibility(
  token: string,
  commentId: string,
  esPublicado: boolean,
): Promise<VolunteerComment> {
  const result = await requestApiJson(
    `/api/comentarios/${encodeURIComponent(commentId)}/visibilidad`,
    { method: "PATCH", token, body: { es_publicado: esPublicado } },
  );
  return parseCommentAction(result);
}

export async function publishVolunteerComment(
  token: string,
  commentId: string,
): Promise<VolunteerComment> {
  const result = await requestApiJson(
    `/api/comentarios/${encodeURIComponent(commentId)}/publicar`,
    { method: "PATCH", token, body: {} },
  );
  return parseCommentAction(result);
}

export async function deleteVolunteerComment(token: string, commentId: string): Promise<void> {
  const result = await requestApiJson(
    `/api/comentarios/${encodeURIComponent(commentId)}`,
    { method: "DELETE", token },
  );
  if (!isRecord(result) || typeof result.message !== "string") {
    throw new Error("La API no confirmó la eliminación del comentario.");
  }
}
