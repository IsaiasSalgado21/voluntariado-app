import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { fetchArticles, type Article } from "@/features/articulos/api";
import { filterArticles } from "@/features/articulos/filters";

export default function ArticleListScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const scheme = Colors.dark.background === theme.background ? "dark" : "light";
  const colors = Colors[scheme];
  const [articles, setArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchArticles(controller.signal)
      .then(setArticles)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "No se pudieron cargar los artículos.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [refreshKey]);

  const categories = useMemo(
    () => [...new Set(articles.map((article) => article.categoria))].sort((a, b) => a.localeCompare(b, "es-MX")),
    [articles],
  );
  const visibleArticles = useMemo(
    () => filterArticles(articles, search, category),
    [articles, search, category],
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver a más opciones"
        onPress={() => router.canGoBack() ? router.back() : router.replace("/mas")}
        style={styles.backButton}
      >
        <Text style={styles.backText}>‹  Más opciones</Text>
      </Pressable>
      <Text style={styles.eyebrow}>REGENERA · CONOCIMIENTO AMBIENTAL</Text>
      <Text style={[styles.title, { color: colors.text }]}>Artículos</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Ideas e información para cuidar nuestros ecosistemas.
      </Text>

      <TextInput
        accessibilityLabel="Buscar por título, contenido, categoría o autor"
        placeholder="Buscar artículos"
        placeholderTextColor={colors.textSecondary}
        value={search}
        onChangeText={setSearch}
        style={[styles.searchInput, { color: colors.text, backgroundColor: colors.backgroundElement }]}
        returnKeyType="search"
      />

      {categories.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}>
          <CategoryChoice
            label="Todos"
            selected={!category}
            colors={colors}
            onPress={() => setCategory(undefined)}
          />
          {categories.map((item) => (
            <CategoryChoice
              key={item}
              label={item}
              selected={category === item}
              colors={colors}
              onPress={() => setCategory(item)}
            />
          ))}
        </ScrollView>
      )}

      <View style={styles.resultsHeading}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Publicaciones</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Actualizar artículos"
          onPress={() => setRefreshKey((key) => key + 1)}
        >
          <Text style={styles.refreshText}>Actualizar</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color="#164F3D" />
          <Text style={[styles.helper, { color: colors.textSecondary }]}>Cargando artículos…</Text>
        </View>
      ) : error ? (
        <View style={styles.stateBox}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>No pudimos cargar los artículos</Text>
          <Text style={[styles.helper, { color: colors.textSecondary }]}>{error}</Text>
          <Pressable onPress={() => setRefreshKey((key) => key + 1)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : visibleArticles.length === 0 ? (
        <View style={[styles.stateBox, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>No encontramos artículos</Text>
          <Text style={[styles.helper, { color: colors.textSecondary }]}>
            Prueba otra categoría o cambia el texto de búsqueda.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {visibleArticles.map((article) => (
            <Pressable
              key={article.id}
              accessibilityRole="button"
              accessibilityLabel={`Leer artículo: ${article.titulo}`}
              onPress={() => router.push({ pathname: "/articulos/[id]", params: { id: article.id } })}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.86 : 1 },
              ]}
            >
              {article.imagen ? (
                <Image
                  accessibilityLabel={`Imagen de ${article.titulo}`}
                  source={{ uri: article.imagen }}
                  style={styles.image}
                />
              ) : (
                <View style={[styles.imagePlaceholder, { backgroundColor: colors.backgroundSelected }]}>
                  <Text style={styles.placeholderIcon}>📚</Text>
                </View>
              )}
              <View style={styles.cardContent}>
                <Text style={styles.categoryBadge}>{article.categoria}</Text>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{article.titulo}</Text>
                <Text numberOfLines={3} style={[styles.excerpt, { color: colors.textSecondary }]}>
                  {article.contenido}
                </Text>
                <Text style={[styles.meta, { color: colors.textSecondary }]}>
                  {article.autorNombre ? `Por ${article.autorNombre}` : "Regenera"}
                  {article.fechaPublicacion ? `  ·  ${formatDate(article.fechaPublicacion)}` : ""}
                </Text>
                <Text style={styles.cardLink}>Leer artículo →</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={[styles.dataNote, { color: colors.textSecondary }]}>
        Se muestran únicamente artículos publicados.
      </Text>
    </ScrollView>
  );
}

function CategoryChoice({
  label,
  selected,
  colors,
  onPress,
}: {
  label: string;
  selected: boolean;
  colors: (typeof Colors)[keyof typeof Colors];
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.choice, { backgroundColor: selected ? "#164F3D" : colors.backgroundElement }]}
    >
      <Text style={{ color: selected ? "#FFFFFF" : colors.text, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, gap: 12 },
  backButton: { paddingVertical: 2 },
  backText: { color: "#164F3D", fontSize: 15, fontWeight: "700" },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  title: { fontSize: 28, fontWeight: "800" },
  subtitle: { fontSize: 15, lineHeight: 21, marginBottom: 4 },
  searchInput: { borderRadius: 14, paddingHorizontal: 15, paddingVertical: 13, fontSize: 15 },
  choices: { flexDirection: "row", alignItems: "center", gap: 8, paddingRight: 8 },
  choice: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18 },
  resultsHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  sectionTitle: { fontSize: 20, fontWeight: "800" },
  refreshText: { color: "#164F3D", fontWeight: "700" },
  list: { gap: 12 },
  card: { borderRadius: 18, overflow: "hidden" },
  image: { width: "100%", height: 190, backgroundColor: "#DCE8DF" },
  imagePlaceholder: { width: "100%", height: 140, justifyContent: "center", alignItems: "center" },
  placeholderIcon: { fontSize: 42 },
  cardContent: { padding: 16, gap: 8 },
  categoryBadge: { color: "#164F3D", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  cardTitle: { fontSize: 18, fontWeight: "800", lineHeight: 24 },
  excerpt: { fontSize: 14, lineHeight: 20 },
  meta: { fontSize: 12, lineHeight: 18, fontWeight: "600" },
  cardLink: { color: "#164F3D", fontSize: 14, fontWeight: "700", marginTop: 2 },
  helper: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  stateBox: { minHeight: 120, justifyContent: "center", alignItems: "center", borderRadius: 18, padding: 18, gap: 8 },
  primaryButton: { backgroundColor: "#164F3D", borderRadius: 13, minHeight: 44, justifyContent: "center", alignItems: "center", paddingHorizontal: 16 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  dataNote: { fontSize: 12, lineHeight: 17, marginTop: 4, marginBottom: 8 },
});
