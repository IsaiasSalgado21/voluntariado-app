export type DateTimePickerEvent = {
  type: string;
};

export type DateTimePickerProps = {
  value: Date;
  mode: "date" | "time";
  onChange: (event: DateTimePickerEvent, value?: Date) => void;
};

export default function DateTimePicker(_props: DateTimePickerProps) {
  return null;
}
