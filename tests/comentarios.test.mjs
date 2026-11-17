import assert from "node:assert/strict";
import test from "node:test";
import {
  createVolunteerComment,
  deleteVolunteerComment,
  fetchVolunteerComments,
  parseVolunteerComment,
  parseVolunteerComments,
  publishVolunteerComment,
  replyToVolunteerComment,
  updateVolunteerCommentVisibility,
} from "../src/features/comentarios/api.ts";

const rootComment = {
  id: "comment-1",
  parent_id: null,
  contenido: "¿Qué materiales necesitamos?",
  es_privado: true,
  es_publicado: false,
  created_at: "2026-11-12T10:00:00.000Z",
  autor: { nombre: "Ana", rol: "usuario", foto: null },
  puede_moderar: false,
  puede_publicar: false,
  puede_eliminar: true,
};

const reply = {
  ...rootComment,
  id: "comment-2",
  parent_id: "comment-1",
  contenido: "Lleva guantes reutilizables.",
  es_privado: true,
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
    return new Response(JSON.stringify(await handler(request)), {
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

test("parses threaded comments and rejects incomplete permission data", () => {
  assert.deepEqual(parseVolunteerComments({ data: [rootComment, reply] }), [
    {
      id: "comment-1",
      parentId: null,
      contenido: "¿Qué materiales necesitamos?",
      esPrivado: true,
      esPublicado: false,
      createdAt: "2026-11-12T10:00:00.000Z",
      autor: { nombre: "Ana", rol: "usuario", foto: null },
      puedeModerar: false,
      puedePublicar: false,
      puedeEliminar: true,
    },
    {
      id: "comment-2",
      parentId: "comment-1",
      contenido: "Lleva guantes reutilizables.",
      esPrivado: true,
      esPublicado: false,
      createdAt: "2026-11-12T10:00:00.000Z",
      autor: { nombre: "Ana", rol: "usuario", foto: null },
      puedeModerar: false,
      puedePublicar: false,
      puedeEliminar: true,
    },
  ]);
  assert.throws(() => parseVolunteerComment({ ...rootComment, puede_moderar: undefined }), /formato inesperado/);
  assert.throws(() => parseVolunteerComments({ data: {} }), /formato inesperado/);
});

test("calls the authenticated comment, reply, moderation, publish, and delete routes", async () => {
  const mock = installFetch((request) => {
    if (request.method === "GET") return { data: [rootComment, reply] };
    if (request.method === "DELETE") return { message: "Comentario eliminado correctamente." };
    if (request.url.endsWith("/responder")) return { data: reply };
    if (request.url.endsWith("/visibilidad")) return { data: { ...rootComment, es_privado: false } };
    if (request.url.endsWith("/publicar")) {
      return { data: { ...rootComment, es_privado: false, es_publicado: true } };
    }
    return { data: rootComment };
  });

  try {
    assert.equal((await fetchVolunteerComments("test-token", "volunteer-1")).length, 2);
    assert.equal((await createVolunteerComment("test-token", "volunteer-1", "Pregunta", true)).id, "comment-1");
    assert.equal((await replyToVolunteerComment("test-token", "comment-1", "Respuesta")).parentId, "comment-1");
    assert.equal((await updateVolunteerCommentVisibility("test-token", "comment-1", false)).esPrivado, false);
    assert.equal((await publishVolunteerComment("test-token", "comment-1")).esPublicado, true);
    await deleteVolunteerComment("test-token", "comment-1");

    assert.deepEqual(mock.requests.map(({ method, url }) => [method, url]), [
      ["GET", "https://api.example.test/api/voluntariados/volunteer-1/comentarios"],
      ["POST", "https://api.example.test/api/voluntariados/volunteer-1/comentarios"],
      ["POST", "https://api.example.test/api/comentarios/comment-1/responder"],
      ["PATCH", "https://api.example.test/api/comentarios/comment-1/visibilidad"],
      ["PATCH", "https://api.example.test/api/comentarios/comment-1/publicar"],
      ["DELETE", "https://api.example.test/api/comentarios/comment-1"],
    ]);
    assert.equal(mock.requests.every(({ headers }) => headers.get("Authorization") === "Bearer test-token"), true);
    assert.deepEqual(mock.requests[1].body, { contenido: "Pregunta", es_privado: true });
    assert.deepEqual(mock.requests[2].body, { contenido: "Respuesta" });
    assert.deepEqual(mock.requests[3].body, { es_publicado: false });
  } finally {
    mock.restore();
  }
});
