import { router } from "expo-router";
import { useEffect, useState } from "react";
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
  fetchImpactLog,
  type ImpactLogData,
  type ImpactLogFilters,
} from "@/features/impacto/bitacora-api";

type ThemeColors = typeof Colors.light | typeof Colors.dark;

const EMPTY_FILTERS: ImpactLogFilters = {};

export default function ImpactLogScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colors = Colors[Colors.dark.background === theme.background ? "dark" : "light"];
  const { status, token, user } = useSession();
  const [data, setData] = useState<ImpactLogData | null>(null);
  const [filters, setFilters] = useState<ImpactLogFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<ImpactLogFilters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void Promise.resolve().then(async () => {
      if (status !== "authenticated" || !token || (user?.rol !== "admin" && user?.rol !== "organizador")) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await fetchImpactLog(token, user.rol, appliedFilters, controller.signal);
        if (active) setData(result);
      } catch (cause) {
        if (active && !controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "No se pudo consultar la bitácora de impacto.");
        }
      } finally {
        if (active && !controller.signal.aborted) setLoading(false);
      }
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [status, token, user?.rol, appliedFilters, refreshKey]);

  const changeFilter = (key: keyof ImpactLogFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value || undefined }));
    setFilterError(null);
  };

  const applyFilters = () => {
    const from = filters.desde;
    const to = filters.hasta;
    if ((from && !isValidDate(from)) || (to && !isValidDate(to))) {
      setFilterError("Usa fechas válidas con el formato AAAA-MM-DD.");
      return;
    }
    if (from && to && from > to) {
      setFilterError("La fecha inicial debe ser anterior o igual a la fecha final.");
      return;
    }
    setFilterError(null);
    setAppliedFilters({ ...filters });
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setFilterError(null);
  };

  const goBack = () => router.canGoBack() ? router.back() : router.replace("/dashboard");
  const authorized = user?.rol === "admin" || user?.rol === "organizador";
  const hasAppliedFilters = Object.values(appliedFilters).some(Boolean);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 28 }]}
    >
      <Pressable accessibilityRole="button" onPress={goBack} style={styles.backButton}>
        <Text style={styles.backText}>‹  Mi panel</Text>
      </Pressable>
      <Text style={styles.eyebrow}>REGENERA · IMPACTO</Text>
      <Text style={[styles.title, { color: colors.text }]}>Bitácora de impacto</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Actividades finalizadas y asistencias confirmadas.
        {user?.rol === "organizador" ? " Solo se incluyen tus voluntariados." : ""}
      </Text>

      {status === "loading" ? (
        <View style={styles.state}><ActivityIndicator size="large" color="#164F3D" /></View>
      ) : status !== "authenticated" || !token ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Inicia sesión para continuar</Text>
          <Pressable onPress={() => router.push("/login")} style={styles.actionButton}>
            <Text style={styles.actionText}>Iniciar sesión</Text>
          </Pressable>
        </View>
      ) : !authorized ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Acceso restringido</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            La bitácora está disponible para organizadores y administradores.
          </Text>
        </View>
      ) : (
        <>
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Filtros</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Periodo</Text>
            <View style={styles.dateFields}>
              <TextInput
                accessibilityLabel="Fecha inicial"
                placeholder="Desde · AAAA-MM-DD"
                placeholderTextColor="#718078"
                value={filters.desde ?? ""}
                onChangeText={(value) => changeFilter("desde", value.trim())}
                style={[styles.input, { color: colors.text, borderColor: "#D5DED7" }]}
                autoCapitalize="none"
              />
              <TextInput
                accessibilityLabel="Fecha final"
                placeholder="Hasta · AAAA-MM-DD"
                placeholderTextColor="#718078"
                value={filters.hasta ?? ""}
                onChangeText={(value) => changeFilter("hasta", value.trim())}
                style={[styles.input, { color: colors.text, borderColor: "#D5DED7" }]}
                autoCapitalize="none"
              />
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Categoría</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <FilterChip label="Todas" selected={!filters.categoria} onPress={() => changeFilter("categoria", "")} />
              {(data?.opciones.categorias ?? []).map((category) => (
                <FilterChip
                  key={category.id}
                  label={category.nombre}
                  selected={filters.categoria === category.id}
                  onPress={() => changeFilter("categoria", category.id)}
                />
              ))}
            </ScrollView>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Lugar</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <FilterChip label="Todos" selected={!filters.lugarId} onPress={() => changeFilter("lugarId", "")} />
              {(data?.opciones.lugares ?? []).map((place) => (
                <FilterChip
                  key={place.id}
                  label={`${place.nombre}${place.municipio ? ` · ${place.municipio}` : ""}`}
                  selected={filters.lugarId === place.id}
                  onPress={() => changeFilter("lugarId", place.id)}
                />
              ))}
            </ScrollView>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Estado</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <FilterChip label="Todos" selected={!filters.estado} onPress={() => changeFilter("estado", "")} />
              {(data?.opciones.estados ?? []).map((state) => (
                <FilterChip
                  key={state}
                  label={state}
                  selected={filters.estado === state}
                  onPress={() => changeFilter("estado", state)}
                />
              ))}
            </ScrollView>
            {filterError && <Text accessibilityRole="alert" style={styles.error}>{filterError}</Text>}
            <View style={styles.filterActions}>
              <Pressable accessibilityRole="button" onPress={applyFilters} style={styles.actionButton}>
                <Text style={styles.actionText}>Aplicar filtros</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={clearFilters} style={styles.clearButton}>
                <Text style={styles.clearText}>Limpiar</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.reportHeading}>
            <View style={styles.headingCopy}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Resultados</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>{periodLabel(appliedFilters)}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => setRefreshKey((key) => key + 1)} style={styles.clearButton}>
              <Text style={styles.clearText}>Actualizar</Text>
            </Pressable>
          </View>

          {loading && <View style={styles.state}><ActivityIndicator size="large" color="#164F3D" /><Text style={[styles.body, { color: colors.textSecondary }]}>Cargando resultados…</Text></View>}
          {error && (
            <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
              {!data && <Pressable onPress={() => setRefreshKey((key) => key + 1)} style={styles.actionButton}><Text style={styles.actionText}>Reintentar</Text></Pressable>}
            </View>
          )}
          {data && !loading && (
            <>
              {data.historial.length === 0 ? (
                <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {hasAppliedFilters ? "No hay actividades para estos filtros" : "Aún no hay actividades finalizadas"}
                  </Text>
                  <Text style={[styles.body, { color: colors.textSecondary }]}>
                    Los resultados se calculan con actividades finalizadas y asistencias confirmadas.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.kpiGrid}>
                    <Metric label="Voluntariados" value={data.kpis.voluntariados} colors={colors} />
                    <Metric label="Participantes únicos" value={data.kpis.participantes} colors={colors} />
                    <Metric label="Horas-persona" value={data.kpis.horas} unit="h" colors={colors} />
                    <Metric label="Residuos recolectados" value={data.kpis.kilogramosResiduos} unit="kg" colors={colors} />
                    <Metric label="Costa limpiada" value={data.kpis.kilometrosCosta} unit="km" colors={colors} />
                    <Metric label="Plantas reforestadas" value={data.kpis.plantasReforestadas} colors={colors} />
                    <Metric label="Superficie recuperada" value={data.kpis.superficieRecuperada} unit="m²" colors={colors} />
                    <Metric label="Ubicaciones" value={data.kpis.ubicaciones} colors={colors} />
                  </View>
                  <SimpleBars
                    title="Voluntariados por mes"
                    rows={data.evolucion.map((row) => ({ label: row.periodo, value: row.voluntariados }))}
                    colors={colors}
                  />
                  <SimpleBars
                    title="Asistencias confirmadas por mes"
                    rows={data.evolucion.map((row) => ({ label: row.periodo, value: row.participaciones }))}
                    colors={colors}
                  />
                  <SimpleBars
                    title="Voluntariados por categoría"
                    rows={data.categorias.map((row) => ({ label: row.categoria, value: row.voluntariados }))}
                    colors={colors}
                  />
                  <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Actividades incluidas</Text>
                    <Text style={[styles.body, { color: colors.textSecondary }]}>
                      {data.historial.length} {data.historial.length === 1 ? "actividad" : "actividades"}
                    </Text>
                    <View style={styles.historyList}>
                      {data.historial.map((item) => (
                        <View key={item.id} style={styles.historyItem}>
                          <Text style={[styles.historyTitle, { color: colors.text }]}>{item.titulo}</Text>
                          <Text style={[styles.body, { color: colors.textSecondary }]}>
                            {formatLocalDate(item.fechaInicio)} · {item.categoria} · {item.estado}
                          </Text>
                          <Text style={[styles.body, { color: colors.textSecondary }]}>{item.lugar}</Text>
                          <Text style={styles.historyNumbers}>
                            {formatAmount(item.participantes)} asistencias · {formatAmount(item.horas)} horas-persona
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </>
              )}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function Metric({
  label,
  value,
  unit,
  colors,
}: {
  label: string;
  value: number;
  unit?: string;
  colors: ThemeColors;
}) {
  return (
    <View style={[styles.metricCard, { backgroundColor: colors.backgroundElement }]}>
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: colors.text }]}>
        {formatAmount(value)}{unit ? <Text style={styles.metricUnit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

function SimpleBars({
  title,
  rows,
  colors,
}: {
  title: string;
  rows: Array<{ label: string; value: number }>;
  colors: ThemeColors;
}) {
  if (!rows.length) return null;
  const maximum = Math.max(1, ...rows.map((row) => row.value));
  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.chartHint, { color: colors.textSecondary }]}>
        Barras a escala dentro de esta serie; se muestran los valores exactos.
      </Text>
      <View style={styles.barList}>
        {rows.map((row) => (
          <View key={row.label} style={styles.barRow}>
            <Text numberOfLines={1} style={[styles.barLabel, { color: colors.text }]}>{row.label}</Text>
            <View
              accessibilityLabel={`${row.label}: ${formatAmount(row.value)}`}
              style={[styles.barTrack, { backgroundColor: colors.background }]}
            >
              <View style={[styles.barFill, { width: `${Math.max(row.value > 0 ? 3 : 0, (row.value / maximum) * 100)}%` }]} />
            </View>
            <Text style={[styles.barValue, { color: colors.text }]}>{formatAmount(row.value)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

function periodLabel(filters: ImpactLogFilters): string {
  if (filters.desde && filters.hasta) return `Del ${filters.desde} al ${filters.hasta}`;
  if (filters.desde) return `Desde ${filters.desde}`;
  if (filters.hasta) return `Hasta ${filters.hasta}`;
  return "Todos los periodos";
}

function formatLocalDate(value: string | null): string {
  if (!value) return "Sin fecha";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime())
    ? "Fecha no disponible"
    : new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(value);
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, gap: 13 },
  backButton: { paddingVertical: 8 },
  backText: { color: "#164F3D", fontSize: 15, fontWeight: "700" },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  title: { fontSize: 27, fontWeight: "800" },
  subtitle: { fontSize: 14, lineHeight: 21 },
  state: { alignItems: "center", gap: 12, paddingVertical: 28 },
  card: { padding: 16, borderRadius: 17, gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  body: { fontSize: 13, lineHeight: 19 },
  label: { fontSize: 12, fontWeight: "700", marginTop: 4 },
  dateFields: { flexDirection: "row", gap: 8 },
  input: { flex: 1, minWidth: 0, minHeight: 44, borderWidth: 1, borderRadius: 11, paddingHorizontal: 10, fontSize: 12 },
  chips: { gap: 7, paddingVertical: 2 },
  chip: { paddingHorizontal: 12, minHeight: 36, justifyContent: "center", borderRadius: 18, borderWidth: 1, borderColor: "#D5DED7", backgroundColor: "#FFFFFF" },
  chipSelected: { borderColor: "#164F3D", backgroundColor: "#E8F1EA" },
  chipText: { color: "#35463D", fontSize: 12, fontWeight: "600" },
  chipTextSelected: { color: "#164F3D", fontWeight: "800" },
  error: { color: "#9E3030", fontSize: 13, lineHeight: 19 },
  filterActions: { flexDirection: "row", alignItems: "center", gap: 15, marginTop: 4 },
  actionButton: { minHeight: 43, alignItems: "center", justifyContent: "center", paddingHorizontal: 15, borderRadius: 12, backgroundColor: "#164F3D" },
  actionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  clearButton: { minHeight: 40, justifyContent: "center", paddingHorizontal: 7 },
  clearText: { color: "#164F3D", fontSize: 13, fontWeight: "700" },
  reportHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 5 },
  headingCopy: { flex: 1, gap: 3 },
  sectionTitle: { fontSize: 20, fontWeight: "800" },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  metricCard: { width: "48%", flexGrow: 1, flexBasis: 140, minHeight: 91, padding: 13, borderRadius: 15, gap: 6 },
  metricLabel: { fontSize: 11, fontWeight: "600" },
  metricValue: { fontSize: 20, fontWeight: "800" },
  metricUnit: { fontSize: 13, fontWeight: "700" },
  chartHint: { fontSize: 11, lineHeight: 16 },
  barList: { gap: 9, marginTop: 3 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { width: 82, fontSize: 11 },
  barTrack: { height: 12, flex: 1, overflow: "hidden", borderRadius: 6 },
  barFill: { height: "100%", borderRadius: 6, backgroundColor: "#28775A" },
  barValue: { width: 42, textAlign: "right", fontSize: 11, fontWeight: "700" },
  historyList: { gap: 0 },
  historyItem: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#E3E9E4", gap: 4 },
  historyTitle: { fontSize: 14, fontWeight: "800" },
  historyNumbers: { color: "#164F3D", fontSize: 12, fontWeight: "700" },
});
