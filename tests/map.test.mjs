import assert from "node:assert/strict";
import test from "node:test";
import { parseSpeciesMapPoints } from "../src/features/map/api.ts";
import { getMapMarkerPresentation, MAP_LEGEND } from "../src/features/map/presentation.ts";

const response = {
  success: true,
  data: [
    {
      id: "mangle",
      tipo: "flora",
      nombre: "Mangle rojo",
      nombre_cientifico: "Rhizophora mangle",
      descripcion: "Árbol halófito costero.",
      estado_conservacion: "Protección especial",
      lat: 24.14,
      lng: -110.31,
      zona_aproximada: false,
      radio_metros: null,
    },
    {
      id: "tortuga",
      tipo: "fauna",
      nombre: "Tortuga negra",
      nombre_cientifico: null,
      descripcion: null,
      estado_conservacion: "en_peligro",
      lat: 24.2,
      lng: -110.35,
      zona_aproximada: true,
      radio_metros: 5000,
    },
  ],
};

test("parses flora and fauna map points and generalized-location radius", () => {
  const points = parseSpeciesMapPoints(response);

  assert.deepEqual(points, [
    {
      id: "mangle",
      tipo: "flora",
      nombre: "Mangle rojo",
      nombreCientifico: "Rhizophora mangle",
      descripcion: "Árbol halófito costero.",
      estadoConservacion: "Protección especial",
      lat: 24.14,
      lng: -110.31,
      zonaAproximada: false,
      radioMetros: null,
    },
    {
      id: "tortuga",
      tipo: "fauna",
      nombre: "Tortuga negra",
      nombreCientifico: null,
      descripcion: null,
      estadoConservacion: "en_peligro",
      lat: 24.2,
      lng: -110.35,
      zonaAproximada: true,
      radioMetros: 5000,
    },
  ]);
});

test("rejects malformed or out-of-range map species points", () => {
  assert.throws(() => parseSpeciesMapPoints({ success: true, data: [{ id: "missing" }] }), /formato inesperado/);
  assert.throws(
    () => parseSpeciesMapPoints({
      success: true,
      data: [{ ...response.data[0], lng: -181 }],
    }),
    /formato inesperado/,
  );
  assert.throws(
    () => parseSpeciesMapPoints({
      success: true,
      data: [{ ...response.data[0], radio_metros: -1 }],
    }),
    /formato inesperado/,
  );
});

test("provides distinct symbols for map layers and full volunteer activities", () => {
  assert.equal(getMapMarkerPresentation("voluntariado").symbol, "voluntariado");
  assert.equal(getMapMarkerPresentation("voluntariado", true).symbol, "cancelado");
  assert.equal(getMapMarkerPresentation("lugar").symbol, "ubicacion");
  assert.equal(getMapMarkerPresentation("flora").symbol, "flora");
  assert.equal(getMapMarkerPresentation("fauna").symbol, "fauna");
  assert.equal(MAP_LEGEND.length, 5);
});
