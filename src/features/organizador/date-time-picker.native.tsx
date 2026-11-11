import NativeDateTimePicker from "@react-native-community/datetimepicker";
import { Platform, Pressable, Text, View } from "react-native";
import type { DateTimePickerProps } from "./date-time-picker";

export type { DateTimePickerEvent } from "./date-time-picker";

export default function DateTimePicker({ value, mode, onChange }: DateTimePickerProps) {
  return (
    <View>
      <NativeDateTimePicker
        value={value}
        mode={mode}
        display={Platform.OS === "ios" ? "spinner" : "default"}
        onChange={(event, selectedDate) => onChange({ type: event.type }, selectedDate)}
      />
      {Platform.OS === "ios" && (
        <Pressable
          accessibilityRole="button"
          onPress={() => onChange({ type: "dismissed" })}
          style={{ alignSelf: "flex-end", padding: 10 }}
        >
          <Text style={{ color: "#164F3D", fontWeight: "700" }}>Listo</Text>
        </Pressable>
      )}
    </View>
  );
}
