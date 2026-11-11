import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchCurrentUser,
  login,
  logout,
  parseAuthResult,
  parseProfileUser,
  register,
} from "../src/features/auth/api.ts";

const loginUser = {
  id: "user-1",
  nombre: "Ana Ejemplo",
  correo: "ana@example.test",
  rol: "usuario",
  estado: "activo",
};

const profileUser = {
  ...loginUser,
  foto: null,
  organizadorVerificado: false,
  fechaRegistro: "2026-01-10T12:00:00.000Z",
};

test("parses login and full profile responses without exposing credentials", () => {
  const result = parseAuthResult({
    success: true,
    token: "sanctum-token",
    usuario: loginUser,
  });
  assert.equal(result.user.correo, "ana@example.test");
  assert.equal(result.user.foto, null);
  assert.equal("password" in result.user, false);

  const user = parseProfileUser(profileUser);
  assert.equal(user.organizadorVerificado, false);
  assert.equal(user.fechaRegistro, "2026-01-10T12:00:00.000Z");
  assert.throws(() => parseProfileUser(loginUser), /perfil válido/);
});

test("rejects malformed or incomplete authentication responses", () => {
  assert.throws(
    () => parseAuthResult({ success: true, token: "", usuario: loginUser }),
    /formato esperado/,
  );
  assert.throws(
    () => parseAuthResult({ success: true, token: "token", usuario: { ...loginUser, rol: 4 } }),
    /perfil válido/,
  );
});

test("uses the existing login, register, me, and logout contracts", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiUrl = process.env.EXPO_PUBLIC_REGENERA_API_URL;
  const requests = [];
  process.env.EXPO_PUBLIC_REGENERA_API_URL = "https://api.example.test";

  globalThis.fetch = async (input, init = {}) => {
    requests.push({
      url: String(input),
      method: init.method ?? "GET",
      headers: new Headers(init.headers),
      body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
    });

    const request = requests.at(-1);
    const body = request.url.endsWith("/api/auth/me")
      ? { success: true, usuario: profileUser }
      : request.url.endsWith("/api/auth/logout")
        ? { success: true, message: "Sesión cerrada." }
        : { success: true, token: "sanctum-token", usuario: loginUser };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const signedIn = await login("ana@example.test", "password");
    assert.equal(signedIn.token, "sanctum-token");
    assert.deepEqual(requests[0].body, { correo: "ana@example.test", password: "password" });
    assert.equal(requests[0].method, "POST");

    const signedUp = await register("Ana Ejemplo", "ana@example.test", "password123", "password123");
    assert.equal(signedUp.user.id, "user-1");
    assert.deepEqual(requests[1].body, {
      nombre: "Ana Ejemplo",
      correo: "ana@example.test",
      password: "password123",
      password_confirmation: "password123",
    });

    const user = await fetchCurrentUser("sanctum-token");
    assert.equal(user.id, "user-1");
    assert.equal(requests[2].headers.get("Authorization"), "Bearer sanctum-token");
    assert.equal(requests[2].url, "https://api.example.test/api/auth/me");

    await logout("sanctum-token");
    assert.equal(requests[3].method, "POST");
    assert.equal(requests[3].headers.get("Authorization"), "Bearer sanctum-token");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_REGENERA_API_URL;
    else process.env.EXPO_PUBLIC_REGENERA_API_URL = originalApiUrl;
  }
});

test("surfaces API authentication failures with their HTTP status", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiUrl = process.env.EXPO_PUBLIC_REGENERA_API_URL;
  process.env.EXPO_PUBLIC_REGENERA_API_URL = "https://api.example.test";
  globalThis.fetch = async () => new Response(
    JSON.stringify({ success: false, message: "Correo o contraseña incorrectos." }),
    { status: 401, headers: { "Content-Type": "application/json" } },
  );

  try {
    await assert.rejects(login("ana@example.test", "wrong-password"), (error) => {
      assert.equal(error.name, "AuthenticationError");
      assert.equal(error.status, 401);
      assert.equal(error.message, "Correo o contraseña incorrectos.");
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_REGENERA_API_URL;
    else process.env.EXPO_PUBLIC_REGENERA_API_URL = originalApiUrl;
  }
});
