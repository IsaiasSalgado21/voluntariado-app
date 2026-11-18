import assert from "node:assert/strict";
import test from "node:test";
import {
  createManagedVolunteer,
  deleteManagedVolunteer,
  fetchManagedCommentsDefault,
  fetchManagedPlaceOptions,
  fetchManagedVolunteers,
  normalizeCategory,
  parseManagedPlaceOptions,
  fetchVolunteerDashboard,
  parseVolunteerCategoryOptions,
  parseManagedVolunteer,
  parseManagedVolunteerList,
  updateManagedVolunteer,
  updateManagedCommentsDefault,
} from "../src/features/organizador/api.ts";
import {
  deleteAdminArticle,
  fetchAdminUsers,
  fetchAdminArticles,
  fetchAdminFloraFauna,
  fetchAdminPlaces,
  fetchAuditDetail,
  fetchAuditLog,
  fetchModerationQueue,
  deleteAdminUser,
  reviewContent,
  saveAdminArticle,
  saveAdminFloraFauna,
  saveAdminPlace,
  saveAdminUser,
} from "../src/features/admin/api.ts";
import {
  registerManualAttendance,
  requestAttendanceCorrection,
  respondAttendanceCorrection,
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
  iniciadoPorFecha: false,
  imagen: null,
  imagenes: [],
  tokenAsistencia: "qr-secret",
  codigoCorto: "A1B2C3D4",
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
      formData: init.body instanceof FormData ? init.body : undefined,
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
  const { codigoAsistenciaActivo: _legacyQrState, ...legacyVolunteer } = volunteer;
  const participant = {
    id: "enrollment-1",
    usuarioId: "user-1",
    nombre: "Volunteer",
    correo: "volunteer@example.test",
    foto: null,
    estadoInscripcion: "inscrita",
    falto: true,
    solicitudAsistencia: {
      id: "request-1",
      estado: "pendiente",
      motivoRespuesta: null,
    },
    asistencia: null,
  };
  const sampleDashboard = {
    data: {
      voluntariado: {
        ...legacyVolunteer,
        finalizadoPorFecha: false,
        cancelado: false,
        lugar: { nombre: "Playa", municipio: "La Paz", direccion: null },
      },
      estadisticas: {
        inscritos: 1,
        cupo: 20,
        disponibles: 19,
        ocupacion: 5,
        asistencias: 0,
        porcentajeAsistencia: 0,
        pendientes: 1,
        faltas: 1,
        canceladas: 0,
        registrosQr: 0,
      },
      participantes: [participant],
    },
  };
  assert.equal(parseManagedVolunteerList({ data: [volunteer] })[0].estado, "publicado");
  assert.equal(parseManagedVolunteer(legacyVolunteer).codigoAsistenciaActivo, true);
  assert.equal(parseManagedVolunteerList({ data: [legacyVolunteer] })[0].id, "volunteer-1");
  assert.equal(parseManagedVolunteer({ ...legacyVolunteer, categoria: null }).categoria, "");
  const missingCategory = { ...legacyVolunteer };
  delete missingCategory.categoria;
  assert.equal(parseManagedVolunteer(missingCategory).categoria, "");
  assert.throws(() => parseManagedVolunteer({ ...legacyVolunteer, categoria: 42 }), /formato esperado/);
  assert.throws(() => parseManagedVolunteerList({ data: [{ id: "bad" }] }), /formato esperado/);

  const mock = installFetch((request) => request.url.includes("/dashboard")
    ? sampleDashboard
    : request.method === "POST" || request.method === "PUT"
      ? { data: volunteer }
      : { data: [legacyVolunteer] });
  try {
    assert.equal((await fetchManagedVolunteers("bearer"))[0].id, "volunteer-1");
    const dashboard = await fetchVolunteerDashboard("bearer", "volunteer-1");
    assert.equal(dashboard.volunteer.codigoAsistenciaActivo, true);
    assert.equal(dashboard.statistics.inscritos, 1);
    assert.equal(dashboard.statistics.faltas, 1);
    assert.equal(dashboard.participants[0].usuarioId, "user-1");
    assert.equal(dashboard.participants[0].falto, true);
    assert.equal(dashboard.participants[0].solicitudAsistencia?.id, "request-1");
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

test("parses manager place options without requiring map coordinates", () => {
  assert.deepEqual(parseManagedPlaceOptions({
    data: [
      { id: "place-1", nombre: "Playa local", municipio: "La Paz", descripcion: "Zona de limpieza" },
      { _id: "place-2", nombre: "Parque sin coordenadas", estado: "pendiente" },
    ],
  }), [
    { id: "place-1", nombre: "Playa local", municipio: "La Paz", descripcion: "Zona de limpieza" },
    { id: "place-2", nombre: "Parque sin coordenadas", municipio: "", descripcion: "" },
  ]);
  assert.throws(() => parseManagedPlaceOptions({ data: [{ nombre: "Sin id" }] }), /identificador válido/);
});

test("requests organizer place options with the authenticated token", async () => {
  const mock = installFetch(() => ({
    data: [{ id: "owned-place", nombre: "Lugar propio", municipio: "La Paz" }],
  }));
  try {
    const places = await fetchManagedPlaceOptions("organizer-token");
    assert.equal(places[0].id, "owned-place");
    assert.equal(mock.requests[0].url, "https://api.example.test/api/lugares");
    assert.equal(mock.requests[0].headers.get("Authorization"), "Bearer organizer-token");
  } finally {
    mock.restore();
  }
});

test("loads and updates a managed activity's comment visibility with authenticated requests", async () => {
  const mock = installFetch((request) => request.method === "GET"
    ? { success: true, voluntariado: { comentarios_por_defecto: "privado" } }
    : {
      data: {
        voluntariado_id: "volunteer-1",
        comentarios_por_defecto: request.body.comentarios_por_defecto,
      },
    });
  try {
    assert.equal(await fetchManagedCommentsDefault("organizer-token", "volunteer-1"), "privado");
    assert.equal(
      await updateManagedCommentsDefault("organizer-token", "volunteer-1", "publico"),
      "publico",
    );
    assert.equal(mock.requests[0].url, "https://api.example.test/api/voluntariados/volunteer-1");
    assert.equal(mock.requests[0].headers.get("Authorization"), "Bearer organizer-token");
    assert.equal(mock.requests[1].method, "PATCH");
    assert.equal(
      mock.requests[1].url,
      "https://api.example.test/api/voluntariados/volunteer-1/config-comentarios",
    );
    assert.deepEqual(mock.requests[1].body, { comentarios_por_defecto: "publico" });
  } finally {
    mock.restore();
  }
});

test("provides recommended and previously used categories, and normalizes new names", () => {
  const categories = parseVolunteerCategoryOptions({
    success: true,
    categorias: ["limpieza-de-playas", "reforestacion", "restauracion-de-dunas"],
  });
  assert.deepEqual(categories.map(({ value }) => value), [
    "limpieza-de-playas",
    "reforestacion",
    "restauracion-de-dunas",
  ]);
  assert.equal(categories[0].label, "Limpieza de playas");
  assert.equal(normalizeCategory("  Restauración de dunas "), "restauracion-de-dunas");
  assert.throws(() => parseVolunteerCategoryOptions({ categorias: [null] }), /formato inesperado/);
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
    await reviewContent("bearer", { ...place, estado: "pendiente_de_aprobacion" }, "approve");
    assert.match(mock.requests.at(-1).url, /\/api\/admin\/lugares\/place-1\/aprobar$/);
    await reviewContent("bearer", { ...place, estado: "pendiente_de_aprobacion" }, "reject", "Sin coordenadas");
    assert.deepEqual(mock.requests.at(-1).body, { motivo: "Sin coordenadas" });
    await assert.rejects(
      reviewContent("bearer", { ...article, estado: "publicado" }, "publish"),
      /Solo se pueden publicar artículos en borrador/,
    );
    await reviewContent("bearer", { ...article, estado: "borrador" }, "publish");
    assert.match(mock.requests.at(-1).url, /\/api\/admin\/articulos\/article-1\/publicar$/);
    await reviewContent("bearer", { ...article, estado: "publicado" }, "unpublish");
    assert.match(mock.requests.at(-1).url, /\/api\/admin\/articulos\/article-1\/despublicar$/);
    assert.equal((await fetchAuditLog("bearer"))[0].id, "audit-1");
    assert.equal((await fetchAuditDetail("bearer", "audit-1")).accion, "aprobar");
  } finally {
    mock.restore();
  }
});

test("loads admin catalogs and sends multipart create/update operations with image edits", async () => {
  const place = {
    id: "place-1",
    nombre: "Playa",
    descripcion: "Zona costera.",
    municipio: "La Paz",
    direccion: "Malecón",
    latitud: 24.14,
    longitud: -110.31,
    tipo: "playa",
    imagen: "https://api.example.test/storage/place.jpg",
    estado: "activo",
    motivoRechazo: null,
  };
  const species = {
    id: "species-1",
    nombre: "Cardón",
    nombreCientifico: "Pachycereus pringlei",
    tipo: "flora",
    descripcion: "Cactus nativo.",
    habitat: "Desierto",
    estadoConservacion: "preocupación menor",
    estado: "publicado",
    imagenes: ["https://api.example.test/storage/cardón.jpg"],
    ubicacion: { nombre: "Sierra", latitud: 24, longitud: -110 },
    lugaresRelacionados: [],
    fuenteInformacion: "CONABIO",
  };
  const article = {
    id: "article-1",
    titulo: "Cuidado costero",
    contenido: "Información ambiental.",
    categoria: "conservación",
    estado: "borrador",
    imagenes: ["https://api.example.test/storage/coast.jpg"],
    imagen: "https://api.example.test/storage/coast.jpg",
    motivoRechazo: null,
  };
  const mock = installFetch((request) => {
    if (request.method === "GET" && request.url.endsWith("/api/admin/lugares")) return { data: [place] };
    if (request.method === "GET" && request.url.endsWith("/api/admin/flora-fauna")) return { data: [species] };
    if (request.method === "GET" && request.url.endsWith("/api/articulos")) return { data: [article] };
    if (request.url.endsWith("/api/lugares")) return { data: place };
    if (request.url.endsWith("/api/lugares/place-1")) return { data: place };
    if (request.url.endsWith("/api/flora-fauna/species-1")) return { data: species };
    if (request.url.endsWith("/api/articulos/article-1")) return { data: article };
    if (request.method === "DELETE") return { data: { id: "article-1" } };
    return { data: article };
  });
  try {
    assert.equal((await fetchAdminPlaces("bearer"))[0].estado, "activo");
    assert.equal((await fetchAdminFloraFauna("bearer"))[0].imagenes.length, 1);
    assert.equal((await fetchAdminArticles("bearer"))[0].estado, "borrador");

    const image = {
      uri: "file:///new.jpg",
      fileName: "new.jpg",
      mimeType: "image/jpeg",
      file: new Blob(["image"], { type: "image/jpeg" }),
    };
    await saveAdminPlace("bearer", {
      nombre: "Playa",
      descripcion: "",
      municipio: "La Paz",
      direccion: "",
      latitud: "",
      longitud: "",
      tipo: "playa",
      imagen: image,
      imagenEliminar: false,
    });
    const placeRequest = mock.requests.at(-1);
    assert.equal(placeRequest.url.endsWith("/api/lugares"), true);
    assert.equal(placeRequest.formData.get("nombre"), "Playa");
    assert.equal(placeRequest.formData.get("imagen").name, "new.jpg");

    await saveAdminPlace("bearer", {
      nombre: "Playa",
      descripcion: "",
      municipio: "La Paz",
      direccion: "",
      latitud: "",
      longitud: "",
      tipo: "playa",
      imagen: null,
      imagenEliminar: true,
    }, "place-1");
    const placeUpdate = mock.requests.at(-1);
    assert.equal(placeUpdate.method, "POST");
    assert.equal(placeUpdate.formData.get("_method"), "PUT");
    assert.equal(placeUpdate.formData.get("imagenEliminar"), "true");

    await saveAdminFloraFauna("bearer", {
      nombre: "Cardón",
      nombreCientifico: "Pachycereus pringlei",
      tipo: "flora",
      descripcion: "Cactus nativo.",
      habitat: "Desierto",
      estadoConservacion: "",
      ubicacionNombre: "Sierra",
      latitud: "24",
      longitud: "-110",
      fuenteInformacion: "CONABIO",
      imagenes: [image],
      imagenesEliminar: [0],
    }, "species-1");
    const floraRequest = mock.requests.at(-1);
    assert.equal(floraRequest.method, "POST");
    assert.equal(floraRequest.formData.get("_method"), "PUT");
    assert.equal(floraRequest.formData.get("ubicacion[nombre]"), "Sierra");
    assert.deepEqual(floraRequest.formData.getAll("imagenesEliminar[]"), ["0"]);
    assert.equal(floraRequest.formData.getAll("imagenes[]").length, 1);

    await saveAdminArticle("bearer", {
      titulo: "Cuidado costero",
      contenido: "Información ambiental.",
      categoria: "conservación",
      imagenes: [image],
      imagenesEliminar: [0],
    }, "article-1");
    const articleRequest = mock.requests.at(-1);
    assert.equal(articleRequest.formData.get("_method"), "PUT");
    assert.deepEqual(articleRequest.formData.getAll("imagenesEliminar[]"), ["0"]);
    assert.equal(articleRequest.formData.getAll("imagenes[]").length, 1);
    await deleteAdminArticle("bearer", "article-1");
    assert.equal(mock.requests.at(-1).method, "DELETE");
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
  const mock = installFetch((request) => {
    if (request.url.endsWith("/api/asistencias/solicitudes")) {
      return {
        success: true,
        message: "Enviamos tu solicitud al propietario del voluntariado.",
        solicitud: { id: "request-1", estado: "pendiente" },
      };
    }
    if (request.url.endsWith("/api/asistencias/solicitudes/request-1/responder")) {
      return { success: true, message: "La solicitud fue rechazada." };
    }
    return {
      success: true,
      asistencia: { ...attendance, metodo: request.body.metodo },
      data: { id: "volunteer-1" },
    };
  });
  try {
    assert.equal((await scanAttendanceQr("bearer", "qr-token")).metodo, "QR");
    assert.equal((await registerManualAttendance("bearer", "user-1", "volunteer-1")).metodo, "manual");
    await updateAttendanceCode("bearer", "volunteer-1", false);
    assert.deepEqual(
      await requestAttendanceCorrection("bearer", "volunteer-1"),
      {
        id: "request-1",
        estado: "pendiente",
        message: "Enviamos tu solicitud al propietario del voluntariado.",
      },
    );
    assert.equal(
      await respondAttendanceCorrection("bearer", "request-1", "rechazar", "No se localizó."),
      "La solicitud fue rechazada.",
    );
    assert.deepEqual(mock.requests[0].body, { metodo: "QR", tokenAsistencia: "qr-token" });
    assert.deepEqual(mock.requests[1].body, {
      metodo: "manual",
      usuarioId: "user-1",
      voluntariadoId: "volunteer-1",
    });
    assert.equal(mock.requests[2].method, "PATCH");
    assert.equal(mock.requests[2].url, "https://api.example.test/api/admin/voluntariados/volunteer-1/codigo-asistencia");
    assert.equal(mock.requests[3].url, "https://api.example.test/api/asistencias/solicitudes");
    assert.deepEqual(mock.requests[3].body, { voluntariadoId: "volunteer-1" });
    assert.equal(mock.requests[4].method, "PATCH");
    assert.deepEqual(mock.requests[4].body, { decision: "rechazar", motivo: "No se localizó." });
  } finally {
    mock.restore();
  }
});

test("deletes a managed activity only after API confirmation", async () => {
  const mock = installFetch(() => ({ data: { id: "volunteer-1" } }));
  try {
    await deleteManagedVolunteer("organizer-token", "volunteer-1");
    assert.equal(mock.requests[0].method, "DELETE");
    assert.equal(
      mock.requests[0].url,
      "https://api.example.test/api/admin/voluntariados/volunteer-1",
    );
    assert.equal(mock.requests[0].headers.get("Authorization"), "Bearer organizer-token");
  } finally {
    mock.restore();
  }
});
