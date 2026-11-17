import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchImpactLog,
  parseImpactLog,
} from "../src/features/impacto/bitacora-api.ts";
import {
  fetchAdminGamificationStatistics,
  fetchAdminQuizAttempt,
  parseAdminGamificationStatistics,
  parseAdminQuizAttemptDetail,
} from "../src/features/gamificacion/admin-api.ts";
import {
  fetchNotificationPreferences,
  parseNotificationPreferences,
  updateReminderFrequency,
} from "../src/features/notificaciones/api.ts";

const impactResponse = {
  data: {
    kpis: {
      voluntariados: 1,
      participantes: 2,
      horas: 3.5,
      kilogramosResiduos: 4,
      kilometrosCosta: 0,
      plantasReforestadas: 5,
      superficieRecuperada: 6,
      ubicaciones: 1,
    },
    evolucion: [{ periodo: "2026-03", voluntariados: 1, participaciones: 2, horas: 3.5 }],
    categorias: [{ categoria: "Limpieza costera", voluntariados: 1 }],
    historial: [{
      id: "volunteer-1",
      titulo: "Limpieza de playa",
      categoria: "Limpieza costera",
      estado: "finalizado",
      fechaInicio: "2026-03-10",
      lugar: "Playa Norte",
      participantes: 2,
      horas: 3.5,
    }],
    opciones: {
      categorias: [{ id: "limpieza-costera", nombre: "Limpieza costera" }],
      lugares: [{ id: "place-1", nombre: "Playa Norte", municipio: "La Paz" }],
      estados: ["finalizado"],
    },
  },
};

const gamificationResponse = {
  data: {
    cuestionarios: [{
      slug: "cuidado-costero",
      titulo: "Cuidado costero",
      version: 2,
      totalPreguntas: 5,
      minimoAprobacion: 80,
      puntosAprobacion: 10,
      medalla: "Guardián costero",
      intentos: 1,
      aprobados: 1,
      noAprobados: 0,
      enCurso: 0,
    }],
    totalIntentos: 1,
    totalAprobados: 1,
    puntosOtorgados: 10,
    medallasDesbloqueadas: 1,
    organizadoresCertificados: 1,
    intentosRecientes: [{
      id: "attempt-1",
      usuarioId: "user-1",
      usuarioNombre: "Alex",
      usuarioFoto: null,
      usuarioCorreo: "alex@example.test",
      cuestionarioSlug: "cuidado-costero",
      cuestionarioTitulo: "Cuidado costero",
      estado: "aprobado",
      puntuacion: 100,
      fechaUltimoIntento: "2026-03-10T12:00:00.000Z",
      fechaAprobacion: null,
    }],
  },
};

const attemptResponse = {
  data: {
    id: "attempt-1",
    usuarioNombre: "Alex",
    usuarioFoto: null,
    cuestionarioTitulo: "Cuidado costero",
    cuestionarioVersion: 2,
    estado: "aprobado",
    puntuacion: 100,
    preguntas: [{
      id: "question-1",
      texto: "¿Qué material puede reciclarse?",
      respuestaElegida: "Vidrio",
      respuestaCorrecta: "Vidrio",
      correcta: true,
      explicacion: "El vidrio es reciclable.",
      respondidaEn: "2026-03-10T12:00:00.000Z",
    }],
  },
};

test("parses impact log results and rejects incomplete payloads", () => {
  const parsed = parseImpactLog(impactResponse);
  assert.equal(parsed.kpis.participantes, 2);
  assert.equal(parsed.historial[0].fechaInicio, "2026-03-10");
  assert.equal(parsed.opciones.lugares[0].municipio, "La Paz");
  assert.throws(() => parseImpactLog({ data: { ...impactResponse.data, historial: null } }), /formato inesperado/);
});

test("requests impact log from the role-specific API with filters and bearer auth", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiUrl = process.env.EXPO_PUBLIC_REGENERA_API_URL;
  const requests = [];
  process.env.EXPO_PUBLIC_REGENERA_API_URL = "https://api.example.test";
  globalThis.fetch = async (input, init = {}) => {
    requests.push({ url: String(input), headers: new Headers(init.headers) });
    return new Response(JSON.stringify(impactResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    await fetchImpactLog("token", "organizador", {
      desde: "2026-03-01",
      categoria: "limpieza-costera",
      lugarId: "place-1",
    });
    const request = requests[0];
    assert.equal(
      request.url,
      "https://api.example.test/api/organizador/bitacora-impacto?desde=2026-03-01&categoria=limpieza-costera&lugarId=place-1",
    );
    assert.equal(request.headers.get("Authorization"), "Bearer token");
    await fetchImpactLog("token", "admin");
    assert.equal(requests[1].url, "https://api.example.test/api/admin/bitacora-impacto");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_REGENERA_API_URL;
    else process.env.EXPO_PUBLIC_REGENERA_API_URL = originalApiUrl;
  }
});

test("parses gamification stats and full answer details with nullable fields", () => {
  const stats = parseAdminGamificationStatistics(gamificationResponse);
  assert.equal(stats.intentosRecientes[0].usuarioNombre, "Alex");
  assert.equal(stats.cuestionarios[0].medalla, "Guardián costero");
  assert.equal(parseAdminQuizAttemptDetail(attemptResponse).preguntas[0].correcta, true);
  assert.throws(
    () => parseAdminGamificationStatistics({ data: { ...gamificationResponse.data, intentosRecientes: [{}] } }),
    /formato inesperado|no contienen/,
  );
  assert.throws(
    () => parseAdminQuizAttemptDetail({ data: { ...attemptResponse.data, preguntas: null } }),
    /formato inesperado/,
  );
});

test("uses the admin gamification routes and includes bearer auth", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiUrl = process.env.EXPO_PUBLIC_REGENERA_API_URL;
  const requests = [];
  process.env.EXPO_PUBLIC_REGENERA_API_URL = "https://api.example.test";
  globalThis.fetch = async (input, init = {}) => {
    requests.push({
      url: String(input),
      headers: new Headers(init.headers),
    });
    const response = String(input).includes("/intentos/")
      ? attemptResponse
      : gamificationResponse;
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    await fetchAdminGamificationStatistics("token");
    await fetchAdminQuizAttempt("token", "attempt/one");
    assert.equal(requests[0].url, "https://api.example.test/api/admin/gamificacion/estadisticas");
    assert.equal(requests[1].url, "https://api.example.test/api/admin/gamification/intentos/attempt%2Fone");
    assert.equal(requests[0].headers.get("Authorization"), "Bearer token");
    assert.equal(requests[1].headers.get("Authorization"), "Bearer token");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_REGENERA_API_URL;
    else process.env.EXPO_PUBLIC_REGENERA_API_URL = originalApiUrl;
  }
});

test("parses notification preferences and persists the reminder frequency", async () => {
  assert.deepEqual(parseNotificationPreferences({
    data: { recordatorioFrecuencia: "daily", pushActivo: false, pushDisponible: true },
  }), {
    recordatorioFrecuencia: "daily",
    pushActivo: false,
    pushDisponible: true,
  });
  assert.throws(() => parseNotificationPreferences({
    data: { recordatorioFrecuencia: "weekly", pushActivo: false, pushDisponible: true },
  }), /frecuencia de recordatorio inesperada/);

  const originalFetch = globalThis.fetch;
  const originalApiUrl = process.env.EXPO_PUBLIC_REGENERA_API_URL;
  const requests = [];
  process.env.EXPO_PUBLIC_REGENERA_API_URL = "https://api.example.test";
  globalThis.fetch = async (input, init = {}) => {
    const request = {
      url: String(input),
      method: init.method ?? "GET",
      headers: new Headers(init.headers),
      body: init.body,
    };
    requests.push(request);
    const body = request.method === "PATCH"
      ? { data: { recordatorioFrecuencia: "none" } }
      : { data: { recordatorioFrecuencia: "daily", pushActivo: false, pushDisponible: true } };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    assert.equal((await fetchNotificationPreferences("token")).recordatorioFrecuencia, "daily");
    assert.equal(await updateReminderFrequency("token", "none"), "none");
    assert.equal(requests[0].url, "https://api.example.test/api/notificaciones/preferencias");
    assert.equal(requests[1].method, "PATCH");
    assert.deepEqual(JSON.parse(requests[1].body), { recordatorioFrecuencia: "none" });
    assert.equal(requests[1].headers.get("Authorization"), "Bearer token");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_REGENERA_API_URL;
    else process.env.EXPO_PUBLIC_REGENERA_API_URL = originalApiUrl;
  }
});
