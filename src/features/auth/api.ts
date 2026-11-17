import { ApiRequestError, requestApiJson, type ApiFieldErrors } from "../api-client.ts";
import type { ProfileDetails, ProfilePayload, TutorDetails } from "./profile.ts";

export type AuthUser = {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  estado: string;
  foto: string | null;
  organizadorVerificado: boolean | null;
  fechaRegistro: string | null;
  perfilCompleto: boolean | null;
  avatarConfig: Record<string, string> | null;
  details: ProfileDetails | null;
};

export type AuthResult = {
  token: string;
  user: AuthUser;
};

export class AuthenticationError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly fieldErrors: ApiFieldErrors;

  constructor(
    message: string,
    status: number,
    details: { code?: string | null; fieldErrors?: ApiFieldErrors } = {},
  ) {
    super(message);
    this.name = "AuthenticationError";
    this.status = status;
    this.code = details.code ?? null;
    this.fieldErrors = details.fieldErrors ?? {};
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
    perfilCompleto: typeof value.perfilCompleto === "boolean" ? value.perfilCompleto : null,
    avatarConfig: parseAvatarConfig(value.avatarConfig),
    details: includeProfileFields ? parseProfileDetails(value) : null,
  };
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function parseAvatarConfig(value: unknown): Record<string, string> | null {
  if (!isRecord(value)) return null;
  const config: Record<string, string> = {};
  for (const [key, option] of Object.entries(value)) {
    if (typeof option === "string") config[key] = option;
  }
  return Object.keys(config).length > 0 ? config : null;
}

function parseTutor(value: unknown): TutorDetails | null {
  if (!isRecord(value)) return null;
  return {
    nombre: nullableString(value.nombre),
    correo: nullableString(value.correo),
    telefono: nullableString(value.telefono),
    fechaNacimiento: nullableString(value.fechaNacimiento),
    autorizacion: value.autorizacion === true,
  };
}

function parseProfileDetails(value: Record<string, unknown>): ProfileDetails | null {
  const known = ["correoSecundario", "ciudad", "genero", "fechaNacimiento", "privacidad"];
  if (!known.some((key) => key in value)) return null;

  return {
    correoSecundario: nullableString(value.correoSecundario),
    telefono: nullableString(value.telefono),
    descripcion: nullableString(value.descripcion),
    ciudad: nullableString(value.ciudad),
    fechaNacimiento: nullableString(value.fechaNacimiento)?.slice(0, 10) ?? null,
    genero: nullableString(value.genero),
    generoOtro: nullableString(value.generoOtro),
    organizacion: nullableString(value.organizacion),
    enlacesSociales: Array.isArray(value.enlacesSociales)
      ? value.enlacesSociales.filter((item): item is string => typeof item === "string")
      : [],
    privacidad: value.privacidad === true,
    tutor: parseTutor(value.tutor),
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
    throw new AuthenticationError(error.message, error.status, {
      code: error.code,
      fieldErrors: error.fieldErrors,
    });
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
  profile: ProfilePayload,
): Promise<AuthResult> {
  try {
    const body = await requestApiJson("/api/auth/register", {
      method: "POST",
      body: {
        nombre,
        correo,
        password,
        password_confirmation: passwordConfirmation,
        ...profile,
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
