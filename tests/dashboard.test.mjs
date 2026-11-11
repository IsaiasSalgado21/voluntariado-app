import assert from "node:assert/strict";
import test from "node:test";
import { getDashboardForRole } from "../src/features/dashboard.ts";

test("provides distinct dashboard cards for volunteer, organizer, and admin roles", () => {
  const volunteer = getDashboardForRole("usuario");
  const organizer = getDashboardForRole("organizador");
  const admin = getDashboardForRole("admin");

  assert.ok(volunteer.cards.some((card) => card.action === "volunteers"));
  assert.ok(volunteer.cards.some((card) => card.action === "enrollments"));
  assert.ok(organizer.cards.some((card) => card.title === "Mis voluntariados" && card.action === "manageVolunteers"));
  assert.ok(admin.cards.some((card) => card.title === "Usuarios y roles" && card.action === "users"));
  assert.ok(admin.cards.every((card) => card.title !== "Mis inscripciones"));
});

test("does not grant features to unknown roles", () => {
  const dashboard = getDashboardForRole("unknown");
  assert.equal(dashboard.cards.length, 0);
  assert.match(dashboard.subtitle, /no hay un panel asignado/);
});
