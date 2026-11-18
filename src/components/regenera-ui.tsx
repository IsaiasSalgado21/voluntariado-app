import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View, type ViewProps } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { RegeneraColors } from "@/constants/theme";

export function AppNavigationBar({
  backLabel,
  onBack,
}: {
  backLabel: string;
  onBack: () => void;
}) {
  const colors = useTheme();
  return (
    <View style={styles.navigationBar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Volver a ${backLabel}`}
        hitSlop={8}
        onPress={onBack}
        style={styles.navigationBack}
      >
        <View style={[styles.navigationArrowBox, { backgroundColor: colors.backgroundSelected }]}>
          <Text style={[styles.navigationArrow, { color: colors.text }]}>←</Text>
        </View>
        <Text style={[styles.navigationLabel, { color: colors.text }]}>{backLabel}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ir al inicio"
        hitSlop={8}
        onPress={() => router.push("/")}
        style={styles.homeButton}
      >
        <Text style={styles.homeButtonText}>Inicio</Text>
      </Pressable>
    </View>
  );
}

export function RegeneraPageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  const colors = useTheme();
  return (
    <View style={styles.pageHeader}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={[styles.pageTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
    </View>
  );
}

export function RegeneraSectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  const colors = useTheme();
  return (
    <View style={styles.sectionHeading}>
      {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
    </View>
  );
}

export function RegeneraCard({ style, ...props }: ViewProps) {
  const colors = useTheme();
  return (
    <View
      {...props}
      style={[
        styles.card,
        { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  navigationBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44, gap: 12 },
  navigationBack: { flexDirection: "row", alignItems: "center", gap: 9, minHeight: 44, flexShrink: 1 },
  navigationArrowBox: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  navigationArrow: { fontSize: 22, lineHeight: 25, fontWeight: "700" },
  navigationLabel: { fontSize: 14, fontWeight: "700" },
  homeButton: { minHeight: 40, justifyContent: "center", paddingHorizontal: 13, borderRadius: 12, backgroundColor: RegeneraColors.softGreen },
  homeButtonText: { color: RegeneraColors.primary, fontSize: 14, fontWeight: "800" },
  pageHeader: { gap: 7 },
  sectionHeading: { gap: 5 },
  eyebrow: { color: RegeneraColors.accent, fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  pageTitle: { fontSize: 28, fontWeight: "800", lineHeight: 34 },
  sectionTitle: { fontSize: 18, fontWeight: "800", lineHeight: 25 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 18, padding: 18, gap: 13 },
});
