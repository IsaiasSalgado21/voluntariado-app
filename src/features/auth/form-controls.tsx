import { useState } from "react";
import { Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Colors } from "@/constants/theme";
import DateTimePicker from "@/features/organizador/date-time-picker";
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
  const [open, setOpen] = useState(false);

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

  const selected = parseIsoDate(value);
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || "sin seleccionar"}`}
        onPress={() => setOpen((current) => !current)}
        style={[styles.input, styles.dateButton, { backgroundColor: colors.backgroundElement }, !!error && styles.inputError]}
      >
        <Text style={{ color: value ? colors.text : colors.textSecondary, fontSize: 16 }}>
          {value || "Selecciona una fecha"}
        </Text>
      </Pressable>
      {open && (
        <DateTimePicker
          value={selected ?? defaultDate}
          mode="date"
          onChange={(event, date) => {
            if (event.type !== "dismissed" && date) onChange(formatIsoDate(date));
            if (event.type === "dismissed" || Platform.OS === "android") setOpen(false);
          }}
        />
      )}
      {!!error && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}
    </View>
  );
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
  hint: { fontSize: 12, lineHeight: 18 },
  errorText: { color: "#A14537", fontSize: 13, lineHeight: 19 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { minHeight: 44, borderRadius: 14, paddingHorizontal: 14, justifyContent: "center" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  switchText: { flex: 1, gap: 3 },
});
