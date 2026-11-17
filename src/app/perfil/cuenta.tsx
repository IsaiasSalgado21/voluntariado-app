import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { ApiRequestError } from "@/features/api-client";
import { updateEmail, updatePassword } from "@/features/auth/account-api";
import { FormField } from "@/features/auth/form-controls";
import { useSession } from "@/features/auth/use-session";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AccountSecurityScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const scheme = Colors.dark.background === theme.background ? "dark" : "light";
  const colors = Colors[scheme];
  const { status, token, user, refreshProfile } = useSession();

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailErrors, setEmailErrors] = useState<Record<string, string>>({});
  const [emailMessage, setEmailMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status]);

  const submitEmail = async () => {
    if (!token) return;
    setEmailMessage(null);
    const errors: Record<string, string> = {};
    const normalized = newEmail.trim().toLocaleLowerCase("es-MX");
    if (!EMAIL_PATTERN.test(normalized)) errors.correo = "Escribe un correo electrónico válido.";
    else if (normalized === user?.correo.toLocaleLowerCase("es-MX")) errors.correo = "Escribe un correo distinto al actual.";
    if (!emailPassword) errors.password_actual = "Escribe tu contraseña actual.";
    setEmailErrors(errors);
    if (Object.keys(errors).length) return;

    setEmailBusy(true);
    try {
      const result = await updateEmail(token, normalized, emailPassword);
      setEmailMessage({ text: result.message, ok: true });
      setNewEmail("");
      setEmailPassword("");
      await refreshProfile();
    } catch (cause) {
      if (cause instanceof ApiRequestError) setEmailErrors(cause.fieldErrors);
      setEmailMessage({ text: failureMessage(cause), ok: false });
    } finally {
      setEmailBusy(false);
    }
  };

  const submitPassword = async () => {
    if (!token) return;
    setPasswordMessage(null);
    const errors: Record<string, string> = {};
    if (!currentPassword) errors.password_actual = "Escribe tu contraseña actual.";
    if (newPassword.length < 8) errors.password = "La contraseña debe tener al menos 8 caracteres.";
    else if (newPassword !== confirmation) errors.password_confirmation = "Las contraseñas no coinciden.";
    setPasswordErrors(errors);
    if (Object.keys(errors).length) return;

    setPasswordBusy(true);
    try {
      const result = await updatePassword(token, currentPassword, newPassword, confirmation);
      setPasswordMessage({ text: result.message, ok: true });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
    } catch (cause) {
      if (cause instanceof ApiRequestError) setPasswordErrors(cause.fieldErrors);
      setPasswordMessage({ text: failureMessage(cause), ok: false });
    } finally {
      setPasswordBusy(false);
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
        <Text style={[styles.title, { color: colors.text }]}>Correo y contraseña</Text>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Cambiar correo</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Correo actual: {user?.correo}</Text>
          <FormField
            label="Nuevo correo"
            value={newEmail}
            onChangeText={setNewEmail}
            error={emailErrors.correo}
            colors={colors}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
          <FormField
            label="Contraseña actual"
            value={emailPassword}
            onChangeText={setEmailPassword}
            error={emailErrors.password_actual}
            colors={colors}
            secureTextEntry
            autoComplete="current-password"
          />
          <Message message={emailMessage} />
          <SubmitButton label="Actualizar correo" busy={emailBusy} onPress={submitEmail} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Cambiar contraseña</Text>
          <FormField
            label="Contraseña actual"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            error={passwordErrors.password_actual}
            colors={colors}
            secureTextEntry
            autoComplete="current-password"
          />
          <FormField
            label="Nueva contraseña"
            value={newPassword}
            onChangeText={setNewPassword}
            error={passwordErrors.password}
            hint="Al menos 8 caracteres."
            colors={colors}
            secureTextEntry
            autoComplete="new-password"
          />
          <FormField
            label="Confirmar nueva contraseña"
            value={confirmation}
            onChangeText={setConfirmation}
            error={passwordErrors.password_confirmation}
            colors={colors}
            secureTextEntry
            autoComplete="new-password"
          />
          <Message message={passwordMessage} />
          <SubmitButton label="Actualizar contraseña" busy={passwordBusy} onPress={submitPassword} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function failureMessage(cause: unknown): string {
  if (cause instanceof ApiRequestError && cause.status === 429) {
    return "Demasiados intentos. Espera un minuto e inténtalo de nuevo.";
  }
  if (cause instanceof ApiRequestError && cause.status === 409) {
    return "Tus datos cambiaron mientras guardabas. Vuelve a intentarlo.";
  }
  return cause instanceof Error ? cause.message : "No se pudo completar la solicitud.";
}

function Message({ message }: { message: { text: string; ok: boolean } | null }) {
  if (!message) return null;
  return (
    <Text
      accessibilityRole={message.ok ? undefined : "alert"}
      style={message.ok ? styles.noticeText : styles.errorText}
    >
      {message.text}
    </Text>
  );
}

function SubmitButton({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={[styles.primaryButton, busy && styles.disabled]}
    >
      {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, gap: 16 },
  backButton: { paddingVertical: 2, alignSelf: "flex-start" },
  backText: { color: "#164F3D", fontSize: 15, fontWeight: "700" },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  title: { fontSize: 28, fontWeight: "800" },
  card: { borderRadius: 20, padding: 18, gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: "800" },
  errorText: { color: "#A14537", fontSize: 13, lineHeight: 19 },
  noticeText: { color: "#164F3D", fontSize: 13, lineHeight: 19, fontWeight: "700" },
  primaryButton: { backgroundColor: "#164F3D", minHeight: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  disabled: { opacity: 0.6 },
});
