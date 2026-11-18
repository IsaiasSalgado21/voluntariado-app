import assert from "node:assert/strict";
import test from "node:test";
import { filterManagedVolunteersByTitle } from "../src/features/organizador/api.ts";

test("filters managed activities by title as the user types", () => {
  const items = [
    { id: "1", titulo: "Limpieza de playa", categoria: "conservacion", descripcion: "Reforestación costera" },
    { id: "2", titulo: "Jornada de REFORESTACIÓN", categoria: "limpieza" },
    { id: "3", titulo: "Educación ambiental costera", categoria: "" },
    { id: "4", titulo: "Restauración de manglar", categoria: "limpieza" },
  ];

  assert.deepEqual(filterManagedVolunteersByTitle(items, ""), items);
  assert.deepEqual(
    filterManagedVolunteersByTitle(items, "LIMPIEZA").map((item) => item.id),
    ["1"],
  );
  assert.deepEqual(
    filterManagedVolunteersByTitle(items, "reforestacion").map((item) => item.id),
    ["2"],
  );
  assert.deepEqual(
    filterManagedVolunteersByTitle(items, " educacion-ambiental ").map((item) => item.id),
    ["3"],
  );
  assert.deepEqual(filterManagedVolunteersByTitle(items, "restauracion").map((item) => item.id), ["4"]);
  assert.deepEqual(filterManagedVolunteersByTitle(items, "no existe"), []);
});
