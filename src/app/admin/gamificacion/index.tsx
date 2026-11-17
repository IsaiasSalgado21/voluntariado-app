import { router } from "expo-router";
import { useEffect, useState } from "react";
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
import { useSession } from "@/features/auth/use-session";
import {
  fetchAdminGamificationStatistics,
  type AdminGamificationStatistics,
  type AdminQuizAttempt,
} from "@/features/gamificacion/admin-api";
import { resolveApiAssetUrl } from "@/features/api-client";

type ThemeColors = typeof Colors.light | typeof Colors.dark;

export default function AdminGamificationScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colors = Colors[Colors.dark.background === theme.background ? "dark" : "light"];
  const { status, token, user } = useSession();
  const [statistics, setStatistics] = useState<AdminGamificationStatistics | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void Promise.resolve().then(async () => {
      if (status !== "authenticated" || !token || user?.rol !== "admin") {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await fetchAdminGamificationStatistics(token, controller.signal);
        if (active) setStatistics(result);
      } catch (cause) {
        if (active && !controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "No se pudieron cargar las estadísticas de aprendizaje.");
        }
      } finally {
        if (active && !controller.signal.aborted) setLoading(false);
      }
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [status, token, user?.rol, refreshKey]);

  const goBack = () => router.canGoBack() ? router.back() : router.replace("/dashboard");
  const visibleQuizzes = (statistics?.cuestionarios ?? []).filter((quiz) => {
    const query = search.trim().toLocaleLowerCase("es-MX");
    return !query || quiz.titulo.toLocaleLowerCase("es-MX").includes(query)
      || quiz.slug.toLocaleLowerCase("es-MX").includes(query);
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 28 }]}
    >
      <Pressable accessibilityRole="button" onPress={goBack} style={styles.backButton}>
        <Text style={styles.backText}>‹  Mi panel</Text>
      </Pressable>
      <Text style={styles.eyebrow}>REGENERA · ADMINISTRACIÓN</Text>
      <Text style={[styles.title, { color: colors.text }]}>Gamificación</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Resumen de cuestionarios, intentos y certificaciones de organizadores.
      </Text>

      {status === "loading" || loading ? (
        <View style={styles.state}><ActivityIndicator size="large" color="#164F3D" /><Text style={[styles.body, { color: colors.textSecondary }]}>Cargando estadísticas…</Text></View>
      ) : status !== "authenticated" || !token ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Inicia sesión con una cuenta administradora.</Text>
          <Pressable onPress={() => router.push("/login")} style={styles.actionButton}><Text style={styles.actionText}>Iniciar sesión</Text></Pressable>
        </View>
      ) : user?.rol !== "admin" ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={styles.error}>Esta herramienta es exclusiva de administradores.</Text>
        </View>
      ) : error && !statistics ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>No se pudieron cargar las estadísticas</Text>
          <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
          <Pressable onPress={() => setRefreshKey((key) => key + 1)} style={styles.actionButton}><Text style={styles.actionText}>Reintentar</Text></Pressable>
        </View>
      ) : statistics ? (
        <>
          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <View style={styles.metrics}>
            <Metric label="Intentos" value={statistics.totalIntentos} colors={colors} />
            <Metric label="Aprobados" value={statistics.totalAprobados} colors={colors} />
            <Metric label="Puntos otorgados" value={statistics.puntosOtorgados} colors={colors} />
            <Metric label="Medallas desbloqueadas" value={statistics.medallasDesbloqueadas} colors={colors} />
            <Metric label="Organizadores certificados" value={statistics.organizadoresCertificados} colors={colors} />
          </View>

          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Cuestionarios</Text>
            <TextInput
              accessibilityLabel="Buscar cuestionarios"
              onChangeText={setSearch}
              placeholder="Buscar por nombre"
              placeholderTextColor="#718078"
              value={search}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {visibleQuizzes.length === 0 ? (
              <Text style={[styles.body, { color: colors.textSecondary }]}>
                {statistics.cuestionarios.length === 0 ? "No hay cuestionarios activos." : "No hay cuestionarios que coincidan."}
              </Text>
            ) : visibleQuizzes.map((quiz) => (
              <View key={quiz.slug} style={styles.quizItem}>
                <Text style={[styles.itemTitle, { color: colors.text }]}>{quiz.titulo}</Text>
                <Text style={[styles.body, { color: colors.textSecondary }]}>
                  Versión {quiz.version} · {quiz.totalPreguntas} preguntas · {quiz.medalla ?? "Sin medalla"}
                </Text>
                <Text style={[styles.body, { color: colors.textSecondary }]}>
                  {quiz.intentos} intentos · {quiz.aprobados} aprobados · {quiz.noAprobados} no aprobados · {quiz.enCurso} en curso
                </Text>
                <Text style={styles.quizRequirement}>
                  Aprobación mínima: {formatAmount(quiz.minimoAprobacion)}% · {quiz.puntosAprobacion} puntos
                </Text>
              </View>
            ))}
          </View>

          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Intentos recientes</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>La API muestra hasta 100 intentos recientes.</Text>
            {statistics.intentosRecientes.length === 0 ? (
              <Text style={[styles.body, { color: colors.textSecondary }]}>Aún no hay intentos registrados.</Text>
            ) : (
              <View style={styles.attemptList}>
                {statistics.intentosRecientes.map((attempt) => (
                  <AttemptRow key={attempt.id} attempt={attempt} colors={colors} />
                ))}
              </View>
            )}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

function AttemptRow({
  attempt,
  colors,
}: {
  attempt: AdminQuizAttempt;
  colors: ThemeColors;
}) {
  const avatarUrl = resolveApiAssetUrl(attempt.usuarioFoto);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver respuestas de ${attempt.usuarioNombre}, ${attempt.cuestionarioTitulo}`}
      onPress={() => router.push(`/admin/gamificacion/${encodeURIComponent(attempt.id)}`)}
      style={styles.attemptRow}
    >
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarInitial}>{attempt.usuarioNombre.trim().charAt(0).toLocaleUpperCase("es-MX") || "?"}</Text>
        </View>
      )}
      <View style={styles.attemptCopy}>
        <Text style={[styles.itemTitle, { color: colors.text }]}>{attempt.usuarioNombre}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{attempt.cuestionarioTitulo}</Text>
        <Text style={styles.attemptMeta}>
          {attempt.estado} · {attempt.puntuacion === null ? "Sin puntuación" : `${formatAmount(attempt.puntuacion)}%`}
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          {formatDate(attempt.fechaUltimoIntento ?? attempt.fechaAprobacion)}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function Metric({
  label,
  value,
  colors,
}: {
  label: string;
  value: number;
  colors: ThemeColors;
}) {
  return (
    <View style={[styles.metricCard, { backgroundColor: colors.backgroundElement }]}>
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: colors.text }]}>{formatAmount(value)}</Text>
    </View>
  );
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Fecha no disponible"
    : new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(date);
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, gap: 13 },
  backButton: { paddingVertical: 8 },
  backText: { color: "#164F3D", fontSize: 15, fontWeight: "700" },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  title: { fontSize: 27, fontWeight: "800" },
  subtitle: { fontSize: 14, lineHeight: 21 },
  state: { alignItems: "center", gap: 12, paddingVertical: 35 },
  card: { padding: 16, borderRadius: 17, gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  body: { fontSize: 13, lineHeight: 19 },
  error: { color: "#9E3030", fontSize: 14, lineHeight: 20 },
  actionButton: { minHeight: 43, alignItems: "center", justifyContent: "center", paddingHorizontal: 15, borderRadius: 12, backgroundColor: "#164F3D" },
  actionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  metricCard: { flexGrow: 1, flexBasis: 130, minHeight: 79, padding: 12, borderRadius: 14, gap: 5 },
  metricLabel: { fontSize: 11, fontWeight: "600" },
  metricValue: { fontSize: 21, fontWeight: "800" },
  searchInput: { minHeight: 44, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1, borderColor: "#D5DED7" },
  quizItem: { gap: 4, paddingVertical: 11, borderTopWidth: 1, borderTopColor: "#E3E9E4" },
  itemTitle: { fontSize: 14, fontWeight: "800" },
  quizRequirement: { color: "#164F3D", fontSize: 12, fontWeight: "700" },
  attemptList: { gap: 0 },
  attemptRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#E3E9E4" },
  attemptCopy: { flex: 1, gap: 3 },
  attemptMeta: { color: "#164F3D", fontSize: 12, fontWeight: "700" },
  avatar: { width: 43, height: 43, borderRadius: 22, backgroundColor: "#E8F1EA" },
  avatarFallback: { width: 43, height: 43, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: "#E8F1EA" },
  avatarInitial: { color: "#164F3D", fontSize: 17, fontWeight: "800" },
  chevron: { color: "#164F3D", fontSize: 23, fontWeight: "700" },
});
