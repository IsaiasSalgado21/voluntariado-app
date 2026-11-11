import { router } from "expo-router";
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
import {
  fetchPlaces,
  fetchVoluntariados,
  type PlaceOption,
  type VolunteerMapItem,
} from "@/features/voluntariados/api";
import {
  filterVoluntariados,
  validateDateRange,
  type VolunteerFilters,
} from "@/features/voluntariados/filters";
import { VolunteerPhoto } from "@/features/voluntariados/volunteer-photo";

const CATEGORIES = [
  ["", "Todos"],
  ["limpieza", "Limpieza"],
  ["restauracion", "Restauración"],
  ["conservacion", "Conservación"],
  ["reforestacion", "Reforestación"],
  ["monitoreo", "Monitoreo"],
  ["educacion-ambiental", "Educación ambiental"],
] as const;

export default function VolunteerListScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const scheme = Colors.dark.background === theme.background ? "dark" : "light";
  const colors = Colors[scheme];
  const [items, setItems] = useState<VolunteerMapItem[]>([]);
  const [places, setPlaces] = useState<PlaceOption[]>([]);
  const [filters, setFilters] = useState<VolunteerFilters>({});
  const [draftFilters, setDraftFilters] = useState<VolunteerFilters>({});
  const [search, setSearch] = useState("");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setFilterError(null);

    fetchVoluntariados(filters, controller.signal)
      .then(setItems)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "No se pudieron cargar los voluntariados.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [filters, refreshKey]);

  useEffect(() => {
    const controller = new AbortController();
    fetchPlaces(controller.signal)
      .then(setPlaces)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setPlacesError(cause instanceof Error ? cause.message : "No se pudieron cargar los lugares.");
        }
      });
    return () => controller.abort();
  }, []);

  const filteredItems = useMemo(
    () => filterVoluntariados(items, search),
    [items, search],
  );
  const activeFilterLabels = [
    filters.categoria
      ? CATEGORIES.find(([value]) => value === filters.categoria)?.[1] ?? filters.categoria
      : null,
    filters.lugar_id
      ? places.find((place) => place.id === filters.lugar_id)?.nombre ?? "Lugar"
      : null,
    filters.fecha_desde || filters.fecha_hasta
      ? [filters.fecha_desde, filters.fecha_hasta].filter(Boolean).join(" – ")
      : null,
    filters.disponibles === undefined
      ? null
      : filters.disponibles
        ? "Con lugares"
        : "Cupo lleno",
  ].filter((label): label is string => label !== null);

  const updateDraft = <K extends keyof VolunteerFilters>(
    key: K,
    value: VolunteerFilters[K],
  ) => setDraftFilters((current) => ({ ...current, [key]: value }));

  const applyFilters = () => {
    const validationError = validateDateRange(draftFilters.fecha_desde, draftFilters.fecha_hasta);
    if (validationError) {
      setFilterError(validationError);
      return;
    }

    setFilterError(null);
    setFilters({ ...draftFilters });
    setFiltersExpanded(false);
  };

  const clearFilters = () => {
    setDraftFilters({});
    setFilters({});
    setSearch("");
    setFilterError(null);
    setFiltersExpanded(false);
  };

  const renderChoice = (key: string, label: string, selected: boolean, onPress: () => void) => (
    <Pressable
      key={key}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.choice,
        { backgroundColor: selected ? "#164F3D" : colors.backgroundElement },
      ]}
    >
      <Text style={{ color: selected ? "#FFFFFF" : colors.text, fontWeight: "600" }}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.eyebrow}>REGENERA · BAJA CALIFORNIA SUR</Text>
      <Text style={[styles.title, { color: colors.text }]}>Voluntariados</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Encuentra una actividad ambiental y conoce cómo participar.
      </Text>

      <TextInput
        accessibilityLabel="Buscar por título, descripción, categoría o lugar"
        placeholder="Buscar actividades"
        placeholderTextColor={colors.textSecondary}
        value={search}
        onChangeText={setSearch}
        style={[styles.searchInput, { color: colors.text, backgroundColor: colors.backgroundElement }]}
        returnKeyType="search"
      />

      <View style={[styles.filterSection, { backgroundColor: colors.backgroundElement }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: filtersExpanded }}
          onPress={() => setFiltersExpanded((expanded) => !expanded)}
          style={styles.filterHeader}
        >
          <View style={styles.filterHeading}>
            <Text style={[styles.filterTitle, { color: colors.text }]}>
              Filtros{activeFilterLabels.length > 0 ? ` · ${activeFilterLabels.length}` : ""}
            </Text>
            <Text numberOfLines={1} style={[styles.filterSummary, { color: colors.textSecondary }]}>
              {activeFilterLabels.length > 0 ? activeFilterLabels.join(" · ") : "Categoría, lugar, fecha y cupo"}
            </Text>
          </View>
          <Text style={styles.filterToggle}>{filtersExpanded ? "Ocultar ▲" : "Mostrar ▼"}</Text>
        </Pressable>

        {filtersExpanded && (
          <View style={styles.filterPanel}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Categoría</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}>
              {CATEGORIES.map(([value, label]) =>
                renderChoice(`category-${value || "all"}`, label, (draftFilters.categoria ?? "") === value, () =>
                  updateDraft("categoria", value || undefined),
                ),
              )}
            </ScrollView>

            <Text style={[styles.sectionLabel, { color: colors.text }]}>Lugar</Text>
            {placesError ? (
              <Text style={styles.inlineError}>{placesError}</Text>
            ) : places.length === 0 ? (
              <Text style={[styles.helper, { color: colors.textSecondary }]}>Cargando lugares…</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choices}>
                {renderChoice("place-all", "Todos", !draftFilters.lugar_id, () => updateDraft("lugar_id", undefined))}
                {places.map((place) =>
                  renderChoice(`place-${place.id}`, place.nombre, draftFilters.lugar_id === place.id, () =>
                    updateDraft("lugar_id", place.id),
                  ),
                )}
              </ScrollView>
            )}

            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Desde</Text>
                <TextInput
                  accessibilityLabel="Fecha desde, formato año-mes-día"
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  value={draftFilters.fecha_desde ?? ""}
                  onChangeText={(value) => updateDraft("fecha_desde", value || undefined)}
                  style={[styles.dateInput, { color: colors.text, backgroundColor: colors.background }]}
                  maxLength={10}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <View style={styles.dateField}>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Hasta</Text>
                <TextInput
                  accessibilityLabel="Fecha hasta, formato año-mes-día"
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  value={draftFilters.fecha_hasta ?? ""}
                  onChangeText={(value) => updateDraft("fecha_hasta", value || undefined)}
                  style={[styles.dateInput, { color: colors.text, backgroundColor: colors.background }]}
                  maxLength={10}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

            <View style={styles.availabilityRow}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>Cupo</Text>
              <View style={styles.choices}>
                {renderChoice("capacity-all", "Todos", draftFilters.disponibles === undefined, () =>
                  updateDraft("disponibles", undefined),
                )}
                {renderChoice("capacity-open", "Con lugares", draftFilters.disponibles === true, () =>
                  updateDraft("disponibles", true),
                )}
                {renderChoice("capacity-full", "Llenos", draftFilters.disponibles === false, () =>
                  updateDraft("disponibles", false),
                )}
              </View>
            </View>

            {filterError && <Text style={styles.inlineError}>{filterError}</Text>}
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" onPress={applyFilters} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Aplicar filtros</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={clearFilters} style={styles.secondaryButton}>
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Limpiar</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <View style={styles.resultsHeading}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Próximas actividades</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Actualizar voluntariados"
          onPress={() => setRefreshKey((key) => key + 1)}
        >
          <Text style={styles.refreshText}>Actualizar</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color="#164F3D" />
          <Text style={[styles.helper, { color: colors.textSecondary }]}>Cargando voluntariados…</Text>
        </View>
      ) : error ? (
        <View style={styles.stateBox}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>No pudimos cargar las actividades</Text>
          <Text style={[styles.helper, { color: colors.textSecondary }]}>{error}</Text>
          <Pressable onPress={() => setRefreshKey((key) => key + 1)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={[styles.stateBox, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>No encontramos actividades</Text>
          <Text style={[styles.helper, { color: colors.textSecondary }]}>
            Prueba otros filtros o cambia el texto de búsqueda.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filteredItems.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`Ver voluntariado ${item.titulo}`}
              onPress={() => router.push({ pathname: "/voluntariados/[id]", params: { id: item.id } })}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.86 : 1 },
              ]}
            >
              <VolunteerPhoto
                uri={item.imagen ?? item.imagenes[0] ?? null}
                title={item.titulo}
                variant="card"
              />
              <View style={styles.cardTopRow}>
                <Text style={styles.categoryBadge}>{item.categoria || "Actividad ambiental"}</Text>
                <Text style={[styles.capacity, { color: item.lleno ? "#A14537" : "#286447" }]}>
                  {item.lleno ? "Cupo lleno" : `${Math.max(0, item.cupo - item.inscripciones_activas)} lugares`}
                </Text>
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.titulo}</Text>
              <Text numberOfLines={3} style={[styles.cardDescription, { color: colors.textSecondary }]}>
                {item.descripcion}
              </Text>
              <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                {formatDate(item.fecha_inicio)}
                {item.lugar_nombre ? `  ·  ${item.lugar_nombre}` : ""}
              </Text>
              <Text style={styles.cardLink}>Ver detalles →</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={[styles.dataNote, { color: colors.textSecondary }]}>
        Se muestran actividades publicadas con ubicación disponible en el mapa.
      </Text>
    </ScrollView>
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

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, gap: 12 },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  title: { fontSize: 28, fontWeight: "800" },
  subtitle: { fontSize: 15, lineHeight: 21, marginBottom: 4 },
  searchInput: { borderRadius: 14, paddingHorizontal: 15, paddingVertical: 13, fontSize: 15 },
  filterSection: { borderRadius: 15, paddingHorizontal: 14, paddingVertical: 11 },
  filterHeader: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 12 },
  filterHeading: { flex: 1, gap: 2 },
  filterTitle: { fontSize: 14, fontWeight: "800" },
  filterSummary: { fontSize: 12 },
  filterToggle: { color: "#164F3D", fontSize: 12, fontWeight: "800" },
  filterPanel: { gap: 10, paddingTop: 10 },
  sectionLabel: { fontSize: 14, fontWeight: "700", marginTop: 4 },
  choices: { flexDirection: "row", alignItems: "center", gap: 8, paddingRight: 8 },
  choice: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18 },
  helper: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  inlineError: { color: "#A14537", fontSize: 13, lineHeight: 19 },
  dateRow: { flexDirection: "row", gap: 10 },
  dateField: { flex: 1 },
  dateInput: { borderRadius: 12, paddingHorizontal: 11, paddingVertical: 11, fontSize: 14 },
  availabilityRow: { gap: 8 },
  actions: { flexDirection: "row", gap: 10, marginTop: 2 },
  primaryButton: { backgroundColor: "#164F3D", borderRadius: 13, minHeight: 44, justifyContent: "center", alignItems: "center", paddingHorizontal: 16 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  secondaryButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 14 },
  secondaryButtonText: { fontSize: 14, fontWeight: "700" },
  resultsHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14 },
  sectionTitle: { fontSize: 20, fontWeight: "800" },
  refreshText: { color: "#164F3D", fontWeight: "700" },
  list: { gap: 12 },
  card: { padding: 12, borderRadius: 18, gap: 9, overflow: "hidden" },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  categoryBadge: { color: "#164F3D", backgroundColor: "#DCE8DF", borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: "700", overflow: "hidden" },
  capacity: { fontSize: 12, fontWeight: "700" },
  cardTitle: { fontSize: 17, fontWeight: "800", lineHeight: 23 },
  cardDescription: { fontSize: 14, lineHeight: 20 },
  cardMeta: { fontSize: 12, lineHeight: 18, fontWeight: "600" },
  cardLink: { color: "#164F3D", fontSize: 14, fontWeight: "700", marginTop: 2 },
  stateBox: { minHeight: 120, justifyContent: "center", alignItems: "center", borderRadius: 18, padding: 18, gap: 8 },
  dataNote: { fontSize: 12, lineHeight: 17, marginTop: 4, marginBottom: 8 },
});
