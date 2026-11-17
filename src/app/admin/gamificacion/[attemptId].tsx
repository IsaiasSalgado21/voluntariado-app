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
import { useSession } from "@/features/auth/use-session";
import {
  fetchAdminQuizAttempt,
  type AdminQuizAttemptDetail,
} from "@/features/gamificacion/admin-api";
import { resolveApiAssetUrl } from "@/features/api-client";

type ThemeColors = typeof Colors.light | typeof Colors.dark;

export default function AdminGamificationAttemptScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colors = Colors[Colors.dark.background === theme.background ? "dark" : "light"];
  const { status, token, user } = useSession();
  const params = useLocalSearchParams<{ attemptId: string }>();
  const attemptId = Array.isArray(params.attemptId) ? params.attemptId[0] : params.attemptId;
  const [attempt, setAttempt] = useState<AdminQuizAttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void Promise.resolve().then(async () => {
      if (status !== "authenticated" || !token || user?.rol !== "admin" || !attemptId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await fetchAdminQuizAttempt(token, attemptId, controller.signal);
        if (active) setAttempt(result);
      } catch (cause) {
        if (active && !controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "No se pudo cargar el detalle del intento.");
        }
      } finally {
        if (active && !controller.signal.aborted) setLoading(false);
      }
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [status, token, user?.rol, attemptId]);

  const avatarUrl = attempt ? resolveApiAssetUrl(attempt.usuarioFoto) : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 28 }]}
    >
      <Pressable accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace("/admin/gamificacion")} style={styles.backButton}>
        <Text style={styles.backText}>‹  Gamificación</Text>
      </Pressable>
      <Text style={styles.eyebrow}>REGENERA · INTENTO</Text>
      <Text style={[styles.title, { color: colors.text }]}>Respuestas</Text>

      {status === "loading" || loading ? (
        <View style={styles.state}><ActivityIndicator size="large" color="#164F3D" /><Text style={[styles.body, { color: colors.textSecondary }]}>Cargando respuestas…</Text></View>
      ) : status !== "authenticated" || !token ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Inicia sesión con una cuenta administradora.</Text>
          <Pressable onPress={() => router.push("/login")} style={styles.actionButton}><Text style={styles.actionText}>Iniciar sesión</Text></Pressable>
        </View>
      ) : user?.rol !== "admin" ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={styles.error}>Esta herramienta es exclusiva de administradores.</Text>
        </View>
      ) : error ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>No se pudo abrir el intento</Text>
          <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
          <Pressable onPress={() => router.replace("/admin/gamificacion")} style={styles.actionButton}><Text style={styles.actionText}>Volver a estadísticas</Text></Pressable>
        </View>
      ) : attempt ? (
        <>
          <View style={[styles.summary, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.identity}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>{attempt.usuarioNombre.trim().charAt(0).toLocaleUpperCase("es-MX") || "?"}</Text>
                </View>
              )}
              <View style={styles.identityCopy}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{attempt.usuarioNombre}</Text>
                <Text style={[styles.body, { color: colors.textSecondary }]}>{attempt.cuestionarioTitulo}</Text>
              </View>
            </View>
            <Text style={styles.summaryMeta}>Versión {attempt.cuestionarioVersion} · {attempt.estado}</Text>
            <Text style={styles.score}>
              {attempt.puntuacion === null ? "Sin puntuación" : `${formatAmount(attempt.puntuacion)}%`}
            </Text>
          </View>

          {attempt.preguntas.length === 0 ? (
            <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <Text style={[styles.body, { color: colors.textSecondary }]}>Este cuestionario no tiene respuestas para mostrar.</Text>
            </View>
          ) : attempt.preguntas.map((question, index) => (
            <View
              key={question.id}
              style={[
                styles.questionCard,
                { backgroundColor: colors.backgroundElement },
                question.correcta === true ? styles.correct : question.correcta === false ? styles.incorrect : styles.unanswered,
              ]}
            >
              <Text style={styles.questionNumber}>PREGUNTA {index + 1}</Text>
              <Text style={[styles.questionText, { color: colors.text }]}>{question.texto}</Text>
              <Answer label="Respuesta elegida" value={question.respuestaElegida ?? "Sin respuesta"} colors={colors} />
              <Answer label="Respuesta correcta" value={question.respuestaCorrecta ?? "No disponible"} colors={colors} />
              {question.explicacion ? (
                <Text style={[styles.explanation, { color: colors.textSecondary }]}>{question.explicacion}</Text>
              ) : null}
              <Text style={styles.answerState}>
                {question.correcta === true ? "Correcta" : question.correcta === false ? "Incorrecta" : "Sin responder"}
              </Text>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

function Answer({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.answer}>
      <Text style={[styles.answerLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.body, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(value);
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, gap: 13 },
  backButton: { paddingVertical: 8 },
  backText: { color: "#164F3D", fontSize: 15, fontWeight: "700" },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  title: { fontSize: 27, fontWeight: "800" },
  state: { alignItems: "center", gap: 12, paddingVertical: 35 },
  summary: { padding: 16, borderRadius: 17, gap: 10 },
  card: { padding: 16, borderRadius: 17, gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  body: { fontSize: 13, lineHeight: 19 },
  identity: { flexDirection: "row", alignItems: "center", gap: 11 },
  identityCopy: { flex: 1, gap: 4 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#E8F1EA" },
  avatarFallback: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 24, backgroundColor: "#E8F1EA" },
  avatarInitial: { color: "#164F3D", fontSize: 19, fontWeight: "800" },
  summaryMeta: { color: "#61746A", fontSize: 12, fontWeight: "700" },
  score: { color: "#164F3D", fontSize: 22, fontWeight: "800" },
  questionCard: { padding: 16, borderRadius: 17, borderLeftWidth: 4, gap: 9 },
  correct: { borderLeftColor: "#28775A" },
  incorrect: { borderLeftColor: "#B35454" },
  unanswered: { borderLeftColor: "#A6A99F" },
  questionNumber: { color: "#61746A", fontSize: 10, fontWeight: "800", letterSpacing: 0.7 },
  questionText: { fontSize: 16, fontWeight: "800", lineHeight: 23 },
  answer: { gap: 3 },
  answerLabel: { fontSize: 11, fontWeight: "700" },
  explanation: { fontSize: 13, lineHeight: 20, paddingTop: 3 },
  answerState: { alignSelf: "flex-start", color: "#164F3D", fontSize: 12, fontWeight: "800", paddingTop: 3 },
  error: { color: "#9E3030", fontSize: 14, lineHeight: 20 },
  actionButton: { minHeight: 43, alignItems: "center", justifyContent: "center", paddingHorizontal: 15, borderRadius: 12, backgroundColor: "#164F3D" },
  actionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});
