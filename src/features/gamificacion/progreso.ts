import { requestApiJson } from "../api-client.ts";

// Slugs of the medals the account has unlocked; they gate the reward accessories.
export function parseEarnedMedalSlugs(body: unknown): string[] {
  const data = typeof body === "object" && body !== null ? (body as { data?: unknown }).data : null;
  const earned = typeof data === "object" && data !== null
    ? (data as { medallasObtenidas?: unknown }).medallasObtenidas
    : null;
  if (!Array.isArray(earned)) throw new Error("La API devolvió un progreso inválido.");

  return earned.flatMap((item): string[] => {
    if (typeof item !== "object" || item === null) return [];
    const { slug, desbloqueada } = item as { slug?: unknown; desbloqueada?: unknown };
    return typeof slug === "string" && slug && desbloqueada !== false ? [slug] : [];
  });
}

export async function fetchEarnedMedalSlugs(token: string, signal?: AbortSignal): Promise<string[]> {
  return parseEarnedMedalSlugs(await requestApiJson("/api/gamificacion/progreso", { token, signal }));
}
