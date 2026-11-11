import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { getDashboardForRole } from "@/features/dashboard";
import { useSession } from "@/features/auth/use-session";

const ROUTES = {
  volunteers: "/voluntariados",
  enrollments: "/inscripciones",
  notifications: "/notificaciones",
} as const;

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colors = Colors[Colors.dark.background === theme.background ? "dark" : "light"];
  const { status, user } = useSession();
  const dashboard = user ? getDashboardForRole(user.rol) : null;

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
});
