import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { fetchGlobalImpact, type ImpactTotal } from "@/features/impacto/api";

export default function ImpactSummaryScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colors = Colors[Colors.dark.background === theme.background ? "dark" : "light"];
  const [totals, setTotals] = useState<ImpactTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetchGlobalImpact(controller.signal)
      .then(setTotals)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "No se pudo cargar el impacto acumulado.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 28 }]}
    >
      <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/voluntariados")} style={styles.back}>
        <Text style={styles.backText}>‹  Voluntariados</Text>
      </Pressable>
      <Text style={styles.eyebrow}>REGENERA · IMPACTO</Text>
      <Text style={[styles.title, { color: colors.text }]}>Impacto acumulado</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        Resultados reportados en las actividades de la comunidad.
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#164F3D" />
      ) : error ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
        </View>
      ) : totals.length === 0 ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Aún no se han registrado impactos. Cuando las actividades concluyan, aquí aparecerán sus resultados.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {totals.map((total) => (
            <View key={total.tipo} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <Text style={[styles.metricTitle, { color: colors.text }]}>{total.etiqueta}</Text>
              <Text style={styles.amount}>
                {formatAmount(total.cantidad)} <Text style={styles.unit}>{total.unidad}</Text>
              </Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>
                {total.actividades === undefined
                  ? `${total.registros} ${total.registros === 1 ? "registro" : "registros"}`
                  : `${total.actividades} ${total.actividades === 1 ? "actividad" : "actividades"} · ${total.registros} ${total.registros === 1 ? "registro" : "registros"}`}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(value);
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 14 },
  back: { paddingVertical: 8 },
  backText: { color: "#164F3D", fontSize: 15, fontWeight: "700" },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  title: { fontSize: 27, fontWeight: "800" },
  description: { fontSize: 15, lineHeight: 22 },
  list: { gap: 12, marginTop: 6 },
  card: { padding: 18, borderRadius: 18, gap: 8 },
  metricTitle: { fontSize: 16, fontWeight: "700" },
  amount: { color: "#164F3D", fontSize: 27, fontWeight: "800" },
  unit: { fontSize: 15, fontWeight: "600" },
  meta: { fontSize: 12 },
  error: { color: "#9E3030", fontSize: 14, lineHeight: 20 },
});
