import assert from "node:assert/strict";
import test from "node:test";
import {
  buildVolunteerQuery,
  fetchVoluntariado,
  fetchVolunteerPlace,
  parseVolunteerDetail,
  parsePlaces,
  parseVolunteerMapItems,
  parseVolunteerPlaceDetail,
} from "../src/features/voluntariados/api.ts";
import { resolveApiAssetUrl } from "../src/features/api-client.ts";
import {
  filterVoluntariados,
  isValidIsoDate,
  validateDateRange,
} from "../src/features/voluntariados/filters.ts";

const sample = [
  {
    id: "1",
    titulo: "Limpieza de playa",
    descripcion: "Recolección en El Coromuel",
    categoria: "limpieza",
    fecha_inicio: "2026-12-01T08:00:00.000Z",
    lugar_id: "place-1",
    lugar_nombre: "El Coromuel",
    cupo: 20,
    inscripciones_activas: 5,
    lleno: false,
    lat: 24.16,
    lng: -110.3,
  },
  {
    id: "2",
    titulo: "Restauración de manglar",
    descripcion: "Actividad de conservación",
    categoria: "restauracion",
    fecha_inicio: "2026-12-05T08:00:00.000Z",
    lugar_id: "place-2",
    lugar_nombre: "La Paz",
    cupo: 10,
    inscripciones_activas: 10,
    lleno: true,
    lat: 24.15,
    lng: -110.31,
  },
];

test("builds only the filters supported by the public map endpoint", () => {
  const query = buildVolunteerQuery({
    categoria: "limpieza",
    fecha_desde: "2026-12-01",
    fecha_hasta: "2026-12-31",
    lugar_id: "place 1",
    disponibles: false,
  });

  assert.equal(
    query.toString(),
    "categoria=limpieza&fecha_desde=2026-12-01&fecha_hasta=2026-12-31&lugar_id=place+1&disponibles=0",
  );
});

test("filters search text without accents across title, description, category, and place", () => {
  assert.deepEqual(filterVoluntariados(sample, "coromuel"), [sample[0]]);
  assert.deepEqual(filterVoluntariados(sample, "RESTAURACION"), [sample[1]]);
  assert.deepEqual(filterVoluntariados(sample, "   "), sample);
});

test("validates real ISO dates and date order", () => {
  assert.equal(isValidIsoDate("2026-02-28"), true);
  assert.equal(isValidIsoDate("2026-02-30"), false);
  assert.equal(validateDateRange("2026-12-01", "2026-12-31"), null);
  assert.match(validateDateRange("2026-12-31", "2026-12-01") ?? "", /posterior/);
});

test("rejects malformed public API records instead of fabricating defaults", () => {
  assert.throws(() => parseVolunteerMapItems([{ id: "missing-fields" }]), /formato inesperado/);
  assert.deepEqual(parseVolunteerMapItems([]), []);
});

test("parses the individual detail contract without requiring map coordinates", () => {
  const detail = parseVolunteerDetail({
    _id: "volunteer-detail",
    titulo: "Restauración de dunas",
    descripcion: "Revegetación de una zona costera.",
    categoria: "restauracion",
    estado: "publicado",
    fechaInicio: "2026-12-01T08:00:00.000Z",
    fechaFin: "2026-12-01T12:00:00.000Z",
    horaInicio: "08:00",
    horaFin: "12:00",
    lugarId: "place-1",
    latitud: null,
    longitud: null,
    cupo: 15,
    requisitos: ["Usar calzado cerrado"],
    materiales: ["Guantes"],
    organizadorNombre: "Colectivo Costero",
    organizadorFoto: null,
    finalizadoPorFecha: false,
    imagen: null,
    imagenes: [],
  }, "fallback-id");

  assert.equal(detail.id, "volunteer-detail");
  assert.equal(detail.fechaInicio, "2026-12-01T08:00:00.000Z");
  assert.equal(detail.horaFin, "12:00");
  assert.deepEqual(detail.requisitos, ["Usar calzado cerrado"]);
  assert.deepEqual(detail.materiales, ["Guantes"]);
  assert.equal(detail.latitud, null);
  assert.equal(detail.longitud, null);
  assert.equal(detail.organizadorNombre, "Colectivo Costero");
  assert.equal(detail.comentariosPorDefecto, "publico");
  assert.equal(parseVolunteerDetail({
    _id: "private-comments",
    titulo: "Actividad con dudas privadas",
    descripcion: "Descripción.",
    categoria: null,
    estado: "publicado",
    fechaInicio: null,
    fechaFin: null,
    horaInicio: null,
    horaFin: null,
    lugarId: "place-1",
    cupo: 5,
    imagen: null,
    organizadorNombre: null,
    organizadorFoto: null,
    comentarios_por_defecto: "privado",
  }, "fallback-id").comentariosPorDefecto, "privado");
});

test("loads detail by ID rather than searching the map list and can fetch its place directly", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiUrl = process.env.EXPO_PUBLIC_REGENERA_API_URL;
  const requests = [];
  process.env.EXPO_PUBLIC_REGENERA_API_URL = "https://api.example.test";
  globalThis.fetch = async (input) => {
    const url = String(input);
    requests.push(url);
    const body = url.endsWith("/api/lugares/place-1")
      ? {
        data: {
          id: "place-1",
          nombre: "Dunas del Mogote",
          descripcion: null,
          municipio: "La Paz",
          tipo: "playa",
          latitud: null,
          longitud: null,
        },
      }
      : {
        success: true,
        voluntariado: {
          _id: "activity-1",
          titulo: "Restauración de dunas",
          descripcion: "Actividad de conservación.",
          categoria: "restauracion",
          estado: "publicado",
          fechaInicio: null,
          fechaFin: null,
          horaInicio: null,
          horaFin: null,
          lugarId: "place-1",
          latitud: null,
          longitud: null,
          cupo: 12,
          requisitos: [],
          materiales: [],
          organizadorNombre: null,
          organizadorFoto: null,
          finalizadoPorFecha: false,
          comentarios_por_defecto: "privado",
          imagen: null,
          imagenes: [],
        },
      };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const detail = await fetchVoluntariado("activity-1");
    const place = await fetchVolunteerPlace(detail.lugarId);
    assert.equal(detail.id, "activity-1");
    assert.equal(detail.comentariosPorDefecto, "privado");
    assert.equal(place.nombre, "Dunas del Mogote");
    assert.deepEqual(requests, [
      "https://api.example.test/api/voluntariados/activity-1",
      "https://api.example.test/api/lugares/place-1",
    ]);
    assert.deepEqual(parseVolunteerPlaceDetail({
      data: { id: "place-2", nombre: "Lugar sin coordenadas", latitud: null, longitud: null },
    }), {
      id: "place-2",
      nombre: "Lugar sin coordenadas",
      descripcion: null,
      municipio: null,
      tipo: null,
      latitud: null,
      longitud: null,
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_REGENERA_API_URL;
    else process.env.EXPO_PUBLIC_REGENERA_API_URL = originalApiUrl;
  }
});

test("parses volunteer image galleries and resolves local API image hosts", () => {
  const originalUrl = process.env.EXPO_PUBLIC_REGENERA_API_URL;
  process.env.EXPO_PUBLIC_REGENERA_API_URL = "http://192.168.1.221:8001";
  try {
    const [item] = parseVolunteerMapItems([{
      ...sample[0],
      imagen: "http://127.0.0.1:8000/api/imagen/voluntariados/foto.jpg",
      imagenes: ["/api/imagen/voluntariados/foto.jpg", "https://cdn.example.test/otra.jpg"],
    }]);
    assert.equal(item.imagen, "http://192.168.1.221:8001/api/imagen/voluntariados/foto.jpg");
    assert.deepEqual(item.imagenes, [
      "http://192.168.1.221:8001/api/imagen/voluntariados/foto.jpg",
      "https://cdn.example.test/otra.jpg",
    ]);
    assert.equal(resolveApiAssetUrl(null), null);
  } finally {
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_REGENERA_API_URL;
    else process.env.EXPO_PUBLIC_REGENERA_API_URL = originalUrl;
  }
});

test("parses real place descriptions, categories, images, and map coordinates", () => {
  const places = parsePlaces([
    {
      id: "place-1",
      tipo: "lugar",
      nombre: "Playa Balandra",
      descripcion: "Área costera protegida.",
      municipio: "La Paz",
      tipo_lugar: "playa",
      imagen: null,
      lat: 24.3217,
      lng: -110.3248,
    },
  ]);

  assert.deepEqual(places, [
    {
      id: "place-1",
      nombre: "Playa Balandra",
      descripcion: "Área costera protegida.",
      municipio: "La Paz",
      tipo: "playa",
      imagen: null,
      lat: 24.3217,
      lng: -110.3248,
    },
  ]);
});

test("rejects places without valid map coordinates", () => {
  assert.throws(() => parsePlaces([{ id: "place-1", nombre: "Sin coordenadas" }]), /formato inesperado/);
  assert.throws(() => parsePlaces([{
    id: "place-2",
    nombre: "Coordenada inválida",
    lat: 100,
    lng: -110,
  }]), /formato inesperado/);
});
