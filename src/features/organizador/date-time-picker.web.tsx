import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { DateTimePickerProps } from "./date-time-picker";

export type { DateTimePickerEvent } from "./date-time-picker";

export default function DateTimePicker({ value, mode, onChange }: DateTimePickerProps) {
  const [displayMonth, setDisplayMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const daysInMonth = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0).getDate();
  const firstDay = displayMonth.getDay();
  const monthLabel = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(displayMonth);

  const updateDate = (day: number) => {
    const next = new Date(value);
    next.setFullYear(displayMonth.getFullYear(), displayMonth.getMonth(), day);
    next.setDate(day);
    onChange({ type: "set" }, next);
  };

  const changeMonth = (amount: number) => {
    setDisplayMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  const changeTime = (unit: "hour" | "minute", amount: number) => {
    const next = new Date(value);
    if (unit === "hour") next.setHours((next.getHours() + amount + 24) % 24);
    else next.setMinutes(next.getMinutes() + amount);
    onChange({ type: "set" }, next);
  };

  return (
    <View style={styles.container}>
      {mode === "date" ? (
        <>
          <View style={styles.header}>
            <PickerButton label="Mes anterior" text="‹" onPress={() => changeMonth(-1)} />
            <Text accessibilityLiveRegion="polite" style={styles.month}>{monthLabel}</Text>
            <PickerButton label="Mes siguiente" text="›" onPress={() => changeMonth(1)} />
          </View>
          <View style={styles.calendar}>
            {["D", "L", "M", "M", "J", "V", "S"].map((day, index) => (
              <Text key={`weekday-${index}`} style={styles.weekday}>{day}</Text>
            ))}
            {Array.from({ length: firstDay }, (_, index) => (
              <View key={`empty-${index}`} style={styles.dayCell} />
            ))}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1;
              const selected = day === value.getDate()
                && displayMonth.getMonth() === value.getMonth()
                && displayMonth.getFullYear() === value.getFullYear();
              return (
                <Pressable
                  key={day}
                  accessibilityRole="button"
                  accessibilityLabel={`${day} de ${monthLabel}`}
                  accessibilityState={{ selected }}
                  onPress={() => updateDate(day)}
                  style={[styles.dayCell, selected && styles.selectedDay]}
                >
                  <Text style={[styles.dayText, selected && styles.selectedDayText]}>{day}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : (
        <>
          <Text style={styles.month}>Selecciona la hora</Text>
          <View style={styles.timeRow}>
            <TimeControl
              label="Hora"
              value={String(value.getHours()).padStart(2, "0")}
              onDecrease={() => changeTime("hour", -1)}
              onIncrease={() => changeTime("hour", 1)}
            />
            <Text style={styles.timeSeparator}>:</Text>
            <TimeControl
              label="Minutos"
              value={String(value.getMinutes()).padStart(2, "0")}
              onDecrease={() => changeTime("minute", -5)}
              onIncrease={() => changeTime("minute", 5)}
            />
          </View>
          <Text style={styles.hint}>Ajusta en intervalos de 5 minutos.</Text>
        </>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => onChange({ type: "dismissed" })}
        style={styles.doneButton}
      >
        <Text style={styles.doneText}>Listo</Text>
      </Pressable>
    </View>
  );
}

function PickerButton({ label, text, onPress }: { label: string; text: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.navButton}>
      <Text style={styles.navText}>{text}</Text>
    </Pressable>
  );
}

function TimeControl({
  label,
  value,
  onDecrease,
  onIncrease,
}: {
  label: string;
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <View style={styles.timeControl}>
      <Text style={styles.weekday}>{label}</Text>
      <View style={styles.timeButtons}>
        <PickerButton label={`Disminuir ${label.toLocaleLowerCase()}`} text="−" onPress={onDecrease} />
        <Text style={styles.timeValue}>{value}</Text>
        <PickerButton label={`Aumentar ${label.toLocaleLowerCase()}`} text="+" onPress={onIncrease} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "stretch",
    borderWidth: 1,
    borderColor: "#CAD5CD",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#FFFFFF",
    gap: 12,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  month: { color: "#20332B", fontSize: 15, fontWeight: "700", textTransform: "capitalize" },
  navButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#EDF3EE",
  },
  navText: { color: "#164F3D", fontSize: 22, fontWeight: "700" },
  calendar: { flexDirection: "row", flexWrap: "wrap" },
  weekday: { width: "14.2857%", color: "#68776E", fontSize: 12, fontWeight: "700", textAlign: "center", paddingVertical: 8 },
  dayCell: { width: "14.2857%", height: 38, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  dayText: { color: "#20332B", fontSize: 14 },
  selectedDay: { backgroundColor: "#164F3D" },
  selectedDayText: { color: "#FFFFFF", fontWeight: "700" },
  timeRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  timeControl: { alignItems: "center", gap: 5 },
  timeButtons: { flexDirection: "row", alignItems: "center", gap: 7 },
  timeValue: { minWidth: 34, color: "#20332B", fontSize: 22, fontWeight: "700", textAlign: "center" },
  timeSeparator: { color: "#20332B", fontSize: 22, fontWeight: "700", paddingTop: 16 },
  hint: { color: "#68776E", fontSize: 12, textAlign: "center" },
  doneButton: { alignSelf: "flex-end", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: "#164F3D" },
  doneText: { color: "#FFFFFF", fontWeight: "700" },
});
