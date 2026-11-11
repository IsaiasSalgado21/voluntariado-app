import { StyleSheet, Text, View } from "react-native";
import type { ImpactRecord, ImpactTotal } from "./api";

type Props = {
  totals: ImpactTotal[];
  records: ImpactRecord[];
  textColor: string;
  secondaryTextColor: string;
  cardColor: string;
};

const metricColors: Record<string, string> = {
  residuos_recolectados: "#2F8064",
  plantas_sembradas: "#75A85A",
  superficie_restaurada: "#C58B45",
  costa_limpiada: "#4F9FB2",
};

export function ImpactMetricsChart({
  totals,
  records,
  textColor,
  secondaryTextColor,
  cardColor,
}: Props) {
  if (totals.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.heading, { color: textColor }]}>Resultados de la actividad</Text>
      <Text style={[styles.caption, { color: secondaryTextColor }]}>
        Cada gráfica muestra registros de una misma métrica y unidad.
      </Text>
      {totals.map((total) => {
        const series = records
          .filter((record) => record.tipo === total.tipo)
          .slice(0, 6)
          .reverse();
        const maxAmount = Math.max(...series.map((record) => record.cantidad), 0);
        const color = metricColors[total.tipo] ?? "#2F8064";

        return (
          <View key={total.tipo} style={[styles.metricCard, { backgroundColor: cardColor }]}>
            <View style={styles.metricHeading}>
              <Text style={[styles.metricLabel, { color: textColor }]}>{total.etiqueta}</Text>
              <Text style={[styles.metricTotal, { color }]}>
                {formatAmount(total.cantidad)} <Text style={styles.unit}>{total.unidad}</Text>
              </Text>
            </View>
            {series.length > 0 ? (
              <View
                accessibilityLabel={`${total.etiqueta}: ${series.length} registros graficados`}
                style={styles.chart}
              >
                {series.map((record) => {
                  const height = maxAmount > 0 ? Math.max(8, (record.cantidad / maxAmount) * 62) : 8;
                  return (
                    <View key={record.id} style={styles.barColumn}>
                      <Text style={[styles.barValue, { color: secondaryTextColor }]} numberOfLines={1}>
                        {formatAmount(record.cantidad)}
                      </Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.bar, { height, backgroundColor: color }]} />
                      </View>
                      <Text style={[styles.barDate, { color: secondaryTextColor }]}>
                        {formatDate(record.registradoEn)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={[styles.caption, { color: secondaryTextColor }]}>
                Aún no hay registros individuales para graficar.
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "s/f";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "s/f";
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    timeZone: "America/Mazatlan",
  }).format(date);
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  heading: { fontSize: 16, fontWeight: "800" },
  caption: { fontSize: 12, lineHeight: 18 },
  metricCard: { padding: 14, gap: 8, borderRadius: 14, backgroundColor: "#F1F5F1" },
  metricHeading: { gap: 3 },
  metricLabel: { fontSize: 13, fontWeight: "700" },
  metricTotal: { fontSize: 22, fontWeight: "800" },
  unit: { fontSize: 13, fontWeight: "600" },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 7, minHeight: 98, paddingTop: 4 },
  barColumn: { flex: 1, minWidth: 0, alignItems: "center", gap: 4 },
  barValue: { width: "100%", fontSize: 9, textAlign: "center" },
  barTrack: { height: 64, width: "100%", justifyContent: "flex-end", alignItems: "center" },
  bar: { width: "62%", minWidth: 7, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  barDate: { fontSize: 9, textAlign: "center" },
});
