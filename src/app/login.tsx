import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useSession } from "@/features/auth/use-session";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const scheme = Colors.dark.background === theme.background ? "dark" : "light";
  const colors = Colors[scheme];
  const { status, login, register, error: sessionError, clearError } = useSession();
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/perfil");
  }, [status]);

  const switchMode = () => {
    setError(null);
    clearError();
    setIsRegistering((current) => !current);
  };

  const submit = async () => {
    setError(null);
    clearError();
    const normalizedEmail = email.trim().toLocaleLowerCase("es-MX");

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Escribe un correo electrónico válido.");
      return;
    }
    if (!password) {
      setError("Escribe tu contraseña.");
      return;
    }
    if (isRegistering) {
      if (!name.trim()) {
        setError("Escribe tu nombre.");
        return;
      }
      if (password.length < 8) {
        setError("La contraseña debe tener al menos 8 caracteres.");
        return;
      }
      if (password !== passwordConfirmation) {
        setError("Las contraseñas no coinciden.");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isRegistering) {
        await register(name.trim(), normalizedEmail, password, passwordConfirmation);
      } else {
        await login(normalizedEmail, password);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo completar la solicitud.");
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
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver a más opciones"
          onPress={() => router.canGoBack() ? router.back() : router.replace("/mas")}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹  Más opciones</Text>
        </Pressable>

        <View style={[styles.brandMark, { backgroundColor: colors.backgroundSelected }]}>
          <Text style={styles.brandIcon}>🌱</Text>
        </View>
        <Text style={styles.eyebrow}>REGENERA · BAJA CALIFORNIA SUR</Text>
        <Text style={[styles.title, { color: colors.text }]}>
          {isRegistering ? "Crear cuenta" : "Bienvenido"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isRegistering
            ? "Únete a la comunidad que cuida nuestros ecosistemas."
            : "Inicia sesión para consultar tu perfil y participar."}
        </Text>

        <View style={styles.form}>
          {isRegistering && (
            <FormField
              label="Nombre"
              accessibilityLabel="Nombre"
              placeholder="Tu nombre"
              value={name}
              onChangeText={setName}
              colors={colors}
              autoCapitalize="words"
              autoComplete="name"
            />
          )}
          <FormField
            label="Correo electrónico"
            accessibilityLabel="Correo electrónico"
            placeholder="nombre@correo.com"
            value={email}
            onChangeText={setEmail}
            colors={colors}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
          <FormField
            label="Contraseña"
            accessibilityLabel="Contraseña"
            placeholder={isRegistering ? "Al menos 8 caracteres" : "Tu contraseña"}
            value={password}
            onChangeText={setPassword}
            colors={colors}
            secureTextEntry
            autoComplete={isRegistering ? "new-password" : "current-password"}
            onSubmitEditing={isRegistering ? undefined : submit}
          />
          {isRegistering && (
            <FormField
              label="Confirmar contraseña"
              accessibilityLabel="Confirmar contraseña"
              placeholder="Repite tu contraseña"
              value={passwordConfirmation}
              onChangeText={setPasswordConfirmation}
              colors={colors}
              secureTextEntry
              autoComplete="new-password"
              onSubmitEditing={submit}
            />
          )}
        </View>

        {(error || sessionError || status === "loading") && (
          <Text
            accessibilityRole={error || sessionError ? "alert" : undefined}
            style={[
              styles.feedback,
              error || sessionError ? styles.errorText : { color: colors.textSecondary },
            ]}
          >
            {error ?? sessionError ?? "Comprobando sesión…"}
          </Text>
        )}

        <Pressable
          accessibilityRole="button"
          disabled={submitting || status === "loading"}
          onPress={submit}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || submitting) && styles.pressed,
            (submitting || status === "loading") && styles.disabled,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {isRegistering ? "Crear cuenta" : "Iniciar sesión"}
            </Text>
          )}
        </Pressable>

        <Pressable accessibilityRole="button" disabled={submitting} onPress={switchMode} style={styles.modeButton}>
          <Text style={[styles.modeText, { color: colors.textSecondary }]}>
            {isRegistering ? "¿Ya tienes cuenta? " : "¿Aún no tienes cuenta? "}
            <Text style={styles.modeTextStrong}>{isRegistering ? "Inicia sesión" : "Crear cuenta"}</Text>
          </Text>
        </Pressable>

        <Text style={[styles.privacyNote, { color: colors.textSecondary }]}>
          Tu sesión se guarda de forma segura en este dispositivo.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FormField({
  label,
  accessibilityLabel,
  colors,
  ...inputProps
}: {
  label: string;
  accessibilityLabel: string;
  colors: (typeof Colors)[keyof typeof Colors];
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={accessibilityLabel}
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement }]}
        returnKeyType={inputProps.onSubmitEditing ? "go" : "next"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 22, gap: 14 },
  backButton: { paddingVertical: 2, alignSelf: "flex-start" },
  backText: { color: "#164F3D", fontSize: 15, fontWeight: "700" },
  brandMark: { width: 58, height: 58, borderRadius: 20, justifyContent: "center", alignItems: "center", marginTop: 16 },
  brandIcon: { fontSize: 30 },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "800", letterSpacing: 0.8, marginTop: 4 },
  title: { fontSize: 30, fontWeight: "800" },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 4 },
  form: { gap: 14 },
  field: { gap: 7 },
  fieldLabel: { fontSize: 14, fontWeight: "700" },
  input: { minHeight: 50, borderRadius: 14, paddingHorizontal: 15, fontSize: 16 },
  feedback: { fontSize: 13, lineHeight: 19 },
  errorText: { color: "#A14537" },
  primaryButton: { backgroundColor: "#164F3D", minHeight: 50, borderRadius: 15, justifyContent: "center", alignItems: "center", marginTop: 2 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.6 },
  modeButton: { alignItems: "center", paddingVertical: 12 },
  modeText: { fontSize: 14 },
  modeTextStrong: { color: "#164F3D", fontWeight: "800" },
  privacyNote: { fontSize: 12, textAlign: "center", marginTop: "auto", paddingTop: 16 },
});
