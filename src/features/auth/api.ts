import { ApiRequestError, requestApiJson } from "../api-client.ts";

export type AuthUser = {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  estado: string;
  foto: string | null;
  organizadorVerificado: boolean | null;
  fechaRegistro: string | null;
};

export type AuthResult = {
  token: string;
  user: AuthUser;
};

export class AuthenticationError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthenticationError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === "string";
}

function parseUser(value: unknown, includeProfileFields: boolean): AuthUser {
  if (
    !isRecord(value)
    || typeof value.id !== "string"
    || typeof value.nombre !== "string"
    || typeof value.correo !== "string"
    || typeof value.rol !== "string"
    || typeof value.estado !== "string"
    || (includeProfileFields && !isNullableString(value.foto))
    || (includeProfileFields && typeof value.organizadorVerificado !== "boolean")
    || (includeProfileFields && !isNullableString(value.fechaRegistro))
  ) {
    throw new Error("La respuesta de autenticación no contiene un perfil válido.");
  }

  return {
    id: value.id,
    nombre: value.nombre,
    correo: value.correo,
    rol: value.rol,
    estado: value.estado,
    foto: typeof value.foto === "string" ? value.foto : null,
    organizadorVerificado: typeof value.organizadorVerificado === "boolean"
      ? value.organizadorVerificado
      : null,
    fechaRegistro: typeof value.fechaRegistro === "string" ? value.fechaRegistro : null,
  };
}

export function parseAuthResult(value: unknown): AuthResult {
  if (
    !isRecord(value)
    || value.success !== true
    || typeof value.token !== "string"
    || value.token.length === 0
    || !("usuario" in value)
  ) {
    throw new Error("La respuesta de autenticación no tiene el formato esperado.");
  }

  return {
    token: value.token,
    user: parseUser(value.usuario, false),
  };
}

export function parseProfileUser(value: unknown): AuthUser {
  return parseUser(value, true);
}

function throwAuthenticationError(error: unknown): never {
  if (error instanceof ApiRequestError) {
    throw new AuthenticationError(error.message, error.status);
  }
  throw error;
}

export async function login(correo: string, password: string): Promise<AuthResult> {
  try {
    const body = await requestApiJson("/api/auth/login", {
      method: "POST",
      body: { correo, password },
    });
    return parseAuthResult(body);
  } catch (error) {
    throwAuthenticationError(error);
  }
}

export async function register(
  nombre: string,
  correo: string,
  password: string,
  passwordConfirmation: string,
): Promise<AuthResult> {
  try {
    const body = await requestApiJson("/api/auth/register", {
      method: "POST",
      body: {
        nombre,
        correo,
        password,
        password_confirmation: passwordConfirmation,
      },
    });
    return parseAuthResult(body);
  } catch (error) {
    throwAuthenticationError(error);
  }
}

export async function fetchCurrentUser(token: string): Promise<AuthUser> {
  try {
    const body = await requestApiJson("/api/auth/me", { token });
    if (!isRecord(body) || body.success !== true || !("usuario" in body)) {
      throw new Error("La respuesta del perfil no tiene el formato esperado.");
    }

    return parseProfileUser(body.usuario);
  } catch (error) {
    throwAuthenticationError(error);
  }
}

export async function logout(token: string): Promise<void> {
  try {
    const body = await requestApiJson("/api/auth/logout", {
      method: "POST",
      token,
    });
    if (!isRecord(body) || body.success !== true) {
      throw new Error("La API no confirmó el cierre de sesión.");
    }
  } catch (error) {
    throwAuthenticationError(error);
  }
}
