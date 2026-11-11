import type { Article } from "./api";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-MX")
    .trim();
}

export function filterArticles(
  articles: Article[],
  search: string,
  category?: string,
): Article[] {
  const query = normalize(search);

  return articles.filter((article) => {
    if (category && article.categoria !== category) return false;
    if (!query) return true;

    return normalize([
      article.titulo,
      article.contenido,
      article.categoria,
      article.autorNombre ?? "",
    ].join(" ")).includes(query);
  });
}
