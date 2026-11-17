import assert from "node:assert/strict";
import test from "node:test";
import {
  ageOn,
  emptyProfileForm,
  mapApiFieldErrors,
  parseIsoDate,
  validateProfileForm,
} from "../src/features/auth/profile.ts";
import {
  completeProfile,
  updateDetails,
  updateEmail,
  updatePassword,
  updateName,
  uploadAvatar,
} from "../src/features/auth/account-api.ts";

const today = new Date(2026, 5, 15);
const context = { email: "ana@example.test" };

function adultForm(overrides = {}) {
  return {
    ...emptyProfileForm(),
    correoSecundario: "Respaldo@Example.test",
    ciudad: " La Paz ",
    fechaNacimiento: "2000-06-15",
    genero: "mujer",
    ...overrides,
  };
}

test("calculates completed years and rejects impossible dates", () => {
  assert.equal(ageOn(new Date(2000, 5, 16), today), 25);
  assert.equal(ageOn(new Date(2000, 5, 15), today), 26);
  assert.equal(parseIsoDate("2026-02-31"), null);
  assert.equal(parseIsoDate("15/06/2000"), null);
});

test("builds the API payload for adults without tutor data", () => {
  const { errors, payload } = validateProfileForm(adultForm({ telefono: "612 123 4567" }), context, today);
  assert.deepEqual(errors, {});
  assert.deepEqual(payload, {
    correoSecundario: "respaldo@example.test",
    telefono: "612 123 4567",
    descripcion: null,
    ciudad: "La Paz",
    fechaNacimiento: "2000-06-15",
    genero: "mujer",
    generoOtro: null,
    privacidad: false,
  });
});

test("requires the secondary email, city, gender, and age of at least 13", () => {
  const same = validateProfileForm(adultForm({ correoSecundario: "ANA@example.test" }), context, today);
  assert.match(same.errors.correoSecundario, /distinto del principal/);
  assert.equal(same.payload, null);

  const empty = validateProfileForm(emptyProfileForm(), context, today);
  assert.ok(empty.errors.correoSecundario && empty.errors.ciudad && empty.errors.genero && empty.errors.fechaNacimiento);

  const child = validateProfileForm(adultForm({ fechaNacimiento: "2013-06-16" }), context, today);
  assert.match(child.errors.fechaNacimiento, /al menos 13 años/);
  assert.equal(child.payload, null);
});

test("requires an adult tutor, authorization, and forces privacy for users aged 13 to 17", () => {
  const missing = validateProfileForm(adultForm({ fechaNacimiento: "2010-01-01" }), context, today);
  assert.ok(missing.errors.tutorNombre && missing.errors.tutorCorreo && missing.errors.tutorTelefono);
  assert.ok(missing.errors.tutorFechaNacimiento && missing.errors.tutorAutorizacion);

  const youngTutor = validateProfileForm(adultForm({
    fechaNacimiento: "2010-01-01",
    tutorNombre: "Luis",
    tutorCorreo: "luis@example.test",
    tutorTelefono: "+526121234567",
    tutorFechaNacimiento: "2012-01-01",
    tutorAutorizacion: true,
  }), context, today);
  assert.match(youngTutor.errors.tutorFechaNacimiento, /mayor de edad/);

  const valid = validateProfileForm(adultForm({
    fechaNacimiento: "2010-01-01",
    tutorNombre: " Luis ",
    tutorCorreo: "Luis@Example.test",
    tutorTelefono: "+526121234567",
    tutorFechaNacimiento: "1980-01-01",
    tutorAutorizacion: true,
    privacidad: false,
  }), context, today);
  assert.deepEqual(valid.errors, {});
  assert.equal(valid.payload.privacidad, true);
  assert.deepEqual(valid.payload.tutor, {
    nombre: "Luis",
    correo: "luis@example.test",
    telefono: "+526121234567",
    fechaNacimiento: "1980-01-01",
    autorizacion: true,
  });
});

test("validates phone, other gender, and organizer-only fields like the API", () => {
  assert.match(validateProfileForm(adultForm({ telefono: "123" }), context, today).errors.telefono, /teléfono válido/);
  assert.equal(
    validateProfileForm(adultForm({ telefono: "123" }), { ...context, currentPhone: "123" }, today).errors.telefono,
    undefined,
  );

  const other = validateProfileForm(adultForm({ genero: "otro", generoOtro: "No binario" }), context, today);
  assert.equal(other.payload.generoOtro, "No binario");
  assert.equal(validateProfileForm(adultForm({ generoOtro: "ignorado" }), context, today).payload.generoOtro, null);

  const volunteer = validateProfileForm(adultForm({ organizacion: "ONG", enlacesSociales: "https://a.test" }), context, today);
  assert.equal("organizacion" in volunteer.payload, false);

  const organizer = validateProfileForm(
    adultForm({ organizacion: "ONG", enlacesSociales: "https://a.test\nhttps://b.test, ftp://x" }),
    { ...context, role: "organizador" },
    today,
  );
  assert.match(organizer.errors.enlacesSociales, /http/);
  const links = validateProfileForm(
    adultForm({ organizacion: "ONG", enlacesSociales: "https://a.test\nhttps://b.test" }),
    { ...context, role: "organizador" },
    today,
  );
  assert.deepEqual(links.payload.enlacesSociales, ["https://a.test", "https://b.test"]);
});

test("maps API field errors onto form fields", () => {
  assert.deepEqual(
    mapApiFieldErrors({ "tutor.nombre": "Falta", "enlacesSociales.1": "URL inválida", extra: "ignorado" }),
    { tutorNombre: "Falta", enlacesSociales: "URL inválida" },
  );
});

test("uses the existing account management endpoints and request shapes", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiUrl = process.env.EXPO_PUBLIC_REGENERA_API_URL;
  process.env.EXPO_PUBLIC_REGENERA_API_URL = "https://api.example.test";
  const requests = [];
  globalThis.fetch = async (input, init = {}) => {
    requests.push({
      url: String(input),
      method: init.method,
      headers: new Headers(init.headers),
      body: init.body,
    });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const { payload } = validateProfileForm(adultForm(), context, today);
    await completeProfile("t", payload);
    await updateName("t", "Ana Nueva");
    const { fechaNacimiento: _ignored, ...details } = payload;
    await updateDetails("t", details);
    await updateEmail("t", "nuevo@example.test", "secreta123");
    await updatePassword("t", "secreta123", "nueva12345", "nueva12345");
    await uploadAvatar("t", { skin: "dark" }, { uri: "file:///avatar.png", name: "avatar.png", type: "image/png" });

    assert.deepEqual(
      requests.map((request) => [request.method, request.url.replace("https://api.example.test", "")]),
      [
        ["POST", "/api/auth/completar-perfil"],
        ["PATCH", "/api/auth/perfil"],
        ["PATCH", "/api/auth/detalles"],
        ["PATCH", "/api/auth/correo"],
        ["PATCH", "/api/auth/contrasena"],
        ["POST", "/api/auth/avatar"],
      ],
    );
    assert.ok(requests.every((request) => request.headers.get("Authorization") === "Bearer t"));
    assert.deepEqual(JSON.parse(requests[3].body), { correo: "nuevo@example.test", password_actual: "secreta123" });
    assert.deepEqual(JSON.parse(requests[4].body), {
      password_actual: "secreta123",
      password: "nueva12345",
      password_confirmation: "nueva12345",
    });
    assert.equal("fechaNacimiento" in JSON.parse(requests[2].body), false);
    assert.ok(requests[5].body instanceof FormData);
    assert.equal(requests[5].body.get("avatarConfig"), JSON.stringify({ skin: "dark" }));
    assert.equal(requests[5].headers.get("Content-Type"), null);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_REGENERA_API_URL;
    else process.env.EXPO_PUBLIC_REGENERA_API_URL = originalApiUrl;
  }
});
