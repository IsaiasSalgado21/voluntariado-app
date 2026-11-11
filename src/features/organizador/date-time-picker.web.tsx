import { useEffect, useState } from "react";
import { TextInput } from "react-native";
import type { DateTimePickerProps } from "./date-time-picker";

export type { DateTimePickerEvent } from "./date-time-picker";

export default function DateTimePicker({ value, mode, onChange }: DateTimePickerProps) {
  const [text, setText] = useState(formatValue(value, mode));

  useEffect(() => {
    setText(formatValue(value, mode));
  }, [value, mode]);

  const update = (input: string) => {
    setText(input);
    const parsed = parseValue(input, value, mode);
    if (parsed) onChange({ type: "set" }, parsed);
  };

  return (
    <TextInput
      accessibilityLabel={mode === "date" ? "Fecha (AAAA-MM-DD)" : "Hora (HH:mm)"}
      value={text}
      onChangeText={update}
      placeholder={mode === "date" ? "AAAA-MM-DD" : "HH:mm"}
      style={{
        minHeight: 44,
        borderWidth: 1,
        borderColor: "#CAD5CD",
        borderRadius: 12,
        paddingHorizontal: 12,
        color: "#20332B",
        backgroundColor: "#FFFFFF",
      }}
    />
  );
}

function formatValue(value: Date, mode: "date" | "time"): string {
  if (mode === "time") {
    return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
  }
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseValue(input: string, value: Date, mode: "date" | "time"): Date | null {
  const date = new Date(value);
  if (mode === "time") {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(input);
    if (!match) return null;
    date.setHours(Number(match[1]), Number(match[2]), 0, 0);
    return date;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!match) return null;
  date.setFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (date.getFullYear() !== Number(match[1])
    || date.getMonth() !== Number(match[2]) - 1
    || date.getDate() !== Number(match[3])) return null;
  return date;
}
