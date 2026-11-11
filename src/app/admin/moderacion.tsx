import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
  fetchModerationQueue,
  reviewContent,
  type AdminContentItem,
} from "@/features/admin/api";

type ContentType = AdminContentItem["tipo"];
const TABS: Array<{ type: ContentType; label: string }> = [
  { type: "voluntariado", label: "Actividades" },
  { type: "articulo", label: "Artículos" },
  { type: "flora-fauna", label: "Flora y fauna" },
  { type: "lugar", label: "Lugares" },
];

export default function AdminModerationScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colors = Colors[Colors.dark.background === theme.background ? "dark" : "light"];
  const { status, token, user } = useSession();
  const [type, setType] = useState<ContentType>("voluntariado");
  const [items, setItems] = useState<AdminContentItem[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
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
        const result = await fetchModerationQueue(token, type, controller.signal);
        if (active) setItems(result);
      } catch (cause) {
        if (active && !controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "No se pudo cargar la cola de revisión.");
        }
      } finally {
        if (active && !controller.signal.aborted) setLoading(false);
      }
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [status, token, type, refreshKey]);

  const runAction = async (item: AdminContentItem, action: "approve" | "reject" | "archive") => {
    if (!token) return;
    const reason = reasons[item.id]?.trim();
    if (action === "reject" && item.tipo === "voluntariado" && (reason?.length ?? 0) < 5) {
      setError("Para rechazar una actividad, escribe un motivo de al menos 5 caracteres.");
      return;
    }
    if (action === "reject" && item.tipo === "articulo" && (reason?.length ?? 0) < 5) {
      setError("Para rechazar un artículo, escribe un motivo de al menos 5 caracteres.");
      return;
    }
    setWorkingId(item.id);
    setError(null);
    try {
      await reviewContent(token, item, action, reason);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo completar la revisión.");
    } finally {
      setWorkingId(null);
    }
  };

  if (user?.rol !== "admin" && status === "authenticated") {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={styles.error}>Esta herramienta es exclusiva de administradores.</Text></View>;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 28 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/dashboard")} style={styles.backButton}>
        <Text style={styles.backText}>‹  Mi panel</Text>
      </Pressable>
      <Text style={styles.eyebrow}>REGENERA · REVISIÓN</Text>
      <Text style={[styles.title, { color: colors.text }]}>Moderación</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Revisa cambios antes de publicarlos o retirarlos. Cada decisión es autorizada y registrada por la API.
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map((tab) => (
          <Pressable key={tab.type} onPress={() => setType(tab.type)} style={[styles.tab, type === tab.type && styles.selectedTab]}>
            <Text style={[styles.tabText, type === tab.type && styles.selectedTabText]}>{tab.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {status === "loading" || loading ? (
        <View style={styles.state}><ActivityIndicator size="large" color="#164F3D" /><Text style={[styles.body, { color: colors.textSecondary }]}>Cargando contenido…</Text></View>
      ) : status !== "authenticated" || !token ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Inicia sesión con una cuenta administradora.</Text>
          <Pressable onPress={() => router.push("/login")}><Text style={styles.actionText}>Iniciar sesión →</Text></Pressable>
        </View>
      ) : error && items.length === 0 ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>No se pudo cargar la revisión</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{error}</Text>
          <Pressable onPress={() => setRefreshKey((key) => key + 1)}><Text style={styles.actionText}>Reintentar</Text></Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>No hay elementos en esta sección</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>La cola se actualizará cuando haya contenido que revisar.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((item) => {
            const reviewable = item.tipo === "voluntariado" || item.tipo === "articulo";
            const published = item.estado === "publicado" || item.estado === "activo";
            const canChangeStatus = published || item.estado === "archivado";
            return (
              <View key={item.id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                <View style={styles.cardHeading}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{item.titulo}</Text>
                  <Text style={styles.statusBadge}>{statusLabel(item.estado)}</Text>
                </View>
                {!!item.detalle && <Text style={[styles.body, { color: colors.textSecondary }]}>{item.detalle}</Text>}
                {item.tipo === "voluntariado" && (
                  <Pressable
                    onPress={() => router.push(`/organizador/voluntariado/${item.id}`)}
                    style={styles.actionButton}
                  >
                    <Text style={styles.actionText}>Ver participantes y métricas →</Text>
                  </Pressable>
                )}
                {reviewable && (
                  <>
                    <TextInput
                      accessibilityLabel="Motivo de rechazo"
                      value={reasons[item.id] ?? ""}
                      onChangeText={(value) => setReasons((current) => ({ ...current, [item.id]: value }))}
                      placeholder="Motivo de rechazo (mínimo 5 caracteres)"
                      placeholderTextColor="#87958D"
                      style={styles.reasonInput}
                    />
                    <View style={styles.actions}>
                      <Pressable disabled={workingId === item.id} onPress={() => void runAction(item, "approve")} style={styles.approveButton}>
                        <Text style={styles.approveText}>{workingId === item.id ? "Guardando…" : "Aprobar y publicar"}</Text>
                      </Pressable>
                      <Pressable disabled={workingId === item.id} onPress={() => void runAction(item, "reject")} style={styles.rejectButton}>
                        <Text style={styles.rejectText}>Rechazar</Text>
                      </Pressable>
                    </View>
                  </>
                )}
                {!reviewable && canChangeStatus && (
                  <Pressable
                    disabled={workingId === item.id}
                    onPress={() => void runAction(item, published ? "archive" : "approve")}
                    style={styles.actionButton}
                  >
                    <Text style={styles.actionText}>
                      {workingId === item.id ? "Guardando…" : published ? "Archivar" : "Publicar"}
                    </Text>
                  </Pressable>
                )}
                {!reviewable && !canChangeStatus && (
                  <Text style={[styles.body, { color: colors.textSecondary }]}>
                    No hay una acción disponible para este estado.
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      )}
      {error && items.length > 0 && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pendiente: "Pendiente",
    rechazado: "Rechazado",
    borrador: "Borrador",
    publicado: "Publicado",
    activo: "Activo",
    archivado: "Archivado",
  };
  return labels[status] ?? status;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, gap: 13 },
  center: { flex: 1, justifyContent: "center", padding: 24 },
  backButton: { paddingVertical: 8 },
  backText: { color: "#164F3D", fontSize: 15, fontWeight: "700" },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  title: { fontSize: 27, fontWeight: "800" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  tabs: { gap: 8, paddingVertical: 4 },
  tab: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 13, backgroundColor: "#E8ECE7" },
  selectedTab: { backgroundColor: "#164F3D" },
  tabText: { color: "#47594F", fontSize: 12, fontWeight: "700" },
  selectedTabText: { color: "#FFFFFF" },
  list: { gap: 11 },
  card: { padding: 16, borderRadius: 17, gap: 10 },
  cardHeading: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "800" },
  statusBadge: { color: "#775613", backgroundColor: "#F5E9C9", overflow: "hidden", borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontWeight: "800" },
  body: { fontSize: 13, lineHeight: 19 },
  reasonInput: { minHeight: 44, borderWidth: 1, borderColor: "#CAD5CD", borderRadius: 12, paddingHorizontal: 11, backgroundColor: "#FFFFFF", color: "#20332B" },
  actions: { flexDirection: "row", gap: 9 },
  approveButton: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#164F3D" },
  approveText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  rejectButton: { minHeight: 42, paddingHorizontal: 13, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#F4DDDA" },
  rejectText: { color: "#8C3434", fontSize: 12, fontWeight: "700" },
  actionButton: { alignSelf: "flex-start", paddingVertical: 7 },
  actionText: { color: "#164F3D", fontSize: 13, fontWeight: "700" },
  state: { alignItems: "center", gap: 10, paddingVertical: 28 },
  error: { color: "#9E3030", fontSize: 13, lineHeight: 19 },
});
