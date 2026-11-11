import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { fetchArticle, type Article } from "@/features/articulos/api";

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const articleId = (Array.isArray(id) ? id[0] : id) ?? "";
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const scheme = Colors.dark.background === theme.background ? "dark" : "light";
  const colors = Colors[scheme];
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchArticle(articleId, controller.signal)
      .then(setArticle)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "No se pudo cargar el artículo.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [articleId]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/articulos");
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color="#164F3D" size="large" />
        <Text style={[styles.muted, { color: colors.textSecondary }]}>Cargando artículo…</Text>
      </View>
    );
  }

  if (error || !article) {
    return (
      <View style={[styles.center, styles.errorState, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {error ? "No pudimos abrir este artículo" : "Artículo no disponible"}
        </Text>
        <Text style={[styles.muted, { color: colors.textSecondary }]}>
          {error ?? "El artículo pudo dejar de estar publicado."}
        </Text>
        <Pressable onPress={goBack} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Volver a artículos</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 10,
        paddingBottom: insets.bottom + 28,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver a la lista de artículos"
        onPress={goBack}
        style={styles.backButton}
      >
        <Text style={styles.backText}>‹  Artículos</Text>
      </Pressable>

      {article.imagen ? (
        <Image
          accessibilityLabel={`Imagen de ${article.titulo}`}
          source={{ uri: article.imagen }}
          style={styles.heroImage}
        />
      ) : (
        <View style={[styles.heroPlaceholder, { backgroundColor: colors.backgroundSelected }]}>
          <Text style={styles.placeholderIcon}>📚</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={[styles.hero, { backgroundColor: colors.backgroundElement }]}>
          <Text style={styles.category}>{article.categoria}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{article.titulo}</Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            {article.autorNombre ? `Por ${article.autorNombre}` : "Regenera"}
            {article.fechaPublicacion ? `  ·  ${formatDate(article.fechaPublicacion)}` : ""}
          </Text>
        </View>

        <View style={[styles.bodyCard, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.body, { color: colors.text }]}>{article.contenido}</Text>
        </View>
      </View>
    </ScrollView>
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
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 24 },
  errorState: { alignItems: "stretch" },
  backButton: { paddingHorizontal: 20, paddingVertical: 10 },
  backText: { color: "#164F3D", fontSize: 16, fontWeight: "700" },
  heroImage: { width: "100%", height: 250, backgroundColor: "#DCE8DF" },
  heroPlaceholder: { width: "100%", height: 200, justifyContent: "center", alignItems: "center" },
  placeholderIcon: { fontSize: 60 },
  content: { paddingHorizontal: 18, gap: 12 },
  hero: { padding: 18, borderRadius: 18, gap: 9 },
  category: { color: "#164F3D", fontSize: 12, fontWeight: "800", letterSpacing: 0.6 },
  title: { fontSize: 26, fontWeight: "800", lineHeight: 34 },
  meta: { fontSize: 13, lineHeight: 19, fontWeight: "600" },
  bodyCard: { padding: 18, borderRadius: 18 },
  body: { fontSize: 16, lineHeight: 26 },
  muted: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  primaryButton: { backgroundColor: "#164F3D", borderRadius: 13, minHeight: 44, justifyContent: "center", alignItems: "center", paddingHorizontal: 16 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
