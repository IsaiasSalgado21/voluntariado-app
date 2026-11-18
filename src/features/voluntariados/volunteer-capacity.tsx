import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { RegeneraCard, RegeneraSectionHeading } from "@/components/regenera-ui";
import { RegeneraColors } from "@/constants/theme";
import { VolunteerSymbol } from "./volunteer-symbol";

type Props = {
  cupo: number;
  inscritos: number | null;
  disponibles: number | null;
  loading?: boolean;
  error?: string | null;
};

export function VolunteerCapacityCard({
  cupo,
  inscritos,
  disponibles,
  loading = false,
  error = null,
}: Props) {
  const colors = useTheme();
  const percentage = cupo > 0 && inscritos !== null
    ? Math.min(100, Math.max(0, inscritos / cupo * 100))
    : 0;

  return (
    <RegeneraCard>
      <RegeneraSectionHeading
        eyebrow="SEGUIMIENTO"
        title="Actividad del voluntariado"
      />
      <View style={styles.capacityHeading}>
        <View style={[styles.iconBox, { backgroundColor: colors.backgroundSelected }]}>
          <VolunteerSymbol name="participantes" size={23} />
        </View>
        <View style={styles.capacityCopy}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Lugares disponibles</Text>
          <Text style={[styles.available, { color: colors.text }]}>
            {loading || disponibles === null ? `Cupo total: ${cupo}` : `${disponibles} espacios disponibles`}
          </Text>
        </View>
      </View>
      <View
        accessibilityLabel={inscritos === null
          ? `Cupo total: ${cupo}`
          : `${inscritos} de ${cupo} lugares ocupados`}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: cupo, now: inscritos ?? 0 }}
        style={[styles.track, { backgroundColor: colors.backgroundSelected }]}
      >
        <View style={[styles.progress, { width: `${percentage}%` }]} />
      </View>
      <View style={styles.stats}>
        <CapacityStat label="Inscritos" value={loading ? "…" : inscritos ?? "—"} colors={colors} />
        <CapacityStat label="Disponibles" value={loading ? "…" : disponibles ?? "—"} colors={colors} />
        <CapacityStat label="Cupo total" value={cupo} colors={colors} />
      </View>
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          No se pudo actualizar la ocupación. La API confirmará el cupo al inscribirte.
        </Text>
      )}
    </RegeneraCard>
  );
}

function CapacityStat({
  label,
  value,
  colors,
}: {
  label: string;
  value: number | string;
  colors: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  capacityHeading: { flexDirection: "row", alignItems: "center", gap: 11 },
  iconBox: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  capacityCopy: { flex: 1, gap: 2 },
  label: { fontSize: 11, lineHeight: 16 },
  available: { fontSize: 15, fontWeight: "800" },
  track: { height: 8, overflow: "hidden", borderRadius: 999 },
  progress: { height: "100%", borderRadius: 999, backgroundColor: RegeneraColors.accent },
  stats: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  stat: { flex: 1, gap: 3 },
  statValue: { fontSize: 16, fontWeight: "800" },
  error: { color: RegeneraColors.error, fontSize: 12, lineHeight: 17 },
});
