import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Colors } from "@/constants/theme";
import { formatIsoDate, parseIsoDate } from "@/features/auth/profile";

export type ThemeColors = (typeof Colors)[keyof typeof Colors];

export function FormField({
  label,
  error,
  hint,
  colors,
  ...inputProps
}: {
  label: string;
  error?: string;
  hint?: string;
  colors: ThemeColors;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          { color: colors.text, backgroundColor: colors.backgroundElement },
          inputProps.multiline && styles.multiline,
          !!error && styles.inputError,
        ]}
      />
      {!!hint && !error && <Text style={[styles.hint, { color: colors.textSecondary }]}>{hint}</Text>}
      {!!error && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}
    </View>
  );
}

export function DateField({
  label,
  value,
  onChange,
  error,
  colors,
  defaultDate,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  colors: ThemeColors;
  defaultDate: Date;
}) {
  const [dateParts, setDateParts] = useState(() => datePartsFromIso(value));
  const [editingDate, setEditingDate] = useState(false);

  useEffect(() => {
    if (!editingDate) setDateParts(datePartsFromIso(value));
  }, [value, editingDate]);

  const updateDatePart = (part: keyof DateParts, nextValue: string) => {
    const digits = nextValue.replace(/\D/g, "");
    const maxLength = part === "year" ? 4 : 2;
    const nextParts = {
      ...dateParts,
      [part]: digits.slice(0, maxLength),
    };
    setDateParts(nextParts);
    setEditingDate(true);

    if (nextParts.day && nextParts.month && nextParts.year.length === 4) {
      const isoDate = `${nextParts.year}-${nextParts.month.padStart(2, "0")}-${nextParts.day.padStart(2, "0")}`;
      const date = parseIsoDate(isoDate);
      if (date && date.getTime() <= Date.now()) {
        onChange(isoDate);
        setEditingDate(false);
        return;
      }
    }

    onChange("");
  };

  if (Platform.OS === "web") {
    return (
      <FormField
        label={label}
        value={value}
        onChangeText={onChange}
        error={error}
        colors={colors}
        placeholder="AAAA-MM-DD"
        autoCapitalize="none"
      />
    );
  }

  if (Platform.OS === "ios") {
    return (
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        <View style={styles.datePartsRow}>
          {([
            ["day", "Día", "DD", 2],
            ["month", "Mes", "MM", 2],
            ["year", "Año", "AAAA", 4],
          ] as const).map(([part, partLabel, placeholder, maxLength]) => (
            <View key={part} style={styles.datePartField}>
              <Text style={[styles.datePartLabel, { color: colors.textSecondary }]}>{partLabel}</Text>
              <TextInput
                accessibilityLabel={`${label}, ${partLabel}`}
                keyboardType="number-pad"
                maxLength={maxLength}
                onChangeText={(text) => updateDatePart(part, text)}
                placeholder={placeholder}
                placeholderTextColor={colors.textSecondary}
                style={[
                  styles.input,
                  styles.datePartInput,
                  { color: colors.text, backgroundColor: colors.backgroundElement },
                  !!error && styles.inputError,
                ]}
                value={dateParts[part]}
              />
            </View>
          ))}
        </View>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Ingresa día, mes y año. La fecha no puede ser futura.
        </Text>
        {!!error && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}
      </View>
    );
  }

  const selected = parseIsoDate(value);
  const displayValue = selected
    ? `${String(selected.getDate()).padStart(2, "0")}/${String(selected.getMonth() + 1).padStart(2, "0")}/${selected.getFullYear()}`
    : "";
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${displayValue || "sin seleccionar"}`}
        onPress={() => DateTimePickerAndroid.open({
          value: selected ?? defaultDate,
          mode: "date",
          display: "spinner",
          design: "default",
          maximumDate: new Date(),
          onValueChange: (_event, date) => onChange(formatIsoDate(date)),
        })}
        style={[styles.input, styles.dateButton, { backgroundColor: colors.backgroundElement }, !!error && styles.inputError]}
      >
        <Text style={{ color: value ? colors.text : colors.textSecondary, fontSize: 16 }}>
          {displayValue || "Día / Mes / Año"}
        </Text>
      </Pressable>
      {!!error && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}
    </View>
  );
}

type DateParts = { day: string; month: string; year: string };

function datePartsFromIso(value: string): DateParts {
  const date = parseIsoDate(value);
  if (!date) return { day: "", month: "", year: "" };
  return {
    day: String(date.getDate()),
    month: String(date.getMonth() + 1),
    year: String(date.getFullYear()),
  };
}

export function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
  colors,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | "";
  onChange: (value: T) => void;
  error?: string;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View style={styles.choices}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={[styles.choice, { backgroundColor: selected ? "#164F3D" : colors.backgroundElement }]}
            >
              <Text style={{ color: selected ? "#FFFFFF" : colors.text, fontWeight: "700", fontSize: 14 }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {!!error && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}
    </View>
  );
}

export function SwitchField({
  label,
  description,
  value,
  onChange,
  disabled,
  error,
  colors,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  error?: string;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.switchRow}>
        <View style={styles.switchText}>
          <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
          {!!description && <Text style={[styles.hint, { color: colors.textSecondary }]}>{description}</Text>}
        </View>
        <Switch
          accessibilityLabel={label}
          disabled={disabled}
          value={value}
          onValueChange={onChange}
          trackColor={{ true: "#164F3D" }}
        />
      </View>
      {!!error && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 7 },
  label: { fontSize: 14, fontWeight: "700" },
  input: { minHeight: 50, borderRadius: 14, paddingHorizontal: 15, fontSize: 16 },
  multiline: { minHeight: 96, paddingTop: 13, textAlignVertical: "top" },
  inputError: { borderWidth: 1, borderColor: "#A14537" },
  dateButton: { justifyContent: "center" },
  datePartsRow: { flexDirection: "row", gap: 10 },
  datePartField: { flex: 1, gap: 5 },
  datePartLabel: { fontSize: 12, fontWeight: "600" },
  datePartInput: { minHeight: 50, paddingHorizontal: 10, textAlign: "center" },
  hint: { fontSize: 12, lineHeight: 18 },
  errorText: { color: "#A14537", fontSize: 13, lineHeight: 19 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { minHeight: 44, borderRadius: 14, paddingHorizontal: 14, justifyContent: "center" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  switchText: { flex: 1, gap: 3 },
});
