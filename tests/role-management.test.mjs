import assert from "node:assert/strict";
import test from "node:test";
import {
  createManagedVolunteer,
  fetchManagedVolunteers,
  fetchVolunteerDashboard,
  parseManagedVolunteerList,
  updateManagedVolunteer,
} from "../src/features/organizador/api.ts";
import {
  fetchAdminUsers,
  fetchAuditDetail,
  fetchAuditLog,
  fetchModerationQueue,
  deleteAdminUser,
  reviewContent,
  saveAdminUser,
} from "../src/features/admin/api.ts";
import {
  registerManualAttendance,
  scanAttendanceQr,
  updateAttendanceCode,
} from "../src/features/asistencia/api.ts";

const volunteer = {
  id: "volunteer-1",
  titulo: "Limpieza de playa",
  descripcion: "Jornada comunitaria de limpieza.",
  categoria: "limpieza",
  lugarId: "place-1",
  organizadorId: "organizer-1",
  fechaInicio: "2026-12-10",
  fechaFin: "2026-12-10",
  horaInicio: "09:00",
  horaFin: "12:00",
  cupo: 20,
  requisitos: [],
  materiales: [],
  estado: "publicado",
  imagen: null,
  imagenes: [],
  tokenAsistencia: "qr-secret",
  codigoAsistenciaActivo: true,
};

const adminUser = {
  id: "admin-1",
  nombre: "Admin",
  correo: "admin@example.test",
  foto: null,
  rol: "admin",
  estado: "activo",
  organizadorVerificado: true,
  fechaRegistro: "2026-01-01T00:00:00.000Z",
};

function installFetch(handler) {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.EXPO_PUBLIC_REGENERA_API_URL;
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
    const response = await handler(request);
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  return {
    requests,
    restore() {
      globalThis.fetch = originalFetch;
      if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_REGENERA_API_URL;
      else process.env.EXPO_PUBLIC_REGENERA_API_URL = originalUrl;
    },
  };
}

test("parses managed activities and organizer dashboard summaries", async () => {
  const participant = {
    id: "enrollment-1",
    usuarioId: "user-1",
    nombre: "Volunteer",
    correo: "volunteer@example.test",
    estadoInscripcion: "inscrita",
    asistencia: null,
  };
  const sampleDashboard = {
    data: {
      voluntariado: { ...volunteer, lugar: { nombre: "Playa", municipio: "La Paz", direccion: null } },
      estadisticas: {
        inscritos: 1,
        cupo: 20,
        disponibles: 19,
        ocupacion: 5,
        asistencias: 0,
        porcentajeAsistencia: 0,
        pendientes: 1,
        canceladas: 0,
        registrosQr: 0,
      },
      participantes: [participant],
    },
  };
  assert.equal(parseManagedVolunteerList({ data: [volunteer] })[0].estado, "publicado");
  assert.throws(() => parseManagedVolunteerList({ data: [{ id: "bad" }] }), /formato esperado/);

  const mock = installFetch((request) => request.url.includes("/dashboard")
    ? sampleDashboard
    : request.method === "POST" || request.method === "PUT"
      ? { data: volunteer }
      : { data: [volunteer] });
  try {
    assert.equal((await fetchManagedVolunteers("bearer"))[0].id, "volunteer-1");
    const dashboard = await fetchVolunteerDashboard("bearer", "volunteer-1");
    assert.equal(dashboard.statistics.inscritos, 1);
    assert.equal(dashboard.participants[0].usuarioId, "user-1");
    assert.equal((await createManagedVolunteer("bearer", volunteer)).id, "volunteer-1");
    assert.equal((await updateManagedVolunteer("bearer", "volunteer-1", { cupo: 25 })).cupo, 20);
    assert.equal(mock.requests[0].url, "https://api.example.test/api/admin/voluntariados");
    assert.equal(mock.requests[1].url, "https://api.example.test/api/admin/voluntariados/volunteer-1/dashboard");
    assert.equal(mock.requests[2].method, "POST");
    assert.equal(mock.requests[3].method, "PUT");
  } finally {
    mock.restore();
  }
});

test("uses admin user, moderation, and audit contracts", async () => {
  const pendingActivity = { ...volunteer, estado: "pendiente" };
  const audit = {
    _id: "audit-1",
    accion: "aprobar",
    entidad: "articulo",
    entidadId: "article-1",
    usuarioId: "admin-1",
    fecha: "2026-11-11T12:00:00.000Z",
    cambios: { estado: "publicado" },
  };
  const mock = installFetch((request) => {
    if (request.url.endsWith("/api/admin/usuarios") && request.method === "GET") {
      return { success: true, data: [adminUser] };
    }
    if (request.url.endsWith("/api/admin/usuarios")) return { success: true, data: adminUser };
    if (request.method === "DELETE") return { success: true };
    if (request.url.endsWith("/api/admin/usuarios/user-1")) return { success: true, data: adminUser };
    if (request.url.endsWith("/api/admin/voluntariados")) return { data: [pendingActivity] };
    if (request.url.endsWith("/api/admin/articulos/pendientes")) {
      return {
        data: [{
          id: "article-1",
          titulo: "Artículo pendiente",
          categoria: "ambiente",
          contenido: "Contenido completo para revisión.",
          estado: "pendiente",
        }],
      };
    }
    if (request.url.endsWith("/api/admin/flora-fauna")) {
      return { data: [{ id: "species-1", nombre: "Especie", estado: "archivado" }] };
    }
    if (request.url.endsWith("/api/admin/lugares")) {
      return { data: [{ id: "place-1", nombre: "Lugar", estado: "activo" }] };
    }
    if (request.url.endsWith("/api/admin/auditoria")) return { success: true, auditoria: [audit] };
    if (request.url.endsWith("/api/admin/auditoria/audit-1")) return { success: true, auditoria: audit };
    return { data: { id: "article-1", estado: "publicado" }, message: "OK" };
  });
  try {
    assert.equal((await fetchAdminUsers("bearer"))[0].rol, "admin");
    const created = await saveAdminUser("bearer", {
      nombre: "New user",
      correo: "new@example.test",
      password: "pass1234",
      rol: "usuario",
      estado: "activo",
      organizadorVerificado: false,
    });
    assert.equal(created.id, "admin-1");
    assert.deepEqual(mock.requests[1].body, {
      nombre: "New user",
      correo: "new@example.test",
      password: "pass1234",
      rol: "usuario",
      estado: "activo",
      organizadorVerificado: false,
    });
    await deleteAdminUser("bearer", "user-1");
    assert.equal(mock.requests[2].method, "DELETE");

    assert.equal((await fetchModerationQueue("bearer", "voluntariado"))[0].id, "volunteer-1");
    const article = (await fetchModerationQueue("bearer", "articulo"))[0];
    assert.match(article.detalle, /Contenido completo para revisión/);
    await reviewContent("bearer", article, "reject", "Falta una fuente");
    assert.deepEqual(mock.requests.at(-1).body, { motivo: "Falta una fuente" });
    assert.equal(mock.requests.at(-1).method, "PATCH");
    const species = (await fetchModerationQueue("bearer", "flora-fauna"))[0];
    assert.equal(species.estado, "archivado");
    await assert.rejects(
      reviewContent("bearer", { ...species, estado: "publicado" }, "approve"),
      /Solo se pueden publicar registros archivados/,
    );
    await reviewContent("bearer", species, "approve");
    assert.match(mock.requests.at(-1).url, /\/api\/admin\/flora-fauna\/species-1\/publicar$/);
    const place = (await fetchModerationQueue("bearer", "lugar"))[0];
    assert.equal(place.id, "place-1");
    await reviewContent("bearer", place, "archive");
    assert.match(mock.requests.at(-1).url, /\/api\/admin\/lugares\/place-1\/archivar$/);
    assert.equal((await fetchAuditLog("bearer"))[0].id, "audit-1");
    assert.equal((await fetchAuditDetail("bearer", "audit-1")).accion, "aprobar");
  } finally {
    mock.restore();
  }
});

test("registers QR and manual attendance through the checked-in API contract", async () => {
  const attendance = {
    id: "attendance-1",
    usuarioId: "user-1",
    voluntariadoId: "volunteer-1",
    metodo: "QR",
    confirmada: true,
  };
  const mock = installFetch((request) => ({
    success: true,
    asistencia: { ...attendance, metodo: request.body.metodo },
    data: { id: "volunteer-1" },
  }));
  try {
    assert.equal((await scanAttendanceQr("bearer", "qr-token")).metodo, "QR");
    assert.equal((await registerManualAttendance("bearer", "user-1", "volunteer-1")).metodo, "manual");
    await updateAttendanceCode("bearer", "volunteer-1", false);
    assert.deepEqual(mock.requests[0].body, { metodo: "QR", tokenAsistencia: "qr-token" });
    assert.deepEqual(mock.requests[1].body, {
      metodo: "manual",
      usuarioId: "user-1",
      voluntariadoId: "volunteer-1",
    });
    assert.equal(mock.requests[2].method, "PATCH");
    assert.equal(mock.requests[2].url, "https://api.example.test/api/admin/voluntariados/volunteer-1/codigo-asistencia");
  } finally {
    mock.restore();
  }
});
