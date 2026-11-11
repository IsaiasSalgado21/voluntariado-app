import assert from "node:assert/strict";
import test from "node:test";
import { parseSpeciesList } from "../src/features/flora-fauna/api.ts";
import { filterSpecies } from "../src/features/flora-fauna/filters.ts";

const sample = [
  {
    id: "mangle",
    nombre: "Mangle Rojo",
    nombreCientifico: "Rhizophora mangle",
    tipo: "flora",
    descripcion: "Árbol halófito de la costa.",
    habitat: "Esteros y zonas intermareales costeras",
    estadoConservacion: "Protección especial",
    estado: "publicado",
    imagenes: ["https://example.test/mangle.png"],
    ubicacion: { nombre: "Ensenada de La Paz", latitud: 24.14, longitud: -110.31 },
    lugaresRelacionados: [],
    fuenteInformacion: "CONABIO",
    creadoPor: null,
    zonaAproximada: false,
  },
  {
    id: "tortuga",
    nombre: "Tortuga Negra",
    nombreCientifico: "Chelonia agassizii",
    tipo: "fauna",
    descripcion: "Especie marina costera.",
    habitat: "Aguas costeras",
    estadoConservacion: "en_peligro",
    estado: "publicado",
    imagenes: [],
    ubicacion: { nombre: "Bahía de La Paz", latitud: 24.2, longitud: -110.35 },
    lugaresRelacionados: [],
    fuenteInformacion: null,
    creadoPor: null,
    zonaAproximada: true,
  },
];

test("parses public published species while preserving generalized locations", () => {
  const records = parseSpeciesList(sample);
  assert.equal(records.length, 2);
  assert.equal(records[0].nombreCientifico, "Rhizophora mangle");
  assert.equal(records[0].imagenes[0], "https://example.test/mangle.png");
  assert.equal(records[1].zonaAproximada, true);
  assert.equal(records[1].ubicacionNombre, "Bahía de La Paz");
  assert.equal("latitud" in records[1], false);
  assert.equal("longitud" in records[1], false);
});

test("filters by type and accent-insensitive species information", () => {
  const records = parseSpeciesList(sample);
  assert.deepEqual(filterSpecies(records, "mangle"), [records[0]]);
  assert.deepEqual(filterSpecies(records, "proteccion", "flora"), [records[0]]);
  assert.deepEqual(filterSpecies(records, "conservación", "fauna"), []);
  assert.deepEqual(filterSpecies(records, "", "fauna"), [records[1]]);
});

test("rejects malformed or unknown species records", () => {
  assert.throws(() => parseSpeciesList([{ id: "missing-fields" }]), /formato inesperado/);
  assert.throws(() => parseSpeciesList([{ ...sample[0], tipo: "insecto" }]), /formato inesperado/);
  assert.deepEqual(parseSpeciesList([]), []);
});
