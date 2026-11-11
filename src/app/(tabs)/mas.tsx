import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useSession } from "@/features/auth/use-session";

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const scheme = Colors.dark.background === theme.background ? "dark" : "light";
  const colors = Colors[scheme];
  const { status, user } = useSession();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <Text style={styles.eyebrow}>REGENERA · TU ESPACIO</Text>
      <Text style={[styles.title, { color: colors.text }]}>Más opciones</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Accede a tu panel, actividades y herramientas de Regenera.
      </Text>

      <View style={styles.list}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir mi perfil"
          onPress={() => router.push("/perfil")}
          style={({ pressed }) => [
            styles.card,
            styles.profileCard,
            { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.86 : 1 },
          ]}
        >
          <View style={[styles.iconBox, { backgroundColor: colors.backgroundSelected }]}>
            <Text style={styles.icon}>👤</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Mi perfil</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {status === "authenticated" && user
                ? `${user.nombre} · ${formatRole(user.rol)}`
                : status === "loading"
                  ? "Comprobando sesión…"
                  : "Inicia sesión o crea una cuenta."}
            </Text>
            <Text style={styles.comingSoon}>
              {status === "authenticated" ? "Ver perfil →" : "Iniciar sesión →"}
            </Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir panel por rol"
          onPress={() => router.push(status === "authenticated" ? "/dashboard" : "/login")}
          style={({ pressed }) => [
            styles.card,
            styles.profileCard,
            { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.86 : 1 },
          ]}
        >
          <View style={[styles.iconBox, { backgroundColor: colors.backgroundSelected }]}>
            <Text style={styles.icon}>📊</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Mi panel</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {status === "authenticated" && user
                ? `Accesos para ${formatRole(user.rol).toLocaleLowerCase("es-MX")}.`
                : "Inicia sesión para ver las herramientas de tu rol."}
            </Text>
            <Text style={styles.comingSoon}>
              {status === "authenticated" ? "Abrir panel →" : "Iniciar sesión →"}
            </Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir mis inscripciones"
          onPress={() => router.push(status === "authenticated" ? "/inscripciones" : "/login")}
          style={({ pressed }) => [
            styles.card,
            styles.profileCard,
            { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.86 : 1 },
          ]}
        >
          <View style={[styles.iconBox, { backgroundColor: colors.backgroundSelected }]}>
            <Text style={styles.icon}>🎟️</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Mis inscripciones</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Revisa las actividades en las que participas.
            </Text>
            <Text style={styles.comingSoon}>
              {status === "authenticated" ? "Ver inscripciones →" : "Iniciar sesión →"}
            </Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir notificaciones"
          onPress={() => router.push(status === "authenticated" ? "/notificaciones" : "/login")}
          style={({ pressed }) => [
            styles.card,
            styles.profileCard,
            { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.86 : 1 },
          ]}
        >
          <View style={[styles.iconBox, { backgroundColor: colors.backgroundSelected }]}>
            <Text style={styles.icon}>🔔</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Notificaciones</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Entérate de confirmaciones, novedades y recordatorios.
            </Text>
            <Text style={styles.comingSoon}>
              {status === "authenticated" ? "Ver notificaciones →" : "Iniciar sesión →"}
            </Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir artículos ambientales"
          onPress={() => router.push("/articulos")}
          style={({ pressed }) => [
            styles.card,
            styles.articleCard,
            { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.86 : 1 },
          ]}
        >
          <View style={[styles.iconBox, { backgroundColor: colors.backgroundSelected }]}>
            <Text style={styles.icon}>📚</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Artículos ambientales</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Lee publicaciones sobre el medio ambiente.
            </Text>
            <Text style={styles.comingSoon}>Ver artículos →</Text>
          </View>
        </Pressable>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, gap: 12 },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  title: { fontSize: 28, fontWeight: "800" },
  subtitle: { fontSize: 15, lineHeight: 21, marginBottom: 8 },
  list: { gap: 12 },
  card: { flexDirection: "row", alignItems: "flex-start", gap: 14, padding: 16, borderRadius: 18 },
  articleCard: { alignItems: "center" },
  profileCard: { alignItems: "center" },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  icon: { fontSize: 22 },
  cardContent: { flex: 1, gap: 6 },
  cardHeading: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  description: { fontSize: 13, lineHeight: 19 },
  comingSoon: { color: "#164F3D", fontSize: 12, fontWeight: "700" },
});

function formatRole(role: string): string {
  const labels: Record<string, string> = {
    usuario: "Voluntario",
    organizador: "Organizador",
    admin: "Administrador",
  };
  return labels[role] ?? role;
}
