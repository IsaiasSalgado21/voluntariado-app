import assert from "node:assert/strict";
import test from "node:test";
import { parseArticle, parseArticleList } from "../src/features/articulos/api.ts";
import { filterArticles } from "../src/features/articulos/filters.ts";

const sample = [
  {
    id: "manglar",
    autorNombre: "Regenera BCS",
    titulo: "La importancia de la restauración de manglares",
    contenido: "Los manglares protegen la costa y son hábitat de muchas especies.",
    imagen: "https://example.test/manglar.png",
    imagenes: ["https://example.test/manglar.png"],
    categoria: "Conservación",
    estado: "publicado",
    fechaPublicacion: "2026-11-07T09:08:37.547Z",
  },
  {
    id: "plasticos",
    autorNombre: null,
    titulo: "Reducir residuos plásticos en las playas",
    contenido: "Usar termos reutilizables reduce los residuos.",
    imagen: null,
    imagenes: [],
    categoria: "Educación Ambiental",
    estado: "publicado",
    fechaPublicacion: null,
  },
];

test("parses published articles and uses the first image as fallback", () => {
  const articles = parseArticleList(sample);
  assert.equal(articles.length, 2);
  assert.equal(articles[0].imagen, "https://example.test/manglar.png");
  assert.equal(articles[1].imagen, null);
});

test("searches article title, content, category, and author without accent sensitivity", () => {
  const articles = parseArticleList(sample);
  assert.deepEqual(filterArticles(articles, "manglares"), [articles[0]]);
  assert.deepEqual(filterArticles(articles, "educacion ambiental"), [articles[1]]);
  assert.deepEqual(filterArticles(articles, "regenera bcs"), [articles[0]]);
  assert.deepEqual(filterArticles(articles, "", "Conservación"), [articles[0]]);
});

test("rejects unpublished and malformed article payloads", () => {
  assert.throws(() => parseArticle({ ...sample[0], estado: "borrador" }), /no está publicado/);
  assert.throws(() => parseArticle({ id: "missing-fields" }), /formato inesperado/);
  assert.deepEqual(parseArticleList([]), []);
});
