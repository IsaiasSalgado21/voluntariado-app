import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useSession } from "@/features/auth/use-session";
import {
  fetchAdminUsers,
  saveAdminUser,
  type AdminUser,
  type AdminUserInput,
} from "@/features/admin/api";

type Palette = typeof Colors.light | typeof Colors.dark;

export default function AdminUserEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const userId = Array.isArray(id) ? id[0] : id;
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colors = Colors[Colors.dark.background === theme.background ? "dark" : "light"];
  const { status, token } = useSession();
  const [form, setForm] = useState<AdminUserInput>({
    nombre: "",
    correo: "",
    rol: "usuario",
    estado: "activo",
    organizadorVerificado: false,
  });
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(Boolean(userId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !token) return;
    let active = true;
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      try {
        const users = await fetchAdminUsers(token, controller.signal);
        const selected = users.find((item) => item.id === userId);
        if (!selected) throw new Error("No se encontró la cuenta.");
        if (active) setForm({
          nombre: selected.nombre,
          correo: selected.correo,
          rol: selected.rol,
          estado: selected.estado,
          organizadorVerificado: selected.organizadorVerificado,
        });
      } catch (cause) {
        if (active && !controller.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudo cargar la cuenta.");
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [userId, token]);

  const save = async () => {
    if (!token) return;
    if (!form.nombre.trim() || !form.correo.trim()) {
      setError("Completa nombre y correo.");
      return;
    }
    if (!userId && password.length < 8) {
      setError("La contraseña inicial debe tener al menos 8 caracteres.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveAdminUser(token, {
        ...form,
        nombre: form.nombre.trim(),
        correo: form.correo.trim(),
        ...(password ? { password } : {}),
      }, userId);
      router.replace("/admin/usuarios");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la cuenta.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 30 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/admin/usuarios")} style={styles.backButton}>
        <Text style={styles.backText}>‹  Usuarios y roles</Text>
      </Pressable>
      <Text style={styles.eyebrow}>REGENERA · CUENTAS</Text>
      <Text style={[styles.title, { color: colors.text }]}>{userId ? "Editar usuario" : "Crear usuario"}</Text>
      {loading ? <ActivityIndicator size="large" color="#164F3D" /> : (
        <View style={styles.form}>
          <Field label="Nombre" value={form.nombre} onChange={(nombre) => setForm((current) => ({ ...current, nombre }))} colors={colors} />
          <Field label="Correo" value={form.correo} onChange={(correo) => setForm((current) => ({ ...current, correo }))} colors={colors} keyboardType="email-address" />
          {!userId && (
            <Field label="Contraseña inicial" value={password} onChange={setPassword} colors={colors} secureTextEntry />
          )}
          {userId && (
            <Field label="Nueva contraseña (opcional)" value={password} onChange={setPassword} colors={colors} secureTextEntry />
          )}
          <Text style={styles.label}>Rol</Text>
          <View style={styles.chips}>
            {(["usuario", "organizador", "admin"] as AdminUser["rol"][]).map((role) => (
              <Pressable key={role} onPress={() => setForm((current) => ({ ...current, rol: role }))} style={[styles.chip, form.rol === role && styles.selectedChip]}>
                <Text style={[styles.chipText, form.rol === role && styles.selectedChipText]}>{roleLabel(role)}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Estado de cuenta</Text>
          <View style={styles.chips}>
            {(["activo", "inactivo"] as AdminUser["estado"][]).map((state) => (
              <Pressable key={state} onPress={() => setForm((current) => ({ ...current, estado: state }))} style={[styles.chip, form.estado === state && styles.selectedChip]}>
                <Text style={[styles.chipText, form.estado === state && styles.selectedChipText]}>{state === "activo" ? "Activo" : "Inactivo"}</Text>
              </Pressable>
            ))}
          </View>
          {form.rol === "organizador" && (
            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.label}>Organizador verificado</Text>
                <Text style={styles.hint}>La insignia de verificación se muestra según este estado.</Text>
              </View>
              <Switch
                value={form.organizadorVerificado}
                onValueChange={(organizadorVerificado) => setForm((current) => ({ ...current, organizadorVerificado }))}
                trackColor={{ true: "#164F3D" }}
              />
            </View>
          )}
          <View style={[styles.notice, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              El backend valida unicidad de correo, formato, longitud de contraseña y permisos de administrador. No guardes contraseñas en notas o capturas.
            </Text>
          </View>
          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Pressable disabled={saving} onPress={() => void save()} style={[styles.primaryButton, saving && styles.disabled]}>
            <Text style={styles.primaryButtonText}>{saving ? "Guardando…" : userId ? "Guardar cambios" : "Crear cuenta"}</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChange,
  colors,
  keyboardType = "default",
  secureTextEntry = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  colors: Palette;
  keyboardType?: "default" | "email-address";
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        autoCapitalize={keyboardType === "email-address" ? "none" : "words"}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoComplete={secureTextEntry ? "new-password" : "off"}
        placeholderTextColor="#87958D"
        style={[styles.input, { color: colors.text }]}
      />
    </View>
  );
}

function roleLabel(role: AdminUser["rol"]): string {
  return { usuario: "Voluntario", organizador: "Organizador", admin: "Administrador" }[role];
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, gap: 13 },
  backButton: { paddingVertical: 8 },
  backText: { color: "#164F3D", fontSize: 15, fontWeight: "700" },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  title: { fontSize: 27, fontWeight: "800" },
  form: { gap: 15 },
  field: { gap: 6 },
  label: { color: "#47594F", fontSize: 13, fontWeight: "700" },
  input: { minHeight: 48, borderWidth: 1, borderColor: "#CAD5CD", borderRadius: 13, paddingHorizontal: 13, backgroundColor: "#FFFFFF", fontSize: 15 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: "#CAD5CD", borderRadius: 13, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: "#FFFFFF" },
  selectedChip: { borderColor: "#164F3D", backgroundColor: "#DCE8DF" },
  chipText: { color: "#47594F", fontSize: 13, fontWeight: "600" },
  selectedChipText: { color: "#164F3D" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  switchCopy: { flex: 1, gap: 4 },
  hint: { fontSize: 12, lineHeight: 18 },
  notice: { padding: 12, borderRadius: 12 },
  error: { color: "#9E3030", fontSize: 13, lineHeight: 19 },
  primaryButton: { alignItems: "center", justifyContent: "center", minHeight: 48, borderRadius: 13, backgroundColor: "#164F3D" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  disabled: { opacity: 0.6 },
});
