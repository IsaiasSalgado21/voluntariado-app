import assert from "node:assert/strict";
import test from "node:test";
import {
  buildVolunteerQuery,
  parsePlaces,
  parseVolunteerMapItems,
} from "../src/features/voluntariados/api.ts";
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
