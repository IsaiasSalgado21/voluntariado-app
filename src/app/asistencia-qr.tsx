import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useSession } from "@/features/auth/use-session";
import { scanAttendanceQr } from "@/features/asistencia/api";

export default function AttendanceQrScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colors = Colors[Colors.dark.background === theme.background ? "dark" : "light"];
  const { status, token, user } = useSession();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const scan = async (raw: string) => {
    if (!token || working || scanned) return;
    setScanned(true);
    setWorking(true);
    setMessage(null);
    try {
      const attendanceToken = extractAttendanceToken(raw);
      if (!attendanceToken) throw new Error("Este QR no contiene un token de asistencia válido.");
      await scanAttendanceQr(token, attendanceToken);
      setSuccess(true);
      setMessage("Asistencia registrada. La API confirmó tu inscripción y el horario de la actividad.");
    } catch (cause) {
      setScanned(false);
      setMessage(cause instanceof Error ? cause.message : "No se pudo registrar la asistencia.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + 10, paddingBottom: insets.bottom + 18 }]}>
      <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/inscripciones")} style={styles.backButton}>
        <Text style={styles.backText}>‹  Mis inscripciones</Text>
      </Pressable>
      <Text style={styles.eyebrow}>REGENERA · ASISTENCIA</Text>
      <Text style={[styles.title, { color: colors.text }]}>Escanea el QR</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Inicia sesión como participante inscrito. El servidor confirmará tu inscripción y que la actividad esté en horario.
      </Text>

      {status !== "authenticated" || !token ? (
        <View style={[styles.stateCard, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.body, { color: colors.textSecondary }]}>Inicia sesión para registrar tu asistencia.</Text>
          <Pressable onPress={() => router.push("/login")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
          </Pressable>
        </View>
      ) : user?.estado !== "activo" || !["usuario", "organizador"].includes(user.rol) ? (
        <View style={[styles.stateCard, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            La cuenta debe estar activa y tener rol de voluntario u organizador.
          </Text>
        </View>
      ) : !permission ? (
        <View style={styles.cameraPlaceholder}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      ) : !permission.granted ? (
        <View style={[styles.stateCard, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Se necesita acceso a la cámara para leer el código QR.
          </Text>
          <Pressable
            onPress={() => permission.canAskAgain ? void requestPermission() : void Linking.openSettings()}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              {permission.canAskAgain ? "Permitir cámara" : "Abrir ajustes"}
            </Text>
          </Pressable>
        </View>
      ) : success ? (
        <View style={[styles.stateCard, { backgroundColor: colors.backgroundElement }]}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Asistencia confirmada</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{message}</Text>
          <Pressable onPress={() => router.replace("/inscripciones")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Volver a mis inscripciones</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.cameraFrame}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={scanned ? undefined : ({ data }) => void scan(data)}
            />
            <View pointerEvents="none" style={styles.scanTarget} />
            {working && (
              <View style={styles.cameraOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.overlayText}>Validando con la API…</Text>
              </View>
            )}
          </View>
          {message && (
            <View style={[styles.messageCard, { backgroundColor: colors.backgroundElement }]}>
              <Text accessibilityRole="alert" style={styles.errorText}>{message}</Text>
              <Pressable onPress={() => setMessage(null)} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Intentar de nuevo</Text>
              </Pressable>
            </View>
          )}
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Mantén el código dentro del marco. Si la cámara no detecta el QR, revisa el permiso de cámara en Ajustes.
          </Text>
        </>
      )}
    </View>
  );
}

function extractAttendanceToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    const hash = parsed.hash.replace(/^#/, "");
    return hash ? decodeURIComponent(hash) : null;
  } catch {
    return trimmed.length <= 128 ? trimmed : null;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 18, gap: 12 },
  backButton: { paddingVertical: 8 },
  backText: { color: "#164F3D", fontSize: 15, fontWeight: "700" },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  title: { fontSize: 27, fontWeight: "800" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  cameraFrame: { flex: 1, minHeight: 280, maxHeight: 500, borderRadius: 20, overflow: "hidden", backgroundColor: "#15211A" },
  cameraPlaceholder: { flex: 1, minHeight: 280, borderRadius: 20, backgroundColor: "#15211A", alignItems: "center", justifyContent: "center" },
  scanTarget: { alignSelf: "center", width: 220, height: 220, marginTop: 50, borderWidth: 3, borderColor: "#FFFFFF", borderRadius: 22, backgroundColor: "transparent" },
  cameraOverlay: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#00000099" },
  overlayText: { color: "#FFFFFF", fontWeight: "700" },
  stateCard: { padding: 20, borderRadius: 18, gap: 12 },
  sectionTitle: { fontSize: 19, fontWeight: "800" },
  body: { fontSize: 14, lineHeight: 21 },
  primaryButton: { alignItems: "center", justifyContent: "center", minHeight: 46, paddingHorizontal: 16, borderRadius: 13, backgroundColor: "#164F3D" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  successIcon: { color: "#164F3D", fontSize: 38, fontWeight: "800" },
  messageCard: { padding: 14, borderRadius: 14, gap: 8 },
  errorText: { color: "#9E3030", fontSize: 13, lineHeight: 19 },
  secondaryButton: { alignSelf: "flex-start", paddingVertical: 6 },
  secondaryButtonText: { color: "#164F3D", fontWeight: "700" },
  hint: { fontSize: 12, lineHeight: 18, textAlign: "center" },
});
