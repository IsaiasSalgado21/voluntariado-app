import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { cancelEnrollment, fetchMyEnrollments, type Enrollment } from "@/features/inscripciones/api";
import { fetchVoluntariados, type VolunteerMapItem } from "@/features/voluntariados/api";
import { useSession } from "@/features/auth/use-session";

export default function EnrollmentsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colors = Colors[Colors.dark.background === theme.background ? "dark" : "light"];
  const { status, token, user } = useSession();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [volunteers, setVolunteers] = useState<VolunteerMapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      if (status !== "authenticated" || !token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const [items, publishedVolunteers] = await Promise.all([
          fetchMyEnrollments(token, controller.signal),
          fetchVoluntariados({}, controller.signal),
        ]);
        if (active) {
          const ownEnrollments = user?.rol === "admin"
            ? items.filter((item) => item.usuarioId === user.id)
            : items;
          setEnrollments(ownEnrollments);
          setVolunteers(publishedVolunteers);
        }
      } catch (cause) {
        if (active && !controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "No se pudieron cargar tus inscripciones.");
        }
      } finally {
        if (active && !controller.signal.aborted) setLoading(false);
      }
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [status, token, user?.id, user?.rol, refreshKey]);

  const performCancel = async (id: string) => {
    if (!token) return;
    setWorkingId(id);
    setError(null);
    try {
      await cancelEnrollment(token, id);
      setEnrollments((current) =>
        current.map((item) => item.id === id ? { ...item, estado: "cancelada" } : item));
      setConfirmingId(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cancelar la inscripción.");
    } finally {
      setWorkingId(null);
    }
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/mas");
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 28 },
      ]}
    >
      <Pressable accessibilityRole="button" onPress={goBack} style={styles.backButton}>
        <Text style={styles.backText}>‹  Más opciones</Text>
      </Pressable>
      <Text style={styles.eyebrow}>REGENERA · PARTICIPA</Text>
      <Text style={[styles.title, { color: colors.text }]}>Mis inscripciones</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Consulta tus actividades y administra tu participación.
      </Text>

      {status === "loading" || loading ? (
        <View style={styles.state}>
          <ActivityIndicator color="#164F3D" size="large" />
          <Text style={[styles.muted, { color: colors.textSecondary }]}>Cargando inscripciones…</Text>
        </View>
      ) : status !== "authenticated" || !token ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Inicia sesión para continuar</Text>
          <Text style={[styles.muted, { color: colors.textSecondary }]}>
            Tus inscripciones están asociadas a tu cuenta.
          </Text>
          <Pressable onPress={() => router.push("/login")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
          </Pressable>
        </View>
      ) : error && enrollments.length === 0 ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>No pudimos cargar tus actividades</Text>
          <Text style={[styles.muted, { color: colors.textSecondary }]}>{error}</Text>
          <Pressable onPress={() => setRefreshKey((key) => key + 1)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : enrollments.length === 0 ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Aún no tienes inscripciones</Text>
          <Text style={[styles.muted, { color: colors.textSecondary }]}>
            Explora los voluntariados publicados y encuentra una actividad para participar.
          </Text>
          <Pressable onPress={() => router.push("/voluntariados")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Explorar voluntariados</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.list}>
          {enrollments.map((enrollment) => {
            const volunteer = volunteers.find((item) => item.id === enrollment.voluntariadoId);
            const active = enrollment.estado === "inscrita" || enrollment.estado === "activa";
            return (
              <View
                key={enrollment.id}
                style={[styles.card, { backgroundColor: colors.backgroundElement }]}
              >
                <View style={styles.cardHeading}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {volunteer?.titulo ?? "Actividad no disponible"}
                  </Text>
                  <Text style={[styles.status, active ? styles.activeStatus : styles.inactiveStatus]}>
                    {formatStatus(enrollment.estado)}
                  </Text>
                </View>
                {volunteer && (
                  <>
                    <Text style={[styles.muted, { color: colors.textSecondary }]}>
                      {volunteer.lugar_nombre ?? "Lugar por confirmar"}
                    </Text>
                    <Text style={[styles.muted, { color: colors.textSecondary }]}>
                      {formatDate(volunteer.fecha_inicio)}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push(`/voluntariados/${volunteer.id}`)}
                      style={styles.secondaryButton}
                    >
                      <Text style={styles.secondaryButtonText}>Ver actividad</Text>
                    </Pressable>
                  </>
                )}
                {!volunteer && (
                  <Text style={[styles.muted, { color: colors.textSecondary }]}>
                    {enrollment.fechaInscripcion
                      ? `Inscripción del ${formatDate(enrollment.fechaInscripcion)}`
                      : "Esta actividad ya no aparece entre las publicadas."}
                  </Text>
                )}
                {active && confirmingId === enrollment.id ? (
                  <View style={styles.confirmActions}>
                    <Text style={[styles.muted, { color: colors.textSecondary }]}>
                      ¿Quieres cancelar tu participación?
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      disabled={workingId === enrollment.id}
                      onPress={() => void performCancel(enrollment.id)}
                      style={[styles.cancelButton, workingId === enrollment.id && styles.disabled]}
                    >
                      <Text style={styles.cancelButtonText}>
                        {workingId === enrollment.id ? "Cancelando…" : "Sí, cancelar"}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => setConfirmingId(null)} style={styles.secondaryButton}>
                      <Text style={styles.secondaryButtonText}>Conservar inscripción</Text>
                    </Pressable>
                  </View>
                ) : active ? (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push("/asistencia-qr")}
                      style={styles.secondaryButton}
                    >
                      <Text style={styles.secondaryButtonText}>Registrar asistencia con QR</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setConfirmingId(enrollment.id)}
                      style={styles.secondaryButton}
                    >
                      <Text style={styles.secondaryButtonText}>Cancelar participación</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      {error && enrollments.length > 0 && (
        <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>
      )}
    </ScrollView>
  );
}

function formatStatus(status: Enrollment["estado"]): string {
  const labels: Record<Enrollment["estado"], string> = {
    inscrita: "Inscrita",
    activa: "Activa",
    cancelada: "Cancelada",
    completada: "Completada",
  };
  return labels[status];
}

function formatDate(value: string | null): string {
  if (!value) return "Fecha por confirmar";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha por confirmar";
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, gap: 12 },
  backButton: { paddingVertical: 8 },
  backText: { color: "#164F3D", fontSize: 15, fontWeight: "700" },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  title: { fontSize: 28, fontWeight: "800" },
  subtitle: { fontSize: 15, lineHeight: 21, marginBottom: 8 },
  list: { gap: 12 },
  card: { padding: 17, borderRadius: 18, gap: 10 },
  cardHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  cardTitle: { flex: 1, fontSize: 17, fontWeight: "800" },
  status: { overflow: "hidden", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: "700" },
  activeStatus: { color: "#164F3D", backgroundColor: "#DCE8DF" },
  inactiveStatus: { color: "#5F7066", backgroundColor: "#E8ECE7" },
  muted: { fontSize: 14, lineHeight: 21 },
  state: { alignItems: "center", gap: 12, paddingVertical: 40 },
  primaryButton: { alignItems: "center", justifyContent: "center", minHeight: 46, paddingHorizontal: 16, borderRadius: 13, backgroundColor: "#164F3D" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  secondaryButton: { alignItems: "center", paddingVertical: 10 },
  secondaryButtonText: { color: "#164F3D", fontSize: 14, fontWeight: "700" },
  cancelButton: { alignItems: "center", justifyContent: "center", minHeight: 44, borderRadius: 12, backgroundColor: "#8C3434" },
  cancelButtonText: { color: "#FFFFFF", fontWeight: "700" },
  confirmActions: { gap: 6 },
  disabled: { opacity: 0.55 },
  errorText: { color: "#9E3030", fontSize: 13, lineHeight: 19 },
});
