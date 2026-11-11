import assert from "node:assert/strict";
import test from "node:test";
import {
  cancelEnrollment,
  createEnrollment,
  fetchMyEnrollment,
  fetchMyEnrollments,
  parseEnrollmentList,
  parseMyEnrollment,
} from "../src/features/inscripciones/api.ts";

const sampleEnrollment = {
  _id: "enrollment-1",
  usuarioId: "user-1",
  voluntariadoId: "volunteer-1",
  fechaInscripcion: "2026-03-10T12:00:00.000Z",
  estado: "inscrita",
  observaciones: null,
};

test("parses enrollment records and handles MongoDB _id serialization", () => {
  const [enrollment] = parseEnrollmentList({
    success: true,
    inscripciones: [sampleEnrollment],
  });
  assert.equal(enrollment.id, "enrollment-1");
  assert.equal(enrollment.estado, "inscrita");
  assert.deepEqual(parseMyEnrollment({
    success: true,
    inscrito: true,
    inscripcionId: "enrollment-1",
  }), { enrolled: true, enrollmentId: "enrollment-1" });
});

test("rejects malformed or incomplete enrollment responses", () => {
  assert.throws(() => parseEnrollmentList({ success: true, inscripciones: [{ id: "x" }] }), /formato inesperado/);
  assert.throws(() => parseEnrollmentList({ success: true, inscripciones: "invalid" }), /formato esperado/);
  assert.throws(() => parseMyEnrollment({ success: true, inscrito: true }), /formato esperado/);
});

test("uses existing enrollment request paths, methods, body, and bearer auth", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiUrl = process.env.EXPO_PUBLIC_REGENERA_API_URL;
  const requests = [];
  process.env.EXPO_PUBLIC_REGENERA_API_URL = "https://api.example.test";
  globalThis.fetch = async (input, init = {}) => {
    const request = {
      url: String(input),
      method: init.method ?? "GET",
      headers: new Headers(init.headers),
      body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
    };
    requests.push(request);
    const response = request.url.endsWith("/mia")
      ? { success: true, inscrito: true, inscripcionId: "enrollment-1" }
      : request.method === "POST" && request.url.endsWith("/cancelar")
        ? { success: true, message: "Tu participación fue cancelada." }
        : request.method === "POST"
          ? { success: true, inscripcion: sampleEnrollment }
          : { success: true, inscripciones: [sampleEnrollment] };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    assert.equal((await fetchMyEnrollments("token"))[0].id, "enrollment-1");
    assert.equal((await fetchMyEnrollment("token", "volunteer-1")).enrollmentId, "enrollment-1");
    assert.equal((await createEnrollment("token", "volunteer-1")).estado, "inscrita");
    await cancelEnrollment("token", "enrollment-1");

    assert.equal(requests[0].url, "https://api.example.test/api/inscripciones");
    assert.ok(requests[0].headers.get("Authorization")?.startsWith("Bearer "));
    assert.equal(requests[1].url, "https://api.example.test/api/inscripciones/voluntariado/volunteer-1/mia");
    assert.deepEqual(requests[2].body, { voluntariadoId: "volunteer-1" });
    assert.equal(requests[2].method, "POST");
    assert.equal(requests[3].method, "POST");
    assert.equal(requests[3].url, "https://api.example.test/api/inscripciones/enrollment-1/cancelar");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_REGENERA_API_URL;
    else process.env.EXPO_PUBLIC_REGENERA_API_URL = originalApiUrl;
  }
});
