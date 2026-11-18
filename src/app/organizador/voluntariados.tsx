import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import { Colors, RegeneraColors } from "@/constants/theme";
import { AppNavigationBar, RegeneraCard, RegeneraPageHeader } from "@/components/regenera-ui";
import { useTheme } from "@/hooks/use-theme";
import { useSession } from "@/features/auth/use-session";
import { VOLUNTEER_CATEGORIES } from "@/features/voluntariados/filters";
import {
  deleteManagedVolunteer,
  filterManagedVolunteersByTitle,
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [titleSearch, setTitleSearch] = useState("");

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
  const canManage = isAdmin || user?.rol === "organizador";
  const filteredItems = useMemo(
    () => filterManagedVolunteersByTitle(items, titleSearch),
    [items, titleSearch],
  );

  const removeVolunteer = async (id: string) => {
    if (!token) return;
    setDeletingId(id);
    setError(null);
    try {
      await deleteManagedVolunteer(token, id);
      setItems((current) => current.filter((item) => item.id !== id));
      setConfirmDeleteId(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar el voluntariado.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 28 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <AppNavigationBar backLabel="Mi panel" onBack={goBack} />
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <RegeneraPageHeader
            eyebrow="REGENERA · GESTIÓN"
            title={isAdmin ? "Todos los voluntariados" : "Mis voluntariados"}
            subtitle={isAdmin ? "Revisa actividades y consulta su operación." : "Crea actividades y da seguimiento a cada jornada."}
          />
        </View>
        {canManage && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/organizador/voluntariado-editor")}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>＋</Text>
          </Pressable>
        )}
      </View>

      {canManage && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/organizador/voluntariado-editor")}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Crear voluntariado</Text>
        </Pressable>
      )}

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
        <View style={styles.listSection}>
          <View style={styles.searchSection}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>Buscar por título</Text>
            <View
              style={[
                styles.searchBox,
                { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected },
              ]}
            >
              <TextInput
                accessibilityLabel="Buscar voluntariados por título"
                accessibilityHint="Filtra las actividades mientras escribes"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setTitleSearch}
                placeholder="Escribe parte del título"
                placeholderTextColor={colors.textSecondary}
                returnKeyType="search"
                style={[styles.searchInput, { color: colors.text }]}
                value={titleSearch}
              />
              {!!titleSearch && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Limpiar búsqueda"
                  hitSlop={8}
                  onPress={() => setTitleSearch("")}
                  style={styles.clearSearch}
                >
                  <Text style={styles.clearSearchText}>Limpiar</Text>
                </Pressable>
              )}
            </View>
          </View>
          {filteredItems.length === 0 ? (
            <EmptyState
              colors={colors}
              title="No encontramos coincidencias"
              message="Prueba con otras palabras del título o limpia la búsqueda."
              onAction={() => setTitleSearch("")}
              actionLabel="Limpiar búsqueda"
            />
          ) : (
            <View style={styles.list}>
              {filteredItems.map((item) => (
            <RegeneraCard key={item.id} style={styles.card}>
              <View style={styles.cardHeading}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.titulo}</Text>
                <Text style={[styles.badge, statusStyle(item.estado)]}>{statusLabel(item.estado)}</Text>
              </View>
              <Text style={[styles.muted, { color: colors.textSecondary }]}>
                {formatDate(item.fechaInicio)} · Cupo {item.cupo} · {categoryLabel(item.categoria.trim())}
              </Text>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/organizador/voluntariado/${item.id}`)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Participantes y métricas</Text>
                </Pressable>
                {(isAdmin || (
                  !item.iniciadoPorFecha
                  && (user?.organizadorVerificado === true || ["pendiente", "rechazado"].includes(item.estado))
                )) && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push({
                      pathname: "/organizador/voluntariado-editor",
                      params: { id: item.id },
                    })}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {item.estado === "rechazado" ? "Editar y reenviar" : "Editar"}
                    </Text>
                  </Pressable>
                )}
                {(isAdmin || (
                  !item.iniciadoPorFecha
                  && (user?.organizadorVerificado === true || ["pendiente", "rechazado"].includes(item.estado))
                )) && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setConfirmDeleteId(item.id)}
                    style={styles.dangerButton}
                  >
                    <Text style={styles.dangerButtonText}>Eliminar</Text>
                  </Pressable>
                )}
              </View>
              {confirmDeleteId === item.id && (
                <View style={styles.confirmBox}>
                  <Text style={styles.confirmText}>
                    Eliminar permanentemente «{item.titulo}». Esta acción no se puede deshacer.
                  </Text>
                  <View style={styles.actions}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={deletingId === item.id}
                      onPress={() => void removeVolunteer(item.id)}
                      style={[styles.dangerButton, deletingId === item.id && styles.disabled]}
                    >
                      <Text style={styles.dangerButtonText}>
                        {deletingId === item.id ? "Eliminando…" : "Confirmar eliminación"}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={deletingId === item.id}
                      onPress={() => setConfirmDeleteId(null)}
                      style={styles.secondaryButton}
                    >
                      <Text style={styles.secondaryButtonText}>Conservar</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </RegeneraCard>
              ))}
            </View>
          )}
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
    <RegeneraCard style={styles.card}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.muted, { color: colors.textSecondary }]}>{message}</Text>
      <Pressable onPress={onAction} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>{actionLabel}</Text>
      </Pressable>
    </RegeneraCard>
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

function categoryLabel(category: string): string {
  if (!category) return "Sin categoría";
  const normalized = category.toLocaleLowerCase("es-MX");
  const knownLabel = VOLUNTEER_CATEGORIES.find(([value]) => value === normalized)?.[1];
  if (knownLabel && normalized) return knownLabel;
  return category
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toLocaleUpperCase("es-MX")}${word.slice(1)}`)
    .join(" ");
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, gap: 13 },
  heading: { flexDirection: "row", alignItems: "center", gap: 12 },
  headingCopy: { flex: 1 },
  addButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: RegeneraColors.softGreen },
  addButtonText: { color: RegeneraColors.primary, fontSize: 25, fontWeight: "600" },
  primaryButton: { alignItems: "center", justifyContent: "center", minHeight: 46, paddingHorizontal: 16, borderRadius: 13, backgroundColor: RegeneraColors.primary },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  state: { alignItems: "center", gap: 12, paddingVertical: 38 },
  listSection: { gap: 12 },
  searchSection: { gap: 7 },
  filterLabel: { fontSize: 13, fontWeight: "700" },
  searchBox: { minHeight: 48, flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14, paddingLeft: 13, paddingRight: 10 },
  searchInput: { flex: 1, minHeight: 46, paddingVertical: 10, fontSize: 15 },
  clearSearch: { paddingHorizontal: 7, paddingVertical: 8 },
  clearSearchText: { color: RegeneraColors.primary, fontSize: 12, fontWeight: "700" },
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
  dangerButton: { paddingVertical: 8 },
  dangerButtonText: { color: "#8C3434", fontSize: 13, fontWeight: "700" },
  confirmBox: { gap: 8, padding: 11, borderRadius: 12, backgroundColor: "#F4DDDA" },
  confirmText: { color: "#612D2D", fontSize: 13, lineHeight: 19 },
  disabled: { opacity: 0.55 },
  error: { color: "#9E3030", fontSize: 13 },
});
