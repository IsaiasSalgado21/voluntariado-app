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
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/features/notificaciones/api";
import { useSession } from "@/features/auth/use-session";

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colors = Colors[Colors.dark.background === theme.background ? "dark" : "light"];
  const { status, token, user } = useSession();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

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
        const items = await fetchNotifications(token, controller.signal);
        if (active) {
          setNotifications(user?.rol === "admin"
            ? items.filter((item) => item.esPropia)
            : items);
        }
      } catch (cause) {
        if (active && !controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "No se pudieron cargar las notificaciones.");
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

  const markRead = async (notification: AppNotification) => {
    if (!token || notification.leida) return;
    setWorkingId(notification.id);
    setError(null);
    try {
      const updated = await markNotificationRead(token, notification.id);
      setNotifications((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar la notificación.");
    } finally {
      setWorkingId(null);
    }
  };

  const markAllRead = async () => {
    if (!token) return;
    setMarkingAll(true);
    setError(null);
    try {
      await markAllNotificationsRead(token);
      setNotifications((current) => current.map((item) => ({ ...item, leida: true })));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron actualizar las notificaciones.");
    } finally {
      setMarkingAll(false);
    }
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/mas");
  };
  const unreadCount = notifications.filter((item) => !item.leida).length;

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
      <Text style={styles.eyebrow}>REGENERA · AVISOS</Text>
      <View style={styles.heading}>
        <View style={styles.headingText}>
          <Text style={[styles.title, { color: colors.text }]}>Notificaciones</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {unreadCount ? `${unreadCount} sin leer` : "Estás al día"}
          </Text>
        </View>
        {unreadCount > 0 && (
          <Pressable
            accessibilityRole="button"
            disabled={markingAll}
            onPress={() => void markAllRead()}
            style={styles.markAllButton}
          >
            <Text style={styles.markAllText}>{markingAll ? "Guardando…" : "Leer todas"}</Text>
          </Pressable>
        )}
      </View>

      {status === "loading" || loading ? (
        <View style={styles.state}>
          <ActivityIndicator color="#164F3D" size="large" />
          <Text style={[styles.muted, { color: colors.textSecondary }]}>Cargando notificaciones…</Text>
        </View>
      ) : status !== "authenticated" || !token ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Inicia sesión para continuar</Text>
          <Text style={[styles.muted, { color: colors.textSecondary }]}>
            Tus avisos se guardan en tu cuenta.
          </Text>
          <Pressable onPress={() => router.push("/login")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
          </Pressable>
        </View>
      ) : error && notifications.length === 0 ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>No pudimos cargar los avisos</Text>
          <Text style={[styles.muted, { color: colors.textSecondary }]}>{error}</Text>
          <Pressable onPress={() => setRefreshKey((key) => key + 1)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : notifications.length === 0 ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Todavía no tienes notificaciones</Text>
          <Text style={[styles.muted, { color: colors.textSecondary }]}>
            Aquí aparecerán confirmaciones, cambios y recordatorios de tus actividades.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {notifications.map((notification) => (
            <View
              key={notification.id}
              style={[
                styles.card,
                { backgroundColor: colors.backgroundElement },
                !notification.leida && styles.unreadCard,
              ]}
            >
              <View style={styles.cardHeading}>
                <Text style={styles.icon}>{iconFor(notification.tipo)}</Text>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{notification.titulo}</Text>
                {!notification.leida && <View accessibilityLabel="Sin leer" style={styles.unreadDot} />}
              </View>
              <Text style={[styles.muted, { color: colors.textSecondary }]}>{notification.mensaje}</Text>
              {notification.fechaCreacion && (
                <Text style={styles.date}>{formatDate(notification.fechaCreacion)}</Text>
              )}
              {!notification.leida && (
                <Pressable
                  accessibilityRole="button"
                  disabled={workingId === notification.id}
                  onPress={() => void markRead(notification)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>
                    {workingId === notification.id ? "Guardando…" : "Marcar como leída"}
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}

      {error && notifications.length > 0 && (
        <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>
      )}
    </ScrollView>
  );
}

function iconFor(type: string): string {
  const icons: Record<string, string> = {
    inscripcion_confirmada: "✅",
    inscripcion_cancelada: "↩️",
    voluntariado_actualizado: "📅",
    voluntariado_cancelado: "⚠️",
    recordatorio_voluntariado: "⏰",
    asistencia_registrada: "💚",
    articulo_aprobado: "📄",
    articulo_rechazado: "📝",
    organizador_verificado: "🛡️",
    sistema: "ℹ️",
  };
  return icons[type] ?? "🔔";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, gap: 12 },
  backButton: { paddingVertical: 8 },
  backText: { color: "#164F3D", fontSize: 15, fontWeight: "700" },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  headingText: { flex: 1, gap: 4 },
  title: { fontSize: 28, fontWeight: "800" },
  subtitle: { fontSize: 14 },
  markAllButton: { padding: 10 },
  markAllText: { color: "#164F3D", fontSize: 13, fontWeight: "700" },
  state: { alignItems: "center", gap: 12, paddingVertical: 40 },
  list: { gap: 12 },
  card: { padding: 17, borderRadius: 18, gap: 9 },
  unreadCard: { borderWidth: 1, borderColor: "#A4C3AD" },
  cardHeading: { flexDirection: "row", alignItems: "center", gap: 9 },
  icon: { fontSize: 19 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "800" },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#164F3D" },
  muted: { fontSize: 14, lineHeight: 21 },
  date: { color: "#61746A", fontSize: 12 },
  secondaryButton: { alignSelf: "flex-start", paddingVertical: 8 },
  secondaryButtonText: { color: "#164F3D", fontSize: 13, fontWeight: "700" },
  emptyIcon: { fontSize: 28 },
  primaryButton: { alignItems: "center", justifyContent: "center", minHeight: 46, paddingHorizontal: 16, borderRadius: 13, backgroundColor: "#164F3D" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  errorText: { color: "#9E3030", fontSize: 13, lineHeight: 19 },
});
