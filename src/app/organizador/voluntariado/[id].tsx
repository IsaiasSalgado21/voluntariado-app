import QRCode from "react-native-qrcode-svg";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import {
  fetchVolunteerDashboard,
  type VolunteerDashboard,
} from "@/features/organizador/api";
import {
  registerManualAttendance,
  updateAttendanceCode,
} from "@/features/asistencia/api";
import {
  createVolunteerImpact,
  fetchVolunteerImpact,
  type VolunteerImpactSummary,
} from "@/features/impacto/api";
import { ImpactMetricsChart } from "@/features/impacto/impact-metrics-chart";
import { hasVolunteerEnded } from "@/features/impacto/schedule";

type Palette = typeof Colors.light | typeof Colors.dark;

export default function ManagedVolunteerDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const volunteerId = (Array.isArray(id) ? id[0] : id) ?? "";
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colors = Colors[Colors.dark.background === theme.background ? "dark" : "light"];
  const { token, status, user } = useSession();
  const [dashboard, setDashboard] = useState<VolunteerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workingUserId, setWorkingUserId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [impact, setImpact] = useState<VolunteerImpactSummary | null>(null);
  const [impactError, setImpactError] = useState<string | null>(null);
  const [impactMessage, setImpactMessage] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState("");
  const [impactAmount, setImpactAmount] = useState("");
  const [impactNote, setImpactNote] = useState("");
  const [impactWorking, setImpactWorking] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setImpactError(null);
    void fetchVolunteerImpact(volunteerId, controller.signal)
      .then((result) => {
        if (active) {
          setImpact(result);
          setImpactError(null);
          setSelectedMetric((current) => result.catalogo.some((metric) => metric.tipo === current)
            ? current
            : result.catalogo[0]?.tipo ?? "");
        }
      })
      .catch((cause: unknown) => {
        if (active && !controller.signal.aborted) {
          setImpactError(cause instanceof Error ? cause.message : "No se pudo cargar el impacto.");
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [volunteerId, refreshKey]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (!token || status !== "authenticated") {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await fetchVolunteerDashboard(token, volunteerId, controller.signal);
        if (active) setDashboard(result);
      } catch (cause) {
        if (active && !controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "No se pudo cargar el panel del voluntariado.");
        }
      } finally {
        if (active && !controller.signal.aborted) setLoading(false);
      }
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [token, status, volunteerId, refreshKey]);

  const qrUrl = useMemo(() => {
    const tokenValue = dashboard?.volunteer.tokenAsistencia;
    const base = process.env.EXPO_PUBLIC_REGENERA_API_URL?.trim().replace(/\/+$/, "");
    if (!tokenValue || !base) return null;
    return `${base}/asistencia#${encodeURIComponent(tokenValue)}`;
  }, [dashboard?.volunteer.tokenAsistencia]);

  const changeQrState = async () => {
    if (!token || !dashboard) return;
    setError(null);
    try {
      await updateAttendanceCode(
        token,
        volunteerId,
        !dashboard.volunteer.codigoAsistenciaActivo,
      );
      setRefreshKey((key) => key + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cambiar el estado del QR.");
    }
  };

  const markAttendance = async (participantId: string) => {
    if (!token) return;
    setWorkingUserId(participantId);
    setError(null);
    try {
      await registerManualAttendance(token, participantId, volunteerId);
      setRefreshKey((key) => key + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo registrar la asistencia.");
    } finally {
      setWorkingUserId(null);
    }
  };

  const registerImpact = async () => {
    if (!token || !selectedMetric) return;
    const normalizedAmount = impactAmount.trim().replace(",", ".");
    if (!/^\d+(?:\.\d{1,2})?$/.test(normalizedAmount)) {
      setImpactError("Ingresa una cantidad positiva con máximo dos decimales.");
      return;
    }
    const amount = Number(normalizedAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setImpactError("Ingresa una cantidad mayor que cero.");
      return;
    }

    setImpactWorking(true);
    setImpactError(null);
    setImpactMessage(null);
    try {
      await createVolunteerImpact(token, volunteerId, {
        tipo: selectedMetric,
        cantidad: amount,
        ...(impactNote.trim() ? { nota: impactNote.trim() } : {}),
      });
      setImpactAmount("");
      setImpactNote("");
      setImpactMessage("Impacto registrado correctamente.");
      setRefreshKey((key) => key + 1);
    } catch (cause) {
      setImpactError(cause instanceof Error ? cause.message : "No se pudo registrar el impacto.");
    } finally {
      setImpactWorking(false);
    }
  };

  const canRecordImpact = user?.rol === "organizador" || user?.rol === "admin";
  const activityHasEnded = hasVolunteerEnded(
    dashboard?.volunteer.fechaFin,
    dashboard?.volunteer.horaFin,
  );
  const activityCanRecordImpact = activityHasEnded
    && ["publicado", "finalizado"].includes(dashboard?.volunteer.estado ?? "");

  const goBack = () => router.canGoBack() ? router.back() : router.replace("/organizador/voluntariados");

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 30 },
      ]}
    >
      <Pressable onPress={goBack} style={styles.backButton}>
        <Text style={styles.backText}>‹  Voluntariados</Text>
      </Pressable>
      <Text style={styles.eyebrow}>REGENERA · SEGUIMIENTO</Text>

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator size="large" color="#164F3D" />
          <Text style={[styles.muted, { color: colors.textSecondary }]}>Cargando métricas y participantes…</Text>
        </View>
      ) : !dashboard ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.title, { color: colors.text }]}>No pudimos abrir esta actividad</Text>
          <Text style={[styles.muted, { color: colors.textSecondary }]}>
            {error ?? "No tienes permiso para consultar este voluntariado."}
          </Text>
          <Pressable onPress={() => setRefreshKey((key) => key + 1)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={[styles.hero, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.title, { color: colors.text }]}>{dashboard.volunteer.titulo}</Text>
            <Text style={[styles.muted, { color: colors.textSecondary }]}>
              {dashboard.volunteer.estado} · {dashboard.volunteer.lugar?.nombre ?? "Lugar no disponible"}
            </Text>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Resumen</Text>
          <View style={styles.stats}>
            <Stat label="Participantes" value={dashboard.statistics.inscritos} colors={colors} />
            <Stat label="Lugares disponibles" value={dashboard.statistics.disponibles} colors={colors} />
            <Stat label="Asistencias" value={dashboard.statistics.asistencias} colors={colors} />
            <Stat label="Porcentaje" value={`${dashboard.statistics.porcentajeAsistencia}%`} colors={colors} />
          </View>

          {(user?.rol === "organizador" || user?.rol === "admin") && (
            <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Asistencia por QR</Text>
              <Text style={[styles.muted, { color: colors.textSecondary }]}>
                Estado: {dashboard.volunteer.codigoAsistenciaActivo ? "Activo" : "Desactivado"}
              </Text>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                El QR lleva a la validación de Regenera. La API solo acepta registros durante el horario de la actividad.
              </Text>
              {qrUrl ? (
                <View style={styles.qrContainer}>
                  <QRCode value={qrUrl} size={190} />
                </View>
              ) : (
                <Text style={[styles.muted, { color: colors.textSecondary }]}>
                  El QR no está disponible hasta que la API exponga el token y la URL base.
                </Text>
              )}
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                {dashboard.statistics.registrosQr} registros QR confirmados. La API solo acepta asistencia durante el horario publicado.
              </Text>
              <Pressable onPress={() => void changeQrState()} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>
                  {dashboard.volunteer.codigoAsistenciaActivo ? "Desactivar QR" : "Activar QR"}
                </Text>
              </Pressable>
            </View>
          )}

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Impacto de la actividad</Text>
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            {impactError && <Text accessibilityRole="alert" style={styles.error}>{impactError}</Text>}
            {!impact && impactError && (
              <Pressable onPress={() => setRefreshKey((key) => key + 1)} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Reintentar carga del impacto</Text>
              </Pressable>
            )}
            {!impact ? (
              !impactError && <Text style={[styles.muted, { color: colors.textSecondary }]}>Cargando impacto…</Text>
            ) : impact.totales.length === 0 ? (
              <Text style={[styles.muted, { color: colors.textSecondary }]}>Aún no se han registrado resultados para esta actividad.</Text>
            ) : (
              <ImpactMetricsChart
                totals={impact.totales}
                records={impact.registros}
                textColor={colors.text}
                secondaryTextColor={colors.textSecondary}
                cardColor={colors.background}
              />
            )}
            {!!impact?.registros.length && (
              <View style={styles.list}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  Registros recientes ({Math.min(5, impact.registros.length)} de {impact.registros.length})
                </Text>
                {impact.registros.slice(0, 5).map((record) => (
                  <View key={record.id} style={styles.impactRecord}>
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>
                      {record.etiqueta}: {formatAmount(record.cantidad)} {record.unidad}
                      {record.registradoEn ? ` · ${formatImpactDate(record.registradoEn)}` : ""}
                    </Text>
                    {!!record.nota && (
                      <Text style={[styles.hint, { color: colors.textSecondary }]}>{record.nota}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
            {canRecordImpact && (
              activityCanRecordImpact ? (
                <>
                  <Text style={[styles.hint, { color: colors.textSecondary }]}>
                    Registra cada resultado con su unidad correspondiente. Los datos se agregarán al impacto acumulado.
                  </Text>
                  <View style={styles.metricOptions}>
                    {impact?.catalogo.map((metric) => (
                      <Pressable
                        key={metric.tipo}
                        accessibilityRole="button"
                        accessibilityState={{ selected: selectedMetric === metric.tipo }}
                        onPress={() => setSelectedMetric(metric.tipo)}
                        style={[styles.metricOption, selectedMetric === metric.tipo && styles.metricOptionSelected]}
                      >
                        <Text style={[styles.metricOptionText, selectedMetric === metric.tipo && styles.metricOptionTextSelected]}>
                          {metric.etiqueta} ({metric.unidad})
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    accessibilityLabel="Cantidad de impacto"
                    keyboardType="decimal-pad"
                    onChangeText={setImpactAmount}
                    placeholder="Cantidad"
                    placeholderTextColor="#718078"
                    style={styles.impactInput}
                    value={impactAmount}
                  />
                  <TextInput
                    accessibilityLabel="Nota del impacto (opcional)"
                    maxLength={500}
                    multiline
                    onChangeText={setImpactNote}
                    placeholder="Nota opcional"
                    placeholderTextColor="#718078"
                    style={[styles.impactInput, styles.noteInput]}
                    value={impactNote}
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={impactWorking || !selectedMetric}
                    onPress={() => void registerImpact()}
                    style={[styles.primaryButton, (impactWorking || !selectedMetric) && styles.disabled]}
                  >
                    <Text style={styles.primaryButtonText}>{impactWorking ? "Guardando…" : "Registrar impacto"}</Text>
                  </Pressable>
                </>
              ) : (
                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                  {["publicado", "finalizado"].includes(dashboard.volunteer.estado)
                    ? "El registro estará disponible cuando concluya el horario de la actividad."
                    : "Solo se puede registrar impacto en actividades publicadas o finalizadas."}
                </Text>
              )
            )}
            {impactMessage && <Text style={styles.successText}>{impactMessage}</Text>}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Participantes</Text>
          {dashboard.participants.length === 0 ? (
            <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <Text style={[styles.muted, { color: colors.textSecondary }]}>
                Aún no hay personas inscritas en esta actividad.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {dashboard.participants.map((participant) => {
                const eligible = ["inscrita", "activa"].includes(participant.estadoInscripcion);
                const attended = participant.asistencia?.confirmada === true
                  || participant.estadoInscripcion === "completada";
                return (
                  <View key={participant.id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>
                      {participant.nombre ?? "Participante"}
                    </Text>
                    {!!participant.correo && (
                      <Text style={[styles.hint, { color: colors.textSecondary }]}>{participant.correo}</Text>
                    )}
                    <Text style={[styles.hint, { color: colors.textSecondary }]}>
                      Inscripción: {participant.estadoInscripcion}
                      {participant.asistencia?.metodo ? ` · Asistencia ${participant.asistencia.metodo}` : ""}
                    </Text>
                    {(user?.rol === "organizador" || user?.rol === "admin") && eligible && !attended && (
                      <Pressable
                        disabled={workingUserId === participant.usuarioId}
                        onPress={() => void markAttendance(participant.usuarioId)}
                        style={[styles.secondaryButton, workingUserId === participant.usuarioId && styles.disabled]}
                      >
                        <Text style={styles.secondaryButtonText}>
                          {workingUserId === participant.usuarioId ? "Registrando…" : "Registrar asistencia manual"}
                        </Text>
                      </Pressable>
                    )}
                    {attended && <Text style={styles.successText}>Asistencia confirmada</Text>}
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
      {error && dashboard && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(value);
}

function formatImpactDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "fecha no disponible";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mazatlan",
  }).format(date);
}

function Stat({
  label,
  value,
  colors,
}: {
  label: string;
  value: number | string;
  colors: Palette;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.backgroundElement }]}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, gap: 13 },
  backButton: { paddingVertical: 8 },
  backText: { color: "#164F3D", fontSize: 15, fontWeight: "700" },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  hero: { padding: 18, borderRadius: 18, gap: 8 },
  title: { fontSize: 24, lineHeight: 31, fontWeight: "800" },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginTop: 4 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  statCard: { flexGrow: 1, flexBasis: "45%", minWidth: 130, padding: 14, borderRadius: 15, gap: 4 },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 11 },
  card: { padding: 16, borderRadius: 18, gap: 9 },
  list: { gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  impactRecord: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#B7C7BE", paddingTop: 8, gap: 3 },
  impactAmount: { color: "#164F3D", fontSize: 21, fontWeight: "800" },
  metricOptions: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  metricOption: { borderWidth: 1, borderColor: "#B7C7BE", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 7 },
  metricOptionSelected: { backgroundColor: "#164F3D", borderColor: "#164F3D" },
  metricOptionText: { color: "#34483E", fontSize: 12, fontWeight: "600" },
  metricOptionTextSelected: { color: "#FFFFFF" },
  impactInput: { minHeight: 44, borderWidth: 1, borderColor: "#B7C7BE", borderRadius: 12, paddingHorizontal: 12, color: "#20332B", backgroundColor: "#FFFFFF" },
  noteInput: { minHeight: 72, textAlignVertical: "top", paddingTop: 10 },
  muted: { fontSize: 14, lineHeight: 21 },
  hint: { fontSize: 12, lineHeight: 18 },
  qrContainer: { alignSelf: "center", padding: 14, backgroundColor: "#FFFFFF", borderRadius: 14 },
  primaryButton: { alignItems: "center", justifyContent: "center", minHeight: 46, paddingHorizontal: 16, borderRadius: 13, backgroundColor: "#164F3D" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  secondaryButton: { alignSelf: "flex-start", paddingVertical: 8 },
  secondaryButtonText: { color: "#164F3D", fontSize: 13, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  successText: { color: "#164F3D", fontSize: 13, fontWeight: "700" },
  error: { color: "#9E3030", fontSize: 13, lineHeight: 20 },
  state: { alignItems: "center", gap: 12, paddingVertical: 35 },
});
