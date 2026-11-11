import NativeDateTimePicker from "@react-native-community/datetimepicker";
import type { DateTimePickerProps } from "./date-time-picker";

export type { DateTimePickerEvent } from "./date-time-picker";

export default function DateTimePicker({ value, mode, onChange }: DateTimePickerProps) {
  return (
    <NativeDateTimePicker
      value={value}
      mode={mode}
      display="default"
      onChange={(event, selectedDate) => onChange({ type: event.type }, selectedDate)}
    />
  );
}
