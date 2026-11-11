import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  parseNotificationList,
} from "../src/features/notificaciones/api.ts";

const sampleNotification = {
  id: "notification-1",
  tipo: "inscripcion_confirmada",
  titulo: "Inscripción confirmada",
  mensaje: "Tu lugar está reservado.",
  prioridad: "media",
  leida: false,
  fechaCreacion: "2026-03-10T12:00:00.000Z",
  entidad: { tipo: "voluntariado", id: "volunteer-1" },
  esPropia: true,
};

test("parses notification list fields and ownership", () => {
  const [notification] = parseNotificationList({ data: [sampleNotification] });
  assert.equal(notification.id, "notification-1");
  assert.equal(notification.esPropia, true);
  assert.deepEqual(notification.entidad, { tipo: "voluntariado", id: "volunteer-1" });
  assert.deepEqual(parseNotificationList({ data: [] }), []);
});

test("rejects malformed notification responses", () => {
  assert.throws(() => parseNotificationList({ data: [{ id: "x" }] }), /formato inesperado/);
  assert.throws(() => parseNotificationList({ data: null }), /formato esperado/);
});

test("uses authenticated list and read-notification API contracts", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiUrl = process.env.EXPO_PUBLIC_REGENERA_API_URL;
  const requests = [];
  process.env.EXPO_PUBLIC_REGENERA_API_URL = "https://api.example.test";
  globalThis.fetch = async (input, init = {}) => {
    const request = {
      url: String(input),
      method: init.method ?? "GET",
      headers: new Headers(init.headers),
    };
    requests.push(request);
    const body = request.url.endsWith("/leida")
      ? { data: { ...sampleNotification, leida: true } }
      : request.url.endsWith("/marcar-todas-leidas")
        ? { data: [], message: "Todas las notificaciones fueron marcadas como leídas." }
        : { data: [sampleNotification] };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    assert.equal((await fetchNotifications("token"))[0].id, "notification-1");
    assert.equal((await markNotificationRead("token", "notification-1")).leida, true);
    await markAllNotificationsRead("token");
    assert.equal(requests[0].url, "https://api.example.test/api/notificaciones");
    assert.ok(requests[0].headers.get("Authorization")?.startsWith("Bearer "));
    assert.equal(requests[1].method, "PATCH");
    assert.equal(requests[1].url, "https://api.example.test/api/notificaciones/notification-1/leida");
    assert.equal(requests[2].method, "PATCH");
    assert.equal(requests[2].url, "https://api.example.test/api/notificaciones/marcar-todas-leidas");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_REGENERA_API_URL;
    else process.env.EXPO_PUBLIC_REGENERA_API_URL = originalApiUrl;
  }
});
