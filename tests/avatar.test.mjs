import assert from "node:assert/strict";
import test from "node:test";
import { AVATAR_OPTION_GROUPS, isAccessoryLocked, normalizeAvatarConfig } from "../src/features/avatar/options.ts";
import { assertAvatarPng, base64ToBytes } from "../src/features/avatar/png.ts";
import { renderAvatarMarkup } from "../src/features/avatar/renderer.ts";
import { parseEarnedMedalSlugs } from "../src/features/gamificacion/progreso.ts";
import { parsePublicProfile } from "../src/features/perfiles/api.ts";

test("renders every option of every group into a valid SVG without web-only styling", () => {
  for (const group of AVATAR_OPTION_GROUPS) {
    for (const [value] of group.options) {
      const svg = renderAvatarMarkup({ [group.category]: value });
      assert.match(svg, /^<svg[^>]*viewBox="0 0 200 200"/);
      assert.doesNotMatch(svg, /undefined|class=|<style/);
    }
  }
});

test("locks reward accessories until the matching medal is earned", () => {
  assert.equal(isAccessoryLocked("hat", new Set()), true);
  assert.equal(isAccessoryLocked("hat", new Set(["voluntario-seguro"])), false);
  assert.equal(isAccessoryLocked("sunglasses", new Set()), false);

  const config = normalizeAvatarConfig({ accessory: "hat", skin: "bogus", outfit: "blue" });
  assert.equal(config.accessory, "none");
  assert.equal(config.skin, "light");
  assert.equal(config.outfit, "blue");
  assert.equal(normalizeAvatarConfig({ accessory: "hat" }, new Set(["voluntario-seguro"])).accessory, "hat");
});

test("decodes base64 PNG data and enforces PNG signature and size", () => {
  const png = base64ToBytes("data:image/png;base64,iVBORw0KGgo=");
  assert.deepEqual([...png], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.doesNotThrow(() => assertAvatarPng(png));
  assert.throws(() => assertAvatarPng(base64ToBytes("aGVsbG8=")), /PNG/);
  assert.throws(() => assertAvatarPng(new Uint8Array(1024 * 1024 + 1).fill(0x89)), /PNG|1 MB/);
  assert.throws(() => base64ToBytes("***"), /inválida/);
});

test("reads earned medal slugs from the progress response", () => {
  const body = {
    data: {
      medallasObtenidas: [
        { slug: "voluntario-seguro", desbloqueada: true },
        { slug: "agente-circular" },
        { slug: "no", desbloqueada: false },
        null,
      ],
    },
  };
  assert.deepEqual(parseEarnedMedalSlugs(body), ["voluntario-seguro", "agente-circular"]);
  assert.throws(() => parseEarnedMedalSlugs({ data: {} }), /inválido/);
});

test("parses public profiles and tolerates private ones", () => {
  const profile = parsePublicProfile({
    success: true,
    data: {
      id: "507f1f77bcf86cd799439011",
      nombre: "Ana",
      foto: null,
      medallas: [{ slug: "guardian-manglar", nombre: "Guardián", descripcion: "x", icono: "leaf", fechaObtencion: null }, {}],
    },
  });
  assert.equal(profile.nombre, "Ana");
  assert.equal(profile.medallas.length, 1);
  assert.equal(profile.descripcion, null);
  assert.deepEqual(profile.enlacesSociales, []);
  assert.throws(() => parsePublicProfile({ success: true, data: {} }), /inválido/);
});
