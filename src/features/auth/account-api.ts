import { requestApiJson } from "../api-client.ts";
import type { ProfilePayload } from "./profile.ts";

export type AccountActionResult = { message: string };

export type AvatarFile = { uri: string; name: string; type: "image/png" };

function expectSuccess(body: unknown, fallback: string): AccountActionResult {
  if (
    typeof body !== "object"
    || body === null
    || (body as { success?: unknown }).success !== true
  ) {
    throw new Error("La API no confirmó la operación.");
  }
  const message = (body as { message?: unknown }).message;
  return { message: typeof message === "string" && message ? message : fallback };
}

export async function completeProfile(token: string, profile: ProfilePayload): Promise<AccountActionResult> {
  const body = await requestApiJson("/api/auth/completar-perfil", {
    method: "POST",
    token,
    body: profile,
  });
  return expectSuccess(body, "Datos guardados correctamente.");
}

export async function updateName(token: string, nombre: string): Promise<AccountActionResult> {
  const body = await requestApiJson("/api/auth/perfil", {
    method: "PATCH",
    token,
    body: { nombre },
  });
  return expectSuccess(body, "Nombre actualizado correctamente.");
}

// The API keeps the stored birth date, so it is not part of the update payload.
export async function updateDetails(
  token: string,
  details: Omit<ProfilePayload, "fechaNacimiento">,
): Promise<AccountActionResult> {
  const body = await requestApiJson("/api/auth/detalles", {
    method: "PATCH",
    token,
    body: details,
  });
  return expectSuccess(body, "Datos actualizados correctamente.");
}

export async function updateEmail(
  token: string,
  correo: string,
  passwordActual: string,
): Promise<AccountActionResult> {
  const body = await requestApiJson("/api/auth/correo", {
    method: "PATCH",
    token,
    body: { correo, password_actual: passwordActual },
  });
  return expectSuccess(body, "Correo actualizado correctamente.");
}

export async function updatePassword(
  token: string,
  passwordActual: string,
  password: string,
  passwordConfirmation: string,
): Promise<AccountActionResult> {
  const body = await requestApiJson("/api/auth/contrasena", {
    method: "PATCH",
    token,
    body: {
      password_actual: passwordActual,
      password,
      password_confirmation: passwordConfirmation,
    },
  });
  return expectSuccess(body, "Contraseña actualizada correctamente.");
}

export async function uploadAvatar(
  token: string,
  avatarConfig: Record<string, string>,
  file: AvatarFile,
): Promise<AccountActionResult> {
  const formData = new FormData();
  formData.append("avatarConfig", JSON.stringify(avatarConfig));
  formData.append("avatar", file as unknown as Blob);
  const body = await requestApiJson("/api/auth/avatar", {
    method: "POST",
    token,
    formData,
  });
  return expectSuccess(body, "Avatar guardado correctamente.");
}
