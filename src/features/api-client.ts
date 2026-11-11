function apiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_REGENERA_API_URL?.trim();
  if (!configured) {
    throw new Error(
      "Falta configurar EXPO_PUBLIC_REGENERA_API_URL. Define la URL base de la API en el archivo .env y reinicia Expo.",
    );
  }

  return configured.replace(/\/+$/, "");
}

export function resolveApiAssetUrl(value: string | null | undefined): string | null {
  const assetUrl = value?.trim();
  if (!assetUrl) return null;

  try {
    const base = new URL(apiBaseUrl());
    const resolved = new URL(assetUrl, base);
    if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(resolved.hostname)) {
      resolved.protocol = base.protocol;
      resolved.host = base.host;
    }
    return resolved.toString();
  } catch {
    return null;
  }
}

export class ApiRequestError extends Error {
  readonly status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export type ApiRequestOptions = {
  signal?: AbortSignal;
  token?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

export async function requestApiJson(
  path: string,
  options: ApiRequestOptions = {},
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      signal: options.signal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new Error("No pudimos conectar con la API. Revisa la URL y la conexión de red.");
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(`La API devolvió una respuesta inválida (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    const message = isRecord(body) && typeof body.message === "string"
      ? body.message
      : `La API respondió con un error (HTTP ${response.status}).`;
    throw new ApiRequestError(message, response.status);
  }

  return body;
}

export function fetchApiJson(
  path: string,
  signal?: AbortSignal,
): Promise<unknown> {
  return requestApiJson(path, { signal });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
