import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
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

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const scheme = Colors.dark.background === theme.background ? "dark" : "light";
  const colors = Colors[scheme];
  const { status, user, error, logout, refreshProfile, clearError } = useSession();
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await logout();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "No se confirmó el cierre de sesión.");
    } finally {
      setBusy(false);
    }
  };

  const handleRefreshProfile = async () => {
    clearError();
    setActionError(null);
    try {
      await refreshProfile();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "No se pudo actualizar el perfil.");
    }
  };

  if (status === "loading") {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color="#164F3D" size="large" />
        <Text style={[styles.body, { color: colors.textSecondary }]}>Recuperando tu sesión…</Text>
      </View>
    );
  }

  if (status !== "authenticated") {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.backgroundSelected }]}>
          <Text style={styles.avatarIcon}>👤</Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Tu perfil</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Inicia sesión o crea una cuenta para consultar tu perfil.
        </Text>
        {(actionError || error) && (
          <Text accessibilityRole="alert" style={styles.errorText}>{actionError ?? error}</Text>
        )}
        <Pressable onPress={() => router.push("/login")} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver a más opciones"
        onPress={() => router.canGoBack() ? router.back() : router.replace("/mas")}
        style={styles.backButton}
      >
        <Text style={styles.backText}>‹  Más opciones</Text>
      </Pressable>

      <Text style={styles.eyebrow}>REGENERA · TU CUENTA</Text>
      <Text style={[styles.title, { color: colors.text }]}>Mi perfil</Text>

      {user ? (
        <View style={[styles.profileCard, { backgroundColor: colors.backgroundElement }]}>
          {user.foto ? (
            <Image accessibilityLabel="Foto de perfil" source={{ uri: user.foto }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.backgroundSelected }]}>
              <Text style={styles.avatarText}>{getInitials(user.nombre)}</Text>
            </View>
          )}
          <Text style={[styles.name, { color: colors.text }]}>{user.nombre}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{user.correo}</Text>
          <Text style={styles.roleBadge}>{formatRole(user.rol)}</Text>

          <View style={styles.divider} />
          <ProfileFact label="Estado de cuenta" value={formatState(user.estado)} colors={colors} />
          {user.organizadorVerificado && (
            <ProfileFact label="Organizador" value="Cuenta verificada" colors={colors} />
          )}
          {user.fechaRegistro && (
            <ProfileFact label="Miembro desde" value={formatDate(user.fechaRegistro)} colors={colors} />
          )}
          <Text style={[styles.readOnlyNote, { color: colors.textSecondary }]}>
            Los datos del perfil son de solo lectura por ahora.
          </Text>
        </View>
      ) : (
        <View style={[styles.profileCard, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            No se pudo cargar la información del perfil.
          </Text>
          <Pressable onPress={handleRefreshProfile} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      )}

      {(error || actionError) && (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {actionError ?? error}
        </Text>
      )}

      {user ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={handleLogout}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, busy && styles.disabled]}
        >
          {busy ? (
            <ActivityIndicator color="#164F3D" />
          ) : (
            <Text style={styles.secondaryButtonText}>Cerrar sesión</Text>
          )}
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={handleRefreshProfile}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Reintentar</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function ProfileFact({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: (typeof Colors)[keyof typeof Colors];
}) {
  return (
    <View style={styles.fact}>
      <Text style={[styles.factLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.factValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("es-MX"))
    .join("");
}

function formatRole(role: string): string {
  const labels: Record<string, string> = {
    usuario: "Voluntario",
    organizador: "Organizador",
    admin: "Administrador",
  };
  return labels[role] ?? role;
}

function formatState(state: string): string {
  return state === "activo" ? "Activa" : state.charAt(0).toLocaleUpperCase("es-MX") + state.slice(1);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 14, padding: 24 },
  content: { paddingHorizontal: 20, gap: 14 },
  backButton: { paddingVertical: 2, alignSelf: "flex-start" },
  backText: { color: "#164F3D", fontSize: 15, fontWeight: "700" },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  title: { fontSize: 28, fontWeight: "800" },
  body: { fontSize: 15, lineHeight: 22, textAlign: "center" },
  avatarPlaceholder: { width: 78, height: 78, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  avatarIcon: { fontSize: 34 },
  profileCard: { alignItems: "center", padding: 20, borderRadius: 20, gap: 8 },
  avatarImage: { width: 82, height: 82, borderRadius: 41 },
  avatar: { width: 82, height: 82, borderRadius: 41, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#164F3D", fontSize: 26, fontWeight: "800" },
  name: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  email: { fontSize: 14, textAlign: "center" },
  roleBadge: { color: "#164F3D", backgroundColor: "#DCE8DF", overflow: "hidden", borderRadius: 12, paddingHorizontal: 11, paddingVertical: 6, fontSize: 12, fontWeight: "800", marginTop: 2 },
  divider: { height: 1, alignSelf: "stretch", backgroundColor: "#DCE4DE", marginVertical: 8 },
  fact: { alignSelf: "stretch", gap: 3, paddingVertical: 3 },
  factLabel: { fontSize: 12, fontWeight: "700" },
  factValue: { fontSize: 14 },
  readOnlyNote: { fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 8 },
  errorText: { color: "#A14537", fontSize: 13, lineHeight: 19, textAlign: "center" },
  primaryButton: { width: "100%", minHeight: 48, borderRadius: 14, backgroundColor: "#164F3D", justifyContent: "center", alignItems: "center", paddingHorizontal: 16, marginTop: 4 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  secondaryButton: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: "#164F3D", justifyContent: "center", alignItems: "center", paddingHorizontal: 16 },
  secondaryButtonText: { color: "#164F3D", fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.6 },
});
