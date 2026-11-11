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
import { useSession } from "@/features/auth/use-session";
import {
  fetchManagedVolunteers,
  type ManagedVolunteer,
} from "@/features/organizador/api";

type Palette = typeof Colors.light | typeof Colors.dark;

export default function ManagedVolunteersScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colors = Colors[Colors.dark.background === theme.background ? "dark" : "light"];
  const { status, token, user } = useSession();
  const [items, setItems] = useState<ManagedVolunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (!token || status !== "authenticated") {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await fetchManagedVolunteers(token, controller.signal);
        if (active) setItems(result);
      } catch (cause) {
        if (active && !controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "No se pudieron cargar tus voluntariados.");
        }
      } finally {
        if (active && !controller.signal.aborted) setLoading(false);
      }
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [status, token, refreshKey]);

  const goBack = () => router.canGoBack() ? router.back() : router.replace("/dashboard");
  const isAdmin = user?.rol === "admin";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 28 },
      ]}
    >
      <Pressable onPress={goBack} style={styles.backButton}>
        <Text style={styles.backText}>‹  Mi panel</Text>
      </Pressable>
      <Text style={styles.eyebrow}>REGENERA · GESTIÓN</Text>
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <Text style={[styles.title, { color: colors.text }]}>
            {isAdmin ? "Todos los voluntariados" : "Mis voluntariados"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isAdmin ? "Revisa actividades y consulta su operación." : "Crea actividades y da seguimiento a cada jornada."}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/organizador/voluntariado-editor")}
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>＋</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => router.push("/organizador/voluntariado-editor")} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>Crear voluntariado</Text>
      </Pressable>

      {status === "loading" || loading ? (
        <View style={styles.state}>
          <ActivityIndicator size="large" color="#164F3D" />
          <Text style={[styles.muted, { color: colors.textSecondary }]}>Cargando actividades…</Text>
        </View>
      ) : status !== "authenticated" || !token ? (
        <EmptyState
          colors={colors}
          title="Inicia sesión para continuar"
          message="La gestión de voluntariados requiere una cuenta autorizada."
          onAction={() => router.push("/login")}
          actionLabel="Iniciar sesión"
        />
      ) : error && items.length === 0 ? (
        <EmptyState
          colors={colors}
          title="No se pudieron cargar las actividades"
          message={error}
          onAction={() => setRefreshKey((key) => key + 1)}
          actionLabel="Reintentar"
        />
      ) : items.length === 0 ? (
        <EmptyState
          colors={colors}
          title="Aún no tienes actividades"
          message="Crea tu primer voluntariado. Los cambios se guardarán en la API y pasarán por revisión."
          onAction={() => router.push("/organizador/voluntariado-editor")}
          actionLabel="Crear actividad"
        />
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <View key={item.id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <View style={styles.cardHeading}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.titulo}</Text>
                <Text style={[styles.badge, statusStyle(item.estado)]}>{statusLabel(item.estado)}</Text>
              </View>
              <Text style={[styles.muted, { color: colors.textSecondary }]}>
                {formatDate(item.fechaInicio)} · Cupo {item.cupo} · {item.categoria}
              </Text>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/organizador/voluntariado/${item.id}`)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Participantes y métricas</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={item.estado === "finalizado" || item.estado === "cancelado"}
                  onPress={() => router.push({
                    pathname: "/organizador/voluntariado-editor",
                    params: { id: item.id },
                  })}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Editar</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
      {error && items.length > 0 && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

function EmptyState({
  colors,
  title,
  message,
  onAction,
  actionLabel,
}: {
  colors: Palette;
  title: string;
  message: string;
  onAction: () => void;
  actionLabel: string;
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.muted, { color: colors.textSecondary }]}>{message}</Text>
      <Pressable onPress={onAction} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pendiente: "En revisión",
    publicado: "Publicado",
    rechazado: "Rechazado",
    cancelado: "Cancelado",
    finalizado: "Finalizado",
  };
  return labels[status] ?? status;
}

function statusStyle(status: string) {
  if (status === "publicado") return styles.publishedBadge;
  if (status === "rechazado" || status === "cancelado") return styles.rejectedBadge;
  return styles.pendingBadge;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha por confirmar";
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, gap: 13 },
  backButton: { paddingVertical: 8 },
  backText: { color: "#164F3D", fontSize: 15, fontWeight: "700" },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  heading: { flexDirection: "row", alignItems: "center", gap: 12 },
  headingCopy: { flex: 1, gap: 5 },
  title: { fontSize: 27, fontWeight: "800" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  addButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#DCE8DF" },
  addButtonText: { color: "#164F3D", fontSize: 25, fontWeight: "600" },
  primaryButton: { alignItems: "center", justifyContent: "center", minHeight: 46, paddingHorizontal: 16, borderRadius: 13, backgroundColor: "#164F3D" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  state: { alignItems: "center", gap: 12, paddingVertical: 38 },
  list: { gap: 12 },
  card: { padding: 17, borderRadius: 18, gap: 10 },
  cardHeading: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "800" },
  badge: { overflow: "hidden", borderRadius: 9, paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, fontWeight: "800" },
  publishedBadge: { color: "#164F3D", backgroundColor: "#DCE8DF" },
  pendingBadge: { color: "#775613", backgroundColor: "#F5E9C9" },
  rejectedBadge: { color: "#8C3434", backgroundColor: "#F4DDDA" },
  muted: { fontSize: 13, lineHeight: 20 },
  actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  secondaryButton: { paddingVertical: 8 },
  secondaryButtonText: { color: "#164F3D", fontSize: 13, fontWeight: "700" },
  error: { color: "#9E3030", fontSize: 13 },
});
