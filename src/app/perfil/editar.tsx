import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { ApiRequestError } from "@/features/api-client";
import { updateDetails, updateName } from "@/features/auth/account-api";
import { FormField } from "@/features/auth/form-controls";
import { ProfileFields } from "@/features/auth/profile-form";
import {
  mapApiFieldErrors,
  profileFormFrom,
  validateProfileForm,
  type ProfileFormErrors,
  type ProfileFormValues,
} from "@/features/auth/profile";
import { useSession } from "@/features/auth/use-session";

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const scheme = Colors.dark.background === theme.background ? "dark" : "light";
  const colors = Colors[scheme];
  const { status, token, user, refreshProfile } = useSession();
  const [name, setName] = useState(user?.nombre ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [values, setValues] = useState<ProfileFormValues>(() => profileFormFrom(user?.details ?? null));
  const [fieldErrors, setFieldErrors] = useState<ProfileFormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status]);

  const submit = async () => {
    if (!token || !user) return;
    setError(null);
    setNotice(null);
    setNameError(null);
    setFieldErrors({});

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Escribe tu nombre.");
      return;
    }
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
      if (trimmedName !== user.nombre) await updateName(token, trimmedName);
      // The API ignores the stored birth date on update, so it is not sent.
      const { fechaNacimiento: _birthDate, ...details } = result.payload;
      await updateDetails(token, details);
      await refreshProfile();
      setNotice("Perfil actualizado correctamente.");
    } catch (cause) {
      if (cause instanceof ApiRequestError) {
        setFieldErrors(mapApiFieldErrors(cause.fieldErrors));
        if (cause.fieldErrors.nombre) setNameError(cause.fieldErrors.nombre);
      }
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar el perfil.");
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
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver a mi perfil"
          onPress={() => router.canGoBack() ? router.back() : router.replace("/perfil")}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹  Mi perfil</Text>
        </Pressable>
        <Text style={styles.eyebrow}>REGENERA · TU CUENTA</Text>
        <Text style={[styles.title, { color: colors.text }]}>Editar perfil</Text>

        <FormField
          label="Nombre"
          value={name}
          onChangeText={setName}
          error={nameError ?? undefined}
          colors={colors}
          autoCapitalize="words"
          autoComplete="name"
          maxLength={150}
        />

        <View style={styles.readOnly}>
          <Text style={[styles.readOnlyLabel, { color: colors.text }]}>Fecha de nacimiento</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 15 }}>
            {values.fechaNacimiento || "Sin registrar"}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
            No se puede modificar desde aquí.
          </Text>
        </View>

        <ProfileFields
          values={values}
          errors={fieldErrors}
          colors={colors}
          role={user?.rol}
          includeBirthDate={false}
          includeOptional
          onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
        />

        {!!error && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}
        {!!notice && <Text style={styles.noticeText}>{notice}</Text>}

        <Pressable
          accessibilityRole="button"
          disabled={submitting}
          onPress={submit}
          style={[styles.primaryButton, submitting && styles.disabled]}
        >
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Guardar cambios</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, gap: 14 },
  backButton: { paddingVertical: 2, alignSelf: "flex-start" },
  backText: { color: "#164F3D", fontSize: 15, fontWeight: "700" },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  title: { fontSize: 28, fontWeight: "800" },
  readOnly: { gap: 4 },
  readOnlyLabel: { fontSize: 14, fontWeight: "700" },
  errorText: { color: "#A14537", fontSize: 13, lineHeight: 19 },
  noticeText: { color: "#164F3D", fontSize: 13, lineHeight: 19, fontWeight: "700" },
  primaryButton: { backgroundColor: "#164F3D", minHeight: 50, borderRadius: 15, justifyContent: "center", alignItems: "center" },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  disabled: { opacity: 0.6 },
});
