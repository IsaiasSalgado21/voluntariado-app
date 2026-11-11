import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useSession } from "@/features/auth/use-session";
import {
  cancelEnrollment,
  createEnrollment,
  fetchMyEnrollment,
} from "@/features/inscripciones/api";
import {
  fetchPlaces,
  fetchVoluntariado,
  type PlaceOption,
  type VolunteerMapItem,
} from "@/features/voluntariados/api";

export default function VolunteerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const volunteerId = (Array.isArray(id) ? id[0] : id) ?? "";
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const scheme = Colors.dark.background === theme.background ? "dark" : "light";
  const colors = Colors[scheme];
  const { status: sessionStatus, token, user } = useSession();
  const [volunteer, setVolunteer] = useState<VolunteerMapItem | null>(null);
  const [place, setPlace] = useState<PlaceOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [enrollmentWorking, setEnrollmentWorking] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const canEnroll = Boolean(
    token
    && user?.estado === "activo"
    && (user.rol === "usuario" || user.rol === "organizador"),
  );

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active || !token || !user || !canEnroll || !volunteerId) return;

      setEnrollmentLoading(true);
      setEnrollmentError(null);
      try {
        const result = await fetchMyEnrollment(token, volunteerId, controller.signal);
        if (active) {
          setEnrolled(result.enrolled);
          setEnrollmentId(result.enrollmentId);
        }
      } catch (cause) {
        if (active && !controller.signal.aborted) {
          setEnrollmentError(
            cause instanceof Error ? cause.message : "No se pudo consultar tu inscripción.",
          );
        }
      } finally {
        if (active && !controller.signal.aborted) setEnrollmentLoading(false);
      }
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [token, user, canEnroll, volunteerId]);

  const enroll = async () => {
    if (!token) return;
    setEnrollmentWorking(true);
    setEnrollmentError(null);
    try {
      const result = await createEnrollment(token, volunteerId);
      setEnrollmentId(result.id);
      setEnrolled(true);
    } catch (cause) {
      setEnrollmentError(cause instanceof Error ? cause.message : "No se pudo registrar tu inscripción.");
    } finally {
      setEnrollmentWorking(false);
    }
  };

  const cancel = async () => {
    if (!token || !enrollmentId) return;
    setEnrollmentWorking(true);
    setEnrollmentError(null);
    try {
      await cancelEnrollment(token, enrollmentId);
      setEnrolled(false);
      setEnrollmentId(null);
      setConfirmCancel(false);
    } catch (cause) {
      setEnrollmentError(cause instanceof Error ? cause.message : "No se pudo cancelar tu inscripción.");
    } finally {
      setEnrollmentWorking(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setLoading(true);
      setError(null);
      try {
        const [found, places] = await Promise.all([
          fetchVoluntariado(volunteerId, controller.signal),
          fetchPlaces(controller.signal),
        ]);
        if (active) {
          setVolunteer(found);
          setPlace(found ? places.find((candidate) => candidate.id === found.lugar_id) ?? null : null);
        }
      } catch (cause) {
        if (active && !controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "No se pudo cargar el voluntariado.");
        }
      } finally {
        if (active && !controller.signal.aborted) setLoading(false);
      }
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [volunteerId]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/voluntariados");
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color="#164F3D" size="large" />
        <Text style={[styles.muted, { color: colors.textSecondary }]}>Cargando voluntariado…</Text>
      </View>
    );
  }

  if (error || !volunteer) {
    return (
      <View style={[styles.center, styles.errorState, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {error ? "No pudimos abrir esta actividad" : "Voluntariado no disponible"}
        </Text>
        <Text style={[styles.muted, { color: colors.textSecondary }]}>
          {error ?? "La actividad pudo dejar de estar publicada o no tiene una ubicación disponible."}
        </Text>
        <Pressable onPress={goBack} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Volver a voluntariados</Text>
        </Pressable>
      </View>
    );
  }

  const date = formatDate(volunteer.fecha_inicio);
  const mapUrl = `https://www.openstreetmap.org/?mlat=${volunteer.lat}&mlon=${volunteer.lng}#map=15/${volunteer.lat}/${volunteer.lng}`;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 10,
        paddingBottom: insets.bottom + 28,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver a la lista de voluntariados"
        onPress={goBack}
        style={styles.backButton}
      >
        <Text style={styles.backText}>‹  Voluntariados</Text>
      </Pressable>

      <View style={[styles.hero, { backgroundColor: colors.backgroundElement }]}>
        <Text style={styles.eyebrow}>REGENERA · PARTICIPA</Text>
        <Text style={[styles.title, { color: colors.text }]}>{volunteer.titulo}</Text>
        {volunteer.categoria && (
          <Text style={styles.category}>{formatCategory(volunteer.categoria)}</Text>
        )}
      </View>

      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tu participación</Text>
          {sessionStatus === "loading" ? (
            <ActivityIndicator color="#164F3D" />
          ) : !token ? (
            <>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                Inicia sesión para inscribirte y consultar tu participación.
              </Text>
              <Pressable onPress={() => router.push("/login")} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
              </Pressable>
            </>
          ) : !canEnroll ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {!user
                ? "No pudimos verificar tu perfil. Intenta abrir Mi perfil e iniciar sesión de nuevo."
                : user.rol === "admin"
                  ? "Las cuentas administradoras no pueden inscribirse en actividades."
                  : user.estado !== "activo"
                    ? "Tu cuenta debe estar activa para inscribirte."
                    : "No hay una cuenta disponible para esta participación."}
            </Text>
          ) : enrollmentLoading ? (
            <ActivityIndicator color="#164F3D" />
          ) : enrolled ? (
            <>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                Ya tienes una inscripción activa para esta actividad.
              </Text>
              {confirmCancel ? (
                <View style={styles.cancelActions}>
                  <Text style={[styles.muted, { color: colors.textSecondary }]}>
                    ¿Quieres cancelar tu participación?
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={enrollmentWorking}
                    onPress={() => void cancel()}
                    style={[styles.cancelButton, enrollmentWorking && styles.disabled]}
                  >
                    <Text style={styles.cancelButtonText}>
                      {enrollmentWorking ? "Cancelando…" : "Sí, cancelar"}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => setConfirmCancel(false)} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Conservar inscripción</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setConfirmCancel(true)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Cancelar inscripción</Text>
                </Pressable>
              )}
              <Pressable onPress={() => router.push("/inscripciones")} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Ver mis inscripciones</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {volunteer.lleno
                  ? "Esta actividad ya no tiene cupo disponible."
                  : "Confirma tu participación en esta actividad."}
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={volunteer.lleno || enrollmentWorking}
                onPress={() => void enroll()}
                style={[
                  styles.primaryButton,
                  (volunteer.lleno || enrollmentWorking) && styles.disabled,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {enrollmentWorking ? "Registrando…" : volunteer.lleno ? "Cupo completo" : "Inscribirme"}
                </Text>
              </Pressable>
            </>
          )}
          {enrollmentError && (
            <Text accessibilityRole="alert" style={styles.errorText}>{enrollmentError}</Text>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Sobre la actividad</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {volunteer.descripcion}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Información</Text>
          <Fact label="Fecha de inicio" value={date} />
          <Fact label="Lugar" value={place?.nombre ?? volunteer.lugar_nombre ?? "Sin lugar registrado"} />
          {place?.municipio && <Fact label="Municipio" value={place.municipio} />}
          <Fact
            label="Cupo"
            value={
              volunteer.lleno
                ? `Lleno · ${volunteer.inscripciones_activas} de ${volunteer.cupo}`
                : `${Math.max(0, volunteer.cupo - volunteer.inscripciones_activas)} lugares disponibles`
            }
          />
          <Fact label="Estado" value="Publicado" />
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Ubicación</Text>
          {Platform.OS === "web" ? (
            <Pressable onPress={() => Linking.openURL(mapUrl)} style={styles.mapLink}>
              <Text style={styles.mapLinkText}>Abrir ubicación en OpenStreetMap →</Text>
            </Pressable>
          ) : (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: volunteer.lat,
                longitude: volunteer.lng,
                latitudeDelta: 0.025,
                longitudeDelta: 0.025,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
            >
              <Marker
                coordinate={{ latitude: volunteer.lat, longitude: volunteer.lng }}
                title={volunteer.titulo}
                description={place?.nombre ?? volunteer.lugar_nombre ?? undefined}
              />
            </MapView>
          )}
          {Platform.OS !== "web" && (
            <Pressable onPress={() => Linking.openURL(mapUrl)} style={styles.mapLink}>
              <Text style={styles.mapLinkText}>Abrir en OpenStreetMap →</Text>
            </Pressable>
          )}
        </View>

        <View style={[styles.notice, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.muted, { color: colors.textSecondary }]}>
            La API pública disponible para la app todavía no incluye galería de imágenes,
            horario, requisitos ni materiales de esta actividad.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "Fecha por confirmar";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha por confirmar";
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatCategory(value: string): string {
  return value
    .split("-")
    .map((word) => word.charAt(0).toLocaleUpperCase("es-MX") + word.slice(1))
    .join(" ");
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 24 },
  errorState: { alignItems: "stretch" },
  backButton: { paddingHorizontal: 20, paddingVertical: 12 },
  backText: { color: "#164F3D", fontSize: 16, fontWeight: "700" },
  hero: { paddingHorizontal: 22, paddingVertical: 26, gap: 10 },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  title: { fontSize: 27, fontWeight: "800", lineHeight: 34 },
  category: { alignSelf: "flex-start", color: "#164F3D", backgroundColor: "#DCE8DF", borderRadius: 14, paddingHorizontal: 11, paddingVertical: 6, fontSize: 12, fontWeight: "700", overflow: "hidden" },
  content: { padding: 18, gap: 14 },
  card: { padding: 18, borderRadius: 18, gap: 13 },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  description: { fontSize: 15, lineHeight: 23 },
  fact: { gap: 3 },
  factLabel: { color: "#61746A", fontSize: 12, fontWeight: "600" },
  factValue: { color: "#20332B", fontSize: 15, fontWeight: "700" },
  map: { height: 220, borderRadius: 14 },
  mapLink: { paddingVertical: 8 },
  mapLinkText: { color: "#164F3D", fontWeight: "700" },
  notice: { padding: 15, borderRadius: 16 },
  muted: { fontSize: 14, lineHeight: 21, textAlign: "center" },
  primaryButton: { alignItems: "center", justifyContent: "center", minHeight: 46, marginTop: 6, paddingHorizontal: 16, borderRadius: 13, backgroundColor: "#164F3D" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  secondaryButton: { alignItems: "center", paddingVertical: 9 },
  secondaryButtonText: { color: "#164F3D", fontSize: 14, fontWeight: "700" },
  cancelActions: { gap: 6 },
  cancelButton: { alignItems: "center", justifyContent: "center", minHeight: 44, borderRadius: 12, backgroundColor: "#8C3434" },
  cancelButtonText: { color: "#FFFFFF", fontWeight: "700" },
  disabled: { opacity: 0.55 },
  errorText: { color: "#9E3030", fontSize: 13, lineHeight: 19 },
});
