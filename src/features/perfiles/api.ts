import { requestApiJson, resolveApiAssetUrl } from "../api-client.ts";

export type PublicMedal = {
  slug: string;
  nombre: string;
  descripcion: string;
  icono: string;
  fechaObtencion: string | null;
};

export type PublicProfile = {
  id: string;
  nombre: string;
  foto: string | null;
  medallas: PublicMedal[];
  // Present only when the API considers the profile public.
  descripcion: string | null;
  organizacion: string | null;
  enlacesSociales: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parsePublicProfile(body: unknown): PublicProfile {
  const data = isRecord(body) && body.success === true && isRecord(body.data) ? body.data : null;
  const id = data ? text(data.id) : null;
  const nombre = data ? text(data.nombre) : null;
  if (!data || !id || !nombre) throw new Error("La API devolvió un perfil público inválido.");

  const medals = Array.isArray(data.medallas) ? data.medallas : [];
  return {
    id,
    nombre,
    foto: resolveApiAssetUrl(text(data.foto)),
    medallas: medals.flatMap((item): PublicMedal[] => {
      if (!isRecord(item)) return [];
      const slug = text(item.slug);
      if (!slug) return [];
      return [{
        slug,
        nombre: text(item.nombre) ?? slug,
        descripcion: text(item.descripcion) ?? "",
        icono: text(item.icono) ?? "award",
        fechaObtencion: text(item.fechaObtencion),
      }];
    }),
    descripcion: text(data.descripcion),
    organizacion: text(data.organizacion),
    enlacesSociales: Array.isArray(data.enlacesSociales)
      ? data.enlacesSociales.flatMap((link): string[] => {
        const value = text(link);
        return value ? [value] : [];
      })
      : [],
  };
}

export async function fetchPublicProfile(
  id: string,
  token: string | null,
  signal?: AbortSignal,
): Promise<PublicProfile> {
  const body = await requestApiJson(`/api/perfiles/${encodeURIComponent(id)}`, {
    signal,
    ...(token ? { token } : {}),
  });
  return parsePublicProfile(body);
}
