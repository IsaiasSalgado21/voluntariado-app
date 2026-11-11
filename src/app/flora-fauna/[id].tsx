import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { fetchSpecies, type SpeciesRecord } from "@/features/flora-fauna/api";

export default function SpeciesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const speciesId = (Array.isArray(id) ? id[0] : id) ?? "";
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const scheme = Colors.dark.background === theme.background ? "dark" : "light";
  const colors = Colors[scheme];
  const [species, setSpecies] = useState<SpeciesRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchSpecies(controller.signal)
      .then((records) => {
        setSpecies(records.find((record) => record.id === speciesId) ?? null);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "No se pudo cargar la especie.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [speciesId]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/flora-fauna");
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color="#164F3D" size="large" />
        <Text style={[styles.muted, { color: colors.textSecondary }]}>Cargando especie…</Text>
      </View>
    );
  }

  if (error || !species) {
    return (
      <View style={[styles.center, styles.errorState, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {error ? "No pudimos abrir este registro" : "Especie no disponible"}
        </Text>
        <Text style={[styles.muted, { color: colors.textSecondary }]}>
          {error ?? "El registro pudo dejar de estar publicado."}
        </Text>
        <Pressable onPress={goBack} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Volver a flora y fauna</Text>
        </Pressable>
      </View>
    );
  }

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
        accessibilityLabel="Volver al catálogo de flora y fauna"
        onPress={goBack}
        style={styles.backButton}
      >
        <Text style={styles.backText}>‹  Flora y fauna</Text>
      </Pressable>

      {species.imagenes[0] ? (
        <Image
          accessibilityLabel={`Imagen de ${species.nombre}`}
          source={{ uri: species.imagenes[0] }}
          style={styles.heroImage}
        />
      ) : (
        <View style={[styles.heroPlaceholder, { backgroundColor: colors.backgroundSelected }]}>
          <Text style={styles.placeholderIcon}>{species.tipo === "flora" ? "🌿" : "🐢"}</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={[styles.hero, { backgroundColor: colors.backgroundElement }]}>
          <Text style={styles.eyebrow}>REGENERA · {species.tipo === "flora" ? "FLORA" : "FAUNA"}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{species.nombre}</Text>
          {species.nombreCientifico && (
            <Text style={[styles.scientificName, { color: colors.textSecondary }]}>
              {species.nombreCientifico}
            </Text>
          )}
        </View>

        {species.descripcion && (
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Descripción</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{species.descripcion}</Text>
          </View>
        )}

        {(species.habitat || species.estadoConservacion) && (
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Conservación</Text>
            {species.habitat && (
              <Fact
                label="Hábitat"
                value={species.habitat}
                labelColor={colors.textSecondary}
                valueColor={colors.text}
              />
            )}
            {species.estadoConservacion && (
              <Fact
                label="Estado"
                value={formatConservationStatus(species.estadoConservacion)}
                labelColor={colors.textSecondary}
                valueColor={colors.text}
              />
            )}
          </View>
        )}

        {(species.ubicacionNombre || species.zonaAproximada) && (
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Distribución</Text>
            {species.ubicacionNombre && (
              <Fact
                label="Zona"
                value={species.ubicacionNombre}
                labelColor={colors.textSecondary}
                valueColor={colors.text}
              />
            )}
            {species.zonaAproximada && (
              <Text style={[styles.body, { color: colors.textSecondary }]}>
                La ubicación se muestra de forma generalizada para proteger esta especie.
              </Text>
            )}
          </View>
        )}

        {species.fuenteInformacion && (
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Fuente</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{species.fuenteInformacion}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function Fact({
  label,
  value,
  labelColor,
  valueColor,
}: {
  label: string;
  value: string;
  labelColor: string;
  valueColor: string;
}) {
  return (
    <View style={styles.fact}>
      <Text style={[styles.factLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.factValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

function formatConservationStatus(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^./, (first) => first.toLocaleUpperCase("es-MX"));
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 24 },
  errorState: { alignItems: "stretch" },
  backButton: { paddingHorizontal: 20, paddingVertical: 10 },
  backText: { color: "#164F3D", fontSize: 16, fontWeight: "700" },
  heroImage: { width: "100%", height: 250, backgroundColor: "#DCE8DF" },
  heroPlaceholder: { width: "100%", height: 200, justifyContent: "center", alignItems: "center" },
  placeholderIcon: { fontSize: 60 },
  content: { paddingHorizontal: 18, gap: 12 },
  hero: { padding: 18, borderRadius: 18, gap: 8 },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  title: { fontSize: 27, fontWeight: "800", lineHeight: 34 },
  scientificName: { fontSize: 16, fontStyle: "italic" },
  card: { padding: 16, borderRadius: 18, gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  body: { fontSize: 14, lineHeight: 21 },
  fact: { gap: 3 },
  factLabel: { fontSize: 12, fontWeight: "700" },
  factValue: { fontSize: 14, lineHeight: 20 },
  muted: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  primaryButton: { backgroundColor: "#164F3D", borderRadius: 13, minHeight: 44, justifyContent: "center", alignItems: "center", paddingHorizontal: 16 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
