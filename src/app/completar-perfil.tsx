import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { ApiRequestError } from "@/features/api-client";
import { completeProfile } from "@/features/auth/account-api";
import { ProfileFields } from "@/features/auth/profile-form";
import {
  mapApiFieldErrors,
  profileFormFrom,
  validateProfileForm,
  type ProfileFormErrors,
  type ProfileFormValues,
} from "@/features/auth/profile";
import { useSession } from "@/features/auth/use-session";

export default function CompleteProfileScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const scheme = Colors.dark.background === theme.background ? "dark" : "light";
  const colors = Colors[scheme];
  const { status, token, user, logout, refreshProfile } = useSession();
  const [values, setValues] = useState<ProfileFormValues>(() => profileFormFrom(user?.details ?? null));
  const [fieldErrors, setFieldErrors] = useState<ProfileFormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (status === "authenticated" && user?.perfilCompleto) router.replace("/perfil");
  }, [status, user?.perfilCompleto]);

  const submit = async () => {
    if (!token || !user) return;
    setError(null);
    setFieldErrors({});
    const result = validateProfileForm(values, {
      email: user.correo,
      role: user.rol,
      currentPhone: user.details?.telefono,
    });
    if (!result.payload) {
      setFieldErrors(result.errors);
      setError("Revisa los campos marcados.");
      return;
    }
    setSubmitting(true);
    try {
      await completeProfile(token, result.payload);
      await refreshProfile();
    } catch (cause) {
      if (cause instanceof ApiRequestError) {
        if (cause.code === "edad_minima") setBlocked(true);
        setFieldErrors(mapApiFieldErrors(cause.fieldErrors));
      }
      setError(cause instanceof Error ? cause.message : "No se pudieron guardar los datos.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>REGENERA · TU CUENTA</Text>
        <Text style={[styles.title, { color: colors.text }]}>Completa tu perfil</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Tu cuenta es anterior a estos datos. Complétalos una sola vez para seguir usando Regenera.
        </Text>

        <ProfileFields
          values={values}
          errors={fieldErrors}
          colors={colors}
          role={user?.rol}
          includeOptional
          onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
        />

        {!!error && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}

        {!blocked && (
          <Pressable
            accessibilityRole="button"
            disabled={submitting}
            onPress={submit}
            style={[styles.primaryButton, submitting && styles.disabled]}
          >
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Guardar y continuar</Text>}
          </Pressable>
        )}

        <View style={styles.footer}>
          <Pressable accessibilityRole="button" onPress={() => logout()} style={styles.secondaryButton}>
            <Text style={[styles.secondaryText, { color: colors.textSecondary }]}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 22, gap: 14 },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  title: { fontSize: 28, fontWeight: "800" },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 4 },
  errorText: { color: "#A14537", fontSize: 13, lineHeight: 19 },
  primaryButton: { backgroundColor: "#164F3D", minHeight: 50, borderRadius: 15, justifyContent: "center", alignItems: "center" },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  disabled: { opacity: 0.6 },
  footer: { alignItems: "center" },
  secondaryButton: { paddingVertical: 12 },
  secondaryText: { fontSize: 14, fontWeight: "700" },
});
