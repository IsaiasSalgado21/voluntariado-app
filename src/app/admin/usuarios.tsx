import { Alert, Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useSession } from "@/features/auth/use-session";
import { deleteAdminUser, fetchAdminUsers, type AdminUser } from "@/features/admin/api";

export default function AdminUsersScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colors = Colors[Colors.dark.background === theme.background ? "dark" : "light"];
  const { status, token, user } = useSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
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
        const result = await fetchAdminUsers(token, controller.signal);
        if (active) setUsers(result);
      } catch (cause) {
        if (active && !controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "No se pudieron cargar los usuarios.");
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

  const removeUser = (target: AdminUser) => {
    if (!token) return;
    Alert.alert(
      "Eliminar usuario",
      `¿Eliminar la cuenta de ${target.nombre}? Esta acción no se puede deshacer.`,
      [
        { text: "Conservar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            setWorkingId(target.id);
            void deleteAdminUser(token, target.id)
              .then(() => setUsers((current) => current.filter((item) => item.id !== target.id)))
              .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "No se pudo eliminar la cuenta."))
              .finally(() => setWorkingId(null));
          },
        },
      ],
    );
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
      <Text style={styles.eyebrow}>REGENERA · ADMINISTRACIÓN</Text>
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <Text style={[styles.title, { color: colors.text }]}>Usuarios y roles</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Gestiona accesos y estados de cuenta.</Text>
        </View>
        <Pressable onPress={() => router.push("/admin/usuario-editor")} style={styles.addButton}>
          <Text style={styles.addButtonText}>＋</Text>
        </Pressable>
      </View>
      <Pressable onPress={() => router.push("/admin/usuario-editor")} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>Crear usuario</Text>
      </Pressable>

      {status === "loading" || loading ? (
        <ActivityIndicator size="large" color="#164F3D" />
      ) : status !== "authenticated" || !token ? (
        <View style={styles.card}><Text style={styles.cardTitle}>Inicia sesión con una cuenta administradora.</Text><Pressable onPress={() => router.push("/login")}><Text style={styles.secondaryText}>Iniciar sesión →</Text></Pressable></View>
      ) : error && users.length === 0 ? (
        <View style={styles.card}><Text style={styles.cardTitle}>No se pudieron cargar las cuentas</Text><Text style={styles.body}>{error}</Text><Pressable onPress={() => setRefreshKey((key) => key + 1)}><Text style={styles.secondaryText}>Reintentar</Text></Pressable></View>
      ) : users.length === 0 ? (
        <View style={styles.card}><Text style={styles.body}>No hay usuarios registrados.</Text></View>
      ) : (
        <View style={styles.list}>
          {users.map((item) => (
            <View key={item.id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <View style={styles.cardHeading}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.nombre}</Text>
                <Text style={[styles.badge, item.estado === "activo" ? styles.activeBadge : styles.inactiveBadge]}>
                  {item.estado === "activo" ? "Activo" : "Inactivo"}
                </Text>
              </View>
              <Text style={[styles.body, { color: colors.textSecondary }]}>{item.correo}</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>
                {roleLabel(item.rol)}{item.rol === "organizador" ? ` · ${item.organizadorVerificado ? "Verificado" : "Sin verificar"}` : ""}
              </Text>
              <View style={styles.actions}>
                <Pressable onPress={() => router.push({ pathname: "/admin/usuario-editor", params: { id: item.id } })} style={styles.secondaryButton}>
                  <Text style={styles.secondaryText}>Editar cuenta</Text>
                </Pressable>
                <Pressable
                  disabled={item.id === user?.id || workingId === item.id}
                  onPress={() => removeUser(item)}
                  style={[styles.secondaryButton, item.id === user?.id && styles.disabled]}
                >
                  <Text style={[styles.deleteText, item.id === user?.id && styles.dimText]}>
                    {workingId === item.id ? "Eliminando…" : item.id === user?.id ? "Tu cuenta" : "Eliminar"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
      {error && users.length > 0 && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

function roleLabel(role: AdminUser["rol"]): string {
  return { usuario: "Voluntario", organizador: "Organizador", admin: "Administrador" }[role];
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, gap: 13 },
  center: { flex: 1, justifyContent: "center", padding: 24 },
  backButton: { paddingVertical: 8 },
  backText: { color: "#164F3D", fontSize: 15, fontWeight: "700" },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  heading: { flexDirection: "row", alignItems: "center", gap: 10 },
  headingCopy: { flex: 1, gap: 4 },
  title: { fontSize: 26, fontWeight: "800" },
  subtitle: { fontSize: 13, lineHeight: 19 },
  addButton: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#DCE8DF" },
  addButtonText: { fontSize: 25, color: "#164F3D" },
  primaryButton: { alignItems: "center", justifyContent: "center", minHeight: 46, borderRadius: 13, backgroundColor: "#164F3D" },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "700" },
  list: { gap: 11 },
  card: { padding: 16, borderRadius: 17, backgroundColor: "#FFFFFF", gap: 8 },
  cardHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "800" },
  badge: { overflow: "hidden", borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontWeight: "800" },
  activeBadge: { color: "#164F3D", backgroundColor: "#DCE8DF" },
  inactiveBadge: { color: "#8C3434", backgroundColor: "#F4DDDA" },
  body: { fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap" },
  secondaryButton: { paddingVertical: 8 },
  secondaryText: { color: "#164F3D", fontSize: 13, fontWeight: "700" },
  deleteText: { color: "#8C3434", fontSize: 13, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  dimText: { color: "#758078" },
  error: { color: "#9E3030", fontSize: 13 },
});
