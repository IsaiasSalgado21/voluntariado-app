import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { ApiRequestError } from "@/features/api-client";
import { useSession } from "@/features/auth/use-session";
import { fetchPublicProfile, type PublicProfile } from "@/features/perfiles/api";

export default function PublicProfileScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const scheme = Colors.dark.background === theme.background ? "dark" : "light";
  const colors = Colors[scheme];
  const { token } = useSession();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchPublicProfile(id, token, controller.signal)
      .then(setProfile)
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setProfile(null);
        setError(cause instanceof ApiRequestError && cause.status === 404
          ? "Este perfil no existe o no está disponible."
          : cause instanceof Error ? cause.message : "No se pudo cargar el perfil.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, token, reloadKey]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver"
        onPress={() => router.canGoBack() ? router.back() : router.replace("/mas")}
        style={styles.backButton}
      >
        <Text style={styles.backText}>‹  Volver</Text>
      </Pressable>
      <Text style={styles.eyebrow}>REGENERA · COMUNIDAD</Text>
      <Text style={[styles.title, { color: colors.text }]}>Perfil público</Text>

      {loading ? (
        <ActivityIndicator color="#164F3D" size="large" />
      ) : error || !profile ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text accessibilityRole="alert" style={styles.errorText}>{error ?? "Perfil no disponible."}</Text>
          <Pressable accessibilityRole="button" onPress={() => setReloadKey((key) => key + 1)} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={[styles.card, { backgroundColor: colors.backgroundElement, alignItems: "center" }]}>
            {profile.foto ? (
              <Image accessibilityLabel={`Foto de ${profile.nombre}`} source={{ uri: profile.foto }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.backgroundSelected }]}>
                <Text style={styles.initials}>{initials(profile.nombre)}</Text>
              </View>
            )}
            <Text style={[styles.name, { color: colors.text }]}>{profile.nombre}</Text>
            {!!profile.organizacion && (
              <Text style={[styles.body, { color: colors.textSecondary }]}>{profile.organizacion}</Text>
            )}
            {!!profile.descripcion && (
              <Text style={[styles.body, { color: colors.text }]}>{profile.descripcion}</Text>
            )}
            {profile.enlacesSociales.map((link) => (
              <Pressable key={link} accessibilityRole="link" onPress={() => void Linking.openURL(link)}>
                <Text style={styles.link}>{link}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Medallas</Text>
          {profile.medallas.length === 0 ? (
            <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <Text style={[styles.body, { color: colors.textSecondary }]}>Aún no tiene medallas.</Text>
            </View>
          ) : (
            profile.medallas.map((medal) => (
              <View key={medal.slug} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                <Text style={[styles.medalName, { color: colors.text }]}>🏅 {medal.nombre}</Text>
                {!!medal.descripcion && (
                  <Text style={[styles.body, { color: colors.textSecondary }]}>{medal.descripcion}</Text>
                )}
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toLocaleUpperCase("es-MX")).join("");
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 14 },
  backButton: { paddingVertical: 2, alignSelf: "flex-start" },
  backText: { color: "#164F3D", fontSize: 15, fontWeight: "700" },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  title: { fontSize: 28, fontWeight: "800" },
  card: { borderRadius: 20, padding: 18, gap: 8 },
  avatar: { width: 92, height: 92, borderRadius: 46 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  initials: { color: "#164F3D", fontSize: 28, fontWeight: "800" },
  name: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  body: { fontSize: 14, lineHeight: 21, textAlign: "center" },
  link: { color: "#164F3D", fontSize: 14, fontWeight: "700", textDecorationLine: "underline" },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  medalName: { fontSize: 15, fontWeight: "800" },
  errorText: { color: "#A14537", fontSize: 14, lineHeight: 20 },
  secondaryButton: { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: "#164F3D", justifyContent: "center", alignItems: "center" },
  secondaryText: { color: "#164F3D", fontSize: 14, fontWeight: "800" },
});
