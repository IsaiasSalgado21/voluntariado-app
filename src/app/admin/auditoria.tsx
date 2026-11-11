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
  fetchAuditDetail,
  fetchAuditLog,
  type AuditItem,
} from "@/features/admin/api";

export default function AdminAuditScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colors = Colors[Colors.dark.background === theme.background ? "dark" : "light"];
  const { status, token, user } = useSession();
  const [items, setItems] = useState<AuditItem[]>([]);
  const [selected, setSelected] = useState<AuditItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
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
        const result = await fetchAuditLog(token, controller.signal);
        if (active) setItems(result);
      } catch (cause) {
        if (active && !controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudo cargar la auditoría.");
      } finally {
        if (active && !controller.signal.aborted) setLoading(false);
      }
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [status, token, refreshKey]);

  const openDetail = async (id: string) => {
    if (!token) return;
    setDetailLoading(true);
    setError(null);
    try {
      setSelected(await fetchAuditDetail(token, id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo abrir el detalle de auditoría.");
    } finally {
      setDetailLoading(false);
    }
  };

  if (user?.rol !== "admin" && status === "authenticated") {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={styles.error}>Esta herramienta es exclusiva de administradores.</Text></View>;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 28 }]}
    >
      <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/dashboard")} style={styles.backButton}>
        <Text style={styles.backText}>‹  Mi panel</Text>
      </Pressable>
      <Text style={styles.eyebrow}>REGENERA · TRAZABILIDAD</Text>
      <Text style={[styles.title, { color: colors.text }]}>Auditoría</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Historial de acciones administrativas registrado por la API.
      </Text>

      {selected && (
        <View style={[styles.detail, { backgroundColor: colors.backgroundElement }]}>
          <View style={styles.detailHeading}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Detalle de acción</Text>
            <Pressable onPress={() => setSelected(null)}><Text style={styles.closeText}>Cerrar</Text></Pressable>
          </View>
          {detailLoading ? <ActivityIndicator color="#164F3D" /> : (
            <>
              <Fact label="Acción" value={selected.accion} />
              <Fact label="Entidad" value={`${selected.entidad} · ${selected.entidadId}`} />
              <Fact label="Usuario" value={selected.usuarioId} />
              <Fact label="Fecha" value={formatDate(selected.fecha)} />
              <Text style={styles.factLabel}>Cambios</Text>
              <Text selectable style={styles.json}>{formatChanges(selected.cambios)}</Text>
            </>
          )}
        </View>
      )}

      {status === "loading" || loading ? (
        <View style={styles.state}><ActivityIndicator size="large" color="#164F3D" /><Text style={[styles.body, { color: colors.textSecondary }]}>Cargando registro…</Text></View>
      ) : status !== "authenticated" || !token ? (
        <View style={styles.card}><Text style={styles.cardTitle}>Inicia sesión con una cuenta administradora.</Text><Pressable onPress={() => router.push("/login")}><Text style={styles.actionText}>Iniciar sesión →</Text></Pressable></View>
      ) : error && items.length === 0 ? (
        <View style={styles.card}><Text style={styles.cardTitle}>No se pudo consultar la auditoría</Text><Text style={styles.body}>{error}</Text><Pressable onPress={() => setRefreshKey((key) => key + 1)}><Text style={styles.actionText}>Reintentar</Text></Pressable></View>
      ) : items.length === 0 ? (
        <View style={styles.card}><Text style={styles.body}>Aún no hay acciones registradas.</Text></View>
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <Pressable key={item.id} onPress={() => void openDetail(item.id)} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <View style={styles.cardHeading}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.accion} · {item.entidad}</Text>
                <Text style={styles.chevron}>›</Text>
              </View>
              <Text style={[styles.body, { color: colors.textSecondary }]}>{formatDate(item.fecha)}</Text>
              <Text numberOfLines={1} style={[styles.hint, { color: colors.textSecondary }]}>
                Registro {item.id} · Usuario {item.usuarioId || "no disponible"}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {error && items.length > 0 && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <View style={styles.fact}><Text style={styles.factLabel}>{label}</Text><Text selectable style={styles.factValue}>{value}</Text></View>;
}

function formatChanges(value: unknown): string {
  if (value === undefined || value === null) return "Sin detalle de cambios.";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "El detalle no se puede mostrar.";
  }
}

function formatDate(value: string | null): string {
  if (!value) return "Fecha no disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, gap: 13 },
  center: { flex: 1, justifyContent: "center", padding: 24 },
  backButton: { paddingVertical: 8 },
  backText: { color: "#164F3D", fontSize: 15, fontWeight: "700" },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  title: { fontSize: 27, fontWeight: "800" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  list: { gap: 10 },
  card: { padding: 16, borderRadius: 17, gap: 7, backgroundColor: "#FFFFFF" },
  cardHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: "800" },
  chevron: { color: "#164F3D", fontSize: 22 },
  body: { fontSize: 13, lineHeight: 19 },
  hint: { fontSize: 11 },
  detail: { padding: 16, borderRadius: 17, gap: 11 },
  detailHeading: { flexDirection: "row", alignItems: "center" },
  closeText: { color: "#164F3D", fontSize: 12, fontWeight: "700" },
  fact: { gap: 3 },
  factLabel: { color: "#61746A", fontSize: 11, fontWeight: "700" },
  factValue: { color: "#20332B", fontSize: 13, lineHeight: 19 },
  json: { color: "#20332B", fontSize: 11, lineHeight: 16, fontFamily: "monospace" },
  state: { alignItems: "center", gap: 10, paddingVertical: 28 },
  actionText: { color: "#164F3D", fontSize: 13, fontWeight: "700" },
  error: { color: "#9E3030", fontSize: 13, lineHeight: 19 },
});
