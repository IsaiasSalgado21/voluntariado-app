import { fetchApiJson } from "../api-client.ts";

export type Article = {
  id: string;
  titulo: string;
  contenido: string;
  imagen: string | null;
  imagenes: string[];
  categoria: string;
  autorNombre: string | null;
  fechaPublicacion: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function parseArticle(value: unknown, index = 0): Article {
  if (
    !isRecord(value)
    || typeof value.id !== "string"
    || typeof value.titulo !== "string"
    || typeof value.contenido !== "string"
    || !nullableString(value.imagen)
    || !Array.isArray(value.imagenes)
    || !value.imagenes.every((image) => typeof image === "string")
    || typeof value.categoria !== "string"
    || !nullableString(value.autorNombre)
    || !nullableString(value.fechaPublicacion)
    || value.estado !== "publicado"
  ) {
    throw new Error(`El artículo ${index + 1} tiene un formato inesperado o no está publicado.`);
  }

  const images = value.imagenes as string[];
  return {
    id: value.id,
    titulo: value.titulo,
    contenido: value.contenido,
    imagen: value.imagen ?? images[0] ?? null,
    imagenes: images,
    categoria: value.categoria,
    autorNombre: value.autorNombre,
    fechaPublicacion: value.fechaPublicacion,
  };
}

export function parseArticleList(data: unknown): Article[] {
  if (!Array.isArray(data)) {
    throw new Error("La respuesta de artículos no contiene una lista válida.");
  }

  return data.map((value, index) => parseArticle(value, index));
}

export async function fetchArticles(signal?: AbortSignal): Promise<Article[]> {
  const body = await fetchApiJson("/api/articulos", signal);
  if (!isRecord(body) || !Array.isArray(body.data)) {
    throw new Error("La respuesta de la API no coincide con el contrato de artículos.");
  }

  return parseArticleList(body.data);
}

export async function fetchArticle(id: string, signal?: AbortSignal): Promise<Article> {
  const body = await fetchApiJson(`/api/articulos/${encodeURIComponent(id)}`, signal);
  if (!isRecord(body) || !("data" in body)) {
    throw new Error("La respuesta de la API no coincide con el contrato del artículo.");
  }

  return parseArticle(body.data);
}
