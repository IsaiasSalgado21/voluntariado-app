import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { fetchSpecies, type SpeciesRecord, type SpeciesType } from "@/features/flora-fauna/api";
import { filterSpecies } from "@/features/flora-fauna/filters";

const TYPES: { label: string; value?: SpeciesType }[] = [
  { label: "Todo" },
  { label: "Flora", value: "flora" },
  { label: "Fauna", value: "fauna" },
];

export default function FloraFaunaScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const scheme = Colors.dark.background === theme.background ? "dark" : "light";
  const colors = Colors[scheme];
  const [records, setRecords] = useState<SpeciesRecord[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<SpeciesType | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchSpecies(controller.signal)
      .then(setRecords)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "No se pudo cargar el catálogo.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [refreshKey]);

  const visibleRecords = useMemo(
    () => filterSpecies(records, search, type),
    [records, search, type],
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
      <Text style={styles.eyebrow}>REGENERA · BIODIVERSIDAD DE BCS</Text>
      <Text style={[styles.title, { color: colors.text }]}>Flora y fauna</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Conoce las especies registradas y sus hábitats.
      </Text>

      <TextInput
        accessibilityLabel="Buscar por especie, nombre científico, descripción o hábitat"
        placeholder="Buscar especies"
        placeholderTextColor={colors.textSecondary}
        value={search}
        onChangeText={setSearch}
        style={[styles.searchInput, { color: colors.text, backgroundColor: colors.backgroundElement }]}
        returnKeyType="search"
      />

      <View style={styles.choices} accessibilityLabel="Filtrar por tipo">
        {TYPES.map((option) => {
          const selected = type === option.value;
          return (
            <Pressable
              key={option.label}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setType(option.value)}
              style={[styles.choice, { backgroundColor: selected ? "#164F3D" : colors.backgroundElement }]}
            >
              <Text style={{ color: selected ? "#FFFFFF" : colors.text, fontWeight: "700" }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.resultsHeading}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Especies</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Actualizar catálogo de flora y fauna"
          onPress={() => setRefreshKey((key) => key + 1)}
        >
          <Text style={styles.refreshText}>Actualizar</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color="#164F3D" />
          <Text style={[styles.helper, { color: colors.textSecondary }]}>Cargando especies…</Text>
        </View>
      ) : error ? (
        <View style={styles.stateBox}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>No pudimos cargar el catálogo</Text>
          <Text style={[styles.helper, { color: colors.textSecondary }]}>{error}</Text>
          <Pressable onPress={() => setRefreshKey((key) => key + 1)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : visibleRecords.length === 0 ? (
        <View style={[styles.stateBox, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>No encontramos especies</Text>
          <Text style={[styles.helper, { color: colors.textSecondary }]}>
            Prueba otro tipo o cambia el texto de búsqueda.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {visibleRecords.map((record) => (
            <Pressable
              key={record.id}
              accessibilityRole="button"
              accessibilityLabel={`Ver detalles de ${record.nombre}`}
              onPress={() => router.push({ pathname: "/flora-fauna/[id]", params: { id: record.id } })}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.86 : 1 },
              ]}
            >
              {record.imagenes[0] ? (
                <Image
                  accessibilityLabel={`Imagen de ${record.nombre}`}
                  source={{ uri: record.imagenes[0] }}
                  style={styles.image}
                />
              ) : (
                <View style={[styles.imagePlaceholder, { backgroundColor: colors.backgroundSelected }]}>
                  <Text style={styles.imagePlaceholderText}>{record.tipo === "flora" ? "🌿" : "🐢"}</Text>
                </View>
              )}
              <View style={styles.cardContent}>
                <Text style={styles.typeBadge}>{record.tipo === "flora" ? "FLORA" : "FAUNA"}</Text>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{record.nombre}</Text>
                {record.nombreCientifico && (
                  <Text style={[styles.scientificName, { color: colors.textSecondary }]}>
                    {record.nombreCientifico}
                  </Text>
                )}
                {record.habitat && (
                  <Text numberOfLines={2} style={[styles.cardDescription, { color: colors.textSecondary }]}>
                    Hábitat: {record.habitat}
                  </Text>
                )}
                {record.estadoConservacion && (
                  <Text style={styles.conservation}>Conservación: {record.estadoConservacion}</Text>
                )}
                <Text style={styles.cardLink}>Conocer especie →</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={[styles.dataNote, { color: colors.textSecondary }]}>
        Se muestran registros publicados. La información sensible de ubicación puede aparecer generalizada.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, gap: 12 },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  title: { fontSize: 28, fontWeight: "800" },
  subtitle: { fontSize: 15, lineHeight: 21, marginBottom: 4 },
  searchInput: { borderRadius: 14, paddingHorizontal: 15, paddingVertical: 13, fontSize: 15 },
  choices: { flexDirection: "row", alignItems: "center", gap: 8 },
  choice: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 18 },
  resultsHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  sectionTitle: { fontSize: 20, fontWeight: "800" },
  refreshText: { color: "#164F3D", fontWeight: "700" },
  list: { gap: 12 },
  card: { borderRadius: 18, overflow: "hidden" },
  image: { width: "100%", height: 180, backgroundColor: "#DCE8DF" },
  imagePlaceholder: { width: "100%", height: 120, justifyContent: "center", alignItems: "center" },
  imagePlaceholderText: { fontSize: 40 },
  cardContent: { padding: 16, gap: 7 },
  typeBadge: { color: "#164F3D", fontSize: 11, fontWeight: "800", letterSpacing: 0.7 },
  cardTitle: { fontSize: 18, fontWeight: "800", lineHeight: 24 },
  scientificName: { fontSize: 14, fontStyle: "italic" },
  cardDescription: { fontSize: 14, lineHeight: 20 },
  conservation: { color: "#286447", fontSize: 13, fontWeight: "700" },
  cardLink: { color: "#164F3D", fontSize: 14, fontWeight: "700", marginTop: 2 },
  helper: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  stateBox: { minHeight: 120, justifyContent: "center", alignItems: "center", borderRadius: 18, padding: 18, gap: 8 },
  primaryButton: { backgroundColor: "#164F3D", borderRadius: 13, minHeight: 44, justifyContent: "center", alignItems: "center", paddingHorizontal: 16 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  dataNote: { fontSize: 12, lineHeight: 17, marginTop: 4, marginBottom: 8 },
});
