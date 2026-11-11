import assert from "node:assert/strict";
import test from "node:test";
import {
  createVolunteerImpact,
  fetchGlobalImpact,
  fetchVolunteerImpact,
  parseGlobalImpactTotals,
  parseVolunteerImpactSummary,
} from "../src/features/impacto/api.ts";
import { hasVolunteerEnded } from "../src/features/impacto/schedule.ts";

const metric = {
  tipo: "residuos_recolectados",
  etiqueta: "Residuos recolectados",
  unidad: "kg",
};

const record = {
  id: "impact-1",
  ...metric,
  cantidad: 12.5,
  nota: "Limpieza de playa",
  registradoEn: "2026-03-10T12:00:00.000Z",
};

test("parses impact details, metric totals, and accumulated totals", () => {
  const volunteerSummary = parseVolunteerImpactSummary({
    data: {
      voluntariadoId: "volunteer-1",
      catalogo: [metric],
      registros: [record],
      totales: [{ ...metric, cantidad: 12.5, registros: 1, actividades: 1 }],
    },
  });
  assert.equal(volunteerSummary.voluntariadoId, "volunteer-1");
  assert.equal(volunteerSummary.registros[0].cantidad, 12.5);
  assert.deepEqual(parseGlobalImpactTotals({
    data: [{ ...metric, cantidad: 12.5, registros: 1, actividades: 1 }],
  })[0], { ...metric, cantidad: 12.5, registros: 1, actividades: 1 });
});

test("rejects malformed impact summaries and non-numeric totals", () => {
  assert.throws(() => parseVolunteerImpactSummary({ data: {} }), /formato inesperado/);
  assert.throws(() => parseGlobalImpactTotals({ data: [{ ...metric, cantidad: "12" }] }), /cantidad válido/);
});

test("enables impact reporting only after the activity end time in Baja California Sur", () => {
  assert.equal(hasVolunteerEnded("2026-04-04", "21:30", new Date("2026-04-05T04:29:59Z")), false);
  assert.equal(hasVolunteerEnded("2026-04-04", "21:30", new Date("2026-04-05T04:30:00Z")), false);
  assert.equal(hasVolunteerEnded("2026-04-04", "21:30", new Date("2026-04-05T04:30:01Z")), true);
  assert.equal(hasVolunteerEnded("2026-04-04", null, new Date("2026-04-05T06:59:58Z")), false);
  assert.equal(hasVolunteerEnded("2026-04-04", null, new Date("2026-04-05T07:00:00Z")), true);
});

test("requests impact totals and records using public and organizer API routes", async () => {
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
    const body = request.method === "POST"
      ? { data: record }
      : request.url.endsWith("/impactos/resumen")
        ? { data: [{ ...metric, cantidad: 12.5, registros: 1, actividades: 1 }] }
        : {
          data: {
            voluntariadoId: "event/a",
            catalogo: [metric],
            registros: [record],
            totales: [{ ...metric, cantidad: 12.5, registros: 1, actividades: 1 }],
          },
        };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    assert.equal((await fetchVolunteerImpact("event/a")).totales[0].cantidad, 12.5);
    assert.equal((await fetchGlobalImpact())[0].actividades, 1);
    assert.equal((await createVolunteerImpact("token", "event/a", {
      tipo: metric.tipo,
      cantidad: 12.5,
      nota: "Limpieza",
    })).id, "impact-1");

    assert.equal(requests[0].url, "https://api.example.test/api/voluntariados/event%2Fa/impactos");
    assert.equal(requests[1].url, "https://api.example.test/api/impactos/resumen");
    assert.equal(requests[2].url, "https://api.example.test/api/admin/voluntariados/event%2Fa/impactos");
    assert.equal(requests[2].method, "POST");
    assert.ok(requests[2].headers.get("Authorization")?.startsWith("Bearer "));
    assert.deepEqual(requests[2].body, { tipo: metric.tipo, cantidad: 12.5, nota: "Limpieza" });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_REGENERA_API_URL;
    else process.env.EXPO_PUBLIC_REGENERA_API_URL = originalApiUrl;
  }
});
