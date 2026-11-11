import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { getDashboardForRole } from "@/features/dashboard";
import { useSession } from "@/features/auth/use-session";
import { useEffect, useState } from "react";
import { fetchMyEnrollments } from "@/features/inscripciones/api";
import { fetchNotifications } from "@/features/notificaciones/api";
import { fetchManagedVolunteers } from "@/features/organizador/api";
import {
  fetchAdminUsers,
  fetchAuditLog,
  fetchModerationQueue,
} from "@/features/admin/api";
import { fetchVoluntariados } from "@/features/voluntariados/api";

const ROUTES: Record<string, string> = {
  volunteers: "/voluntariados",
  enrollments: "/inscripciones",
  notifications: "/notificaciones",
  manageVolunteers: "/organizador/voluntariados",
  users: "/admin/usuarios",
  moderation: "/admin/moderacion",
  audit: "/admin/auditoria",
} as const;

type DashboardSummary = { label: string; value: string }[];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colors = Colors[Colors.dark.background === theme.background ? "dark" : "light"];
  const { status, token, user } = useSession();
  const dashboard = user ? getDashboardForRole(user.rol) : null;
  const [summary, setSummary] = useState<DashboardSummary>([]);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (!token || !user) return;
      try {
        let nextSummary: DashboardSummary = [];
        if (user.rol === "usuario") {
          const [enrollments, notifications, volunteers] = await Promise.all([
            fetchMyEnrollments(token, controller.signal),
            fetchNotifications(token, controller.signal),
            fetchVoluntariados({}, controller.signal),
          ]);
          const activeEnrollments = enrollments.filter(
            (item) => item.estado === "inscrita" || item.estado === "activa",
          );
          const unread = notifications.filter((item) => !item.leida).length;
          const now = Date.now();
          const nextVolunteer = activeEnrollments
            .map((enrollment) => volunteers.find((item) => item.id === enrollment.voluntariadoId))
            .filter((item) => item?.fecha_inicio && new Date(item.fecha_inicio).getTime() >= now)
            .sort((left, right) => new Date(left!.fecha_inicio!).getTime() - new Date(right!.fecha_inicio!).getTime())[0];
          nextSummary = [
            { label: "Inscripciones activas", value: String(activeEnrollments.length) },
            { label: "Avisos sin leer", value: String(unread) },
            { label: "Próxima actividad", value: nextVolunteer?.titulo ?? "Sin actividad próxima" },
          ];
        } else if (user.rol === "organizador") {
          const items = await fetchManagedVolunteers(token, controller.signal);
          const published = items.filter((item) => item.estado === "publicado").length;
          const pending = items.filter((item) => item.estado === "pendiente").length;
          nextSummary = [
            { label: "Mis actividades", value: String(items.length) },
            { label: "Publicadas", value: String(published) },
            { label: "En revisión", value: String(pending) },
          ];
        } else if (user.rol === "admin") {
          const [users, activities, articles, audit] = await Promise.all([
            fetchAdminUsers(token, controller.signal),
            fetchModerationQueue(token, "voluntariado", controller.signal),
            fetchModerationQueue(token, "articulo", controller.signal),
            fetchAuditLog(token, controller.signal),
          ]);
          nextSummary = [
            { label: "Usuarios", value: String(users.length) },
            { label: "Pendientes de revisión", value: String(activities.length + articles.length) },
            { label: "Acciones registradas", value: String(audit.length) },
          ];
        }
        if (active) {
          setSummary(nextSummary);
          setSummaryError(null);
        }
      } catch (error) {
        if (active && !controller.signal.aborted) {
          setSummaryError(error instanceof Error ? error.message : "No se pudo actualizar el resumen.");
        }
      }
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [token, user?.id, user?.rol]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 28 },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => router.canGoBack() ? router.back() : router.replace("/mas")}
        style={styles.backButton}
      >
        <Text style={styles.backText}>‹  Más opciones</Text>
      </Pressable>
      <Text style={styles.eyebrow}>REGENERA · TU ESPACIO</Text>

      {status === "loading" ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Cargando tu panel…</Text>
      ) : status !== "authenticated" || !user ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.title, { color: colors.text }]}>Inicia sesión</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            El panel y las herramientas disponibles dependen del rol de tu cuenta.
          </Text>
          <Pressable onPress={() => router.push("/login")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
          </Pressable>
        </View>
      ) : dashboard ? (
        <>
          <View style={[styles.hero, { backgroundColor: colors.backgroundElement }]}>
            <Text style={styles.roleBadge}>{formatRole(user.rol)}</Text>
            <Text style={[styles.title, { color: colors.text }]}>{dashboard.title}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Hola, {user.nombre}. {dashboard.subtitle}
            </Text>
          </View>

          {summary.length > 0 && (
            <View style={styles.summaryGrid}>
              {summary.map((item) => (
                <View
                  key={item.label}
                  style={[styles.summaryCard, { backgroundColor: colors.backgroundElement }]}
                >
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{item.value}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                </View>
              ))}
            </View>
          )}
          {summaryError && (
            <Text accessibilityRole="alert" style={styles.errorText}>
              El panel sigue disponible, pero no se pudo actualizar el resumen: {summaryError}
            </Text>
          )}

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Accesos y herramientas</Text>
          <View style={styles.list}>
            {dashboard.cards.map((card) => {
              const isDemo = card.action === null;
              return (
                <Pressable
                  key={card.title}
                  accessibilityRole={isDemo ? undefined : "button"}
                  accessibilityLabel={`${card.title}${isDemo ? ", en demo" : ""}`}
                  disabled={isDemo}
                  onPress={() => {
                    if (card.action) router.push(ROUTES[card.action]);
                  }}
                  style={({ pressed }) => [
                    styles.card,
                    { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.86 : 1 },
                  ]}
                >
                  <View style={[styles.iconBox, { backgroundColor: colors.backgroundSelected }]}>
                    <Text style={styles.icon}>{card.icon}</Text>
                  </View>
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeading}>
                      <Text style={[styles.cardTitle, { color: colors.text }]}>{card.title}</Text>
                      {isDemo
                        ? <Text style={styles.badge}>EN DEMO</Text>
                        : <Text style={styles.openLabel}>Abrir →</Text>}
                    </View>
                    <Text style={[styles.description, { color: colors.textSecondary }]}>
                      {card.description}
                    </Text>
                    {isDemo && <Text style={styles.comingSoon}>Próximamente</Text>}
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Pressable onPress={() => router.push("/perfil")} style={styles.profileLink}>
            <Text style={styles.profileLinkText}>Ver mi perfil →</Text>
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  );
}

function formatRole(role: string): string {
  const labels: Record<string, string> = {
    usuario: "VOLUNTARIO",
    organizador: "ORGANIZADOR",
    admin: "ADMINISTRADOR",
  };
  return labels[role] ?? role.toLocaleUpperCase("es-MX");
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, gap: 13 },
  backButton: { paddingVertical: 8 },
  backText: { color: "#164F3D", fontSize: 15, fontWeight: "700" },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  hero: { padding: 20, borderRadius: 20, gap: 9 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  summaryCard: { flexGrow: 1, flexBasis: "30%", minWidth: 100, padding: 13, borderRadius: 15, gap: 4 },
  summaryValue: { fontSize: 22, fontWeight: "800" },
  summaryLabel: { fontSize: 11, lineHeight: 16 },
  roleBadge: { alignSelf: "flex-start", color: "#164F3D", backgroundColor: "#DCE8DF", overflow: "hidden", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, fontSize: 10, fontWeight: "800", letterSpacing: 0.7 },
  title: { fontSize: 27, fontWeight: "800" },
  subtitle: { fontSize: 14, lineHeight: 21 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginTop: 4 },
  list: { gap: 11 },
  card: { flexDirection: "row", alignItems: "flex-start", gap: 13, padding: 16, borderRadius: 18 },
  iconBox: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  icon: { fontSize: 21 },
  cardContent: { flex: 1, gap: 6 },
  cardHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "800" },
  description: { fontSize: 13, lineHeight: 19 },
  badge: { color: "#775613", backgroundColor: "#F5E9C9", overflow: "hidden", borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  openLabel: { color: "#164F3D", fontSize: 12, fontWeight: "700" },
  comingSoon: { color: "#775613", fontSize: 11, fontWeight: "700" },
  profileLink: { alignSelf: "center", padding: 12 },
  profileLinkText: { color: "#164F3D", fontWeight: "700" },
  primaryButton: { alignItems: "center", justifyContent: "center", minHeight: 46, paddingHorizontal: 16, borderRadius: 13, backgroundColor: "#164F3D" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  errorText: { color: "#9E3030", fontSize: 12, lineHeight: 18 },
});
