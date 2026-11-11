import DateTimePicker, { type DateTimePickerEvent } from "@/features/organizador/date-time-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useSession } from "@/features/auth/use-session";
import {
  createManagedVolunteer,
  fetchAdminOrganizers,
  fetchManagedVolunteers,
  updateManagedVolunteer,
  type OrganizerOption,
  type VolunteerFormValues,
} from "@/features/organizador/api";
import { formatDateValue, parseDateValue, parseTimeValue } from "@/features/organizador/date";
import { fetchPlaces, type PlaceOption } from "@/features/voluntariados/api";

type DateField = "fechaInicio" | "fechaFin" | "horaInicio" | "horaFin";
type FormState = {
  titulo: string;
  descripcion: string;
  categoria: string;
  lugarId: string;
  fechaInicio: Date;
  fechaFin: Date;
  horaInicio: Date;
  horaFin: Date;
  cupo: string;
  requisitos: string;
  materiales: string;
};

const DEFAULT_FORM: FormState = {
  titulo: "",
  descripcion: "",
  categoria: "",
  lugarId: "",
  fechaInicio: new Date(Date.now() + 86400000),
  fechaFin: new Date(Date.now() + 86400000),
  horaInicio: new Date(new Date().setHours(9, 0, 0, 0)),
  horaFin: new Date(new Date().setHours(12, 0, 0, 0)),
  cupo: "20",
  requisitos: "",
  materiales: "",
};

export default function ManagedVolunteerEditorScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colors = Colors[Colors.dark.background === theme.background ? "dark" : "light"];
  const { id } = useLocalSearchParams<{ id?: string }>();
  const volunteerId = Array.isArray(id) ? id[0] : id;
  const { status, token, user } = useSession();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [places, setPlaces] = useState<PlaceOption[]>([]);
  const [organizers, setOrganizers] = useState<OrganizerOption[]>([]);
  const [organizerId, setOrganizerId] = useState("");
  const [picker, setPicker] = useState<{ field: DateField; mode: "date" | "time" } | null>(null);
  const [loading, setLoading] = useState(Boolean(volunteerId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (status !== "authenticated" || !token) return;
      try {
        const [availablePlaces, ownedActivities] = await Promise.all([
          fetchPlaces(controller.signal),
          fetchManagedVolunteers(token, controller.signal),
        ]);
        if (!active) return;
        setPlaces(availablePlaces);
        if (!volunteerId) {
          setForm((current) => ({ ...current, lugarId: availablePlaces[0]?.id ?? "" }));
        } else {
          const activity = ownedActivities.find((item) => item.id === volunteerId);
          if (!activity) {
            setError("Esta actividad no existe o tu cuenta no tiene permiso para editarla.");
            return;
          }
          setForm({
            titulo: activity.titulo,
            descripcion: activity.descripcion,
            categoria: activity.categoria,
            lugarId: activity.lugarId,
            fechaInicio: parseDateValue(activity.fechaInicio, DEFAULT_FORM.fechaInicio),
            fechaFin: parseDateValue(activity.fechaFin, DEFAULT_FORM.fechaFin),
            horaInicio: parseTimeValue(activity.horaInicio, DEFAULT_FORM.horaInicio),
            horaFin: parseTimeValue(activity.horaFin, DEFAULT_FORM.horaFin),
            cupo: String(activity.cupo),
            requisitos: activity.requisitos.join("\n"),
            materiales: activity.materiales.join("\n"),
          });
        }
        if (user?.rol === "admin") {
          const options = await fetchAdminOrganizers(token, controller.signal);
          if (active) {
            setOrganizers(options);
            const existing = ownedActivities.find((item) => item.id === volunteerId);
            setOrganizerId(existing?.organizadorId ?? options[0]?.id ?? "");
          }
        }
      } catch (cause) {
        if (active && !controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "No se pudieron cargar los datos del formulario.");
        }
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [status, token, user?.rol, volunteerId]);

  const selectedPlace = useMemo(
    () => places.find((item) => item.id === form.lugarId),
    [places, form.lugarId],
  );

  const setText = (field: "titulo" | "descripcion" | "categoria" | "lugarId" | "cupo" | "requisitos" | "materiales", value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const onDateChange = (_event: DateTimePickerEvent, value?: Date) => {
    if (value && picker) setForm((current) => ({ ...current, [picker.field]: value }));
    setPicker(null);
  };

  const save = async () => {
    if (!token) return;
    if (form.titulo.trim().length === 0 || form.descripcion.trim().length === 0
      || form.categoria.trim().length === 0 || !form.lugarId) {
      setError("Completa título, descripción, categoría y lugar.");
      return;
    }
    const payload: VolunteerFormValues = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim(),
      categoria: form.categoria.trim(),
      lugarId: form.lugarId,
      fechaInicio: formatDateValue(form.fechaInicio),
      fechaFin: formatDateValue(form.fechaFin),
      horaInicio: toTime(form.horaInicio),
      horaFin: toTime(form.horaFin),
      cupo: Number(form.cupo),
      requisitos: toLines(form.requisitos),
      materiales: toLines(form.materiales),
      ...(user?.rol === "admin" ? { organizadorId: organizerId } : {}),
    };
    if (!Number.isInteger(payload.cupo) || payload.cupo < 1) {
      setError("El cupo debe ser un número entero mayor a cero.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (volunteerId) {
        await updateManagedVolunteer(token, volunteerId, payload);
      } else {
        await createManagedVolunteer(token, payload);
      }
      router.replace("/organizador/voluntariados");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el voluntariado.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 32 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/organizador/voluntariados")} style={styles.backButton}>
        <Text style={styles.backText}>‹  Voluntariados</Text>
      </Pressable>
      <Text style={styles.eyebrow}>REGENERA · ACTIVIDADES</Text>
      <Text style={[styles.title, { color: colors.text }]}>
        {volunteerId ? "Editar voluntariado" : "Crear voluntariado"}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Completa los detalles. La API valida lugar, fechas, horarios, cupo y permisos antes de guardar.
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#164F3D" />
      ) : (
        <View style={styles.form}>
          {field("Título", form.titulo, (value) => setText("titulo", value), colors.text, "Ej. Limpieza de playa")}
          {field("Descripción", form.descripcion, (value) => setText("descripcion", value), colors.text, "Describe la actividad", true)}
          {field("Categoría", form.categoria, (value) => setText("categoria", value), colors.text, "Ej. limpieza, reforestación")}

          <Text style={styles.label}>Lugar</Text>
          <View style={styles.chipList}>
            {places.map((place) => (
              <Pressable
                key={place.id}
                onPress={() => setText("lugarId", place.id)}
                style={[styles.chip, form.lugarId === place.id && styles.selectedChip]}
              >
                <Text style={[styles.chipText, form.lugarId === place.id && styles.selectedChipText]}>
                  {place.nombre}{place.municipio ? ` · ${place.municipio}` : ""}
                </Text>
              </Pressable>
            ))}
            {places.length === 0 && <Text style={[styles.hint, { color: colors.textSecondary }]}>No hay lugares activos disponibles.</Text>}
          </View>
          {selectedPlace && <Text style={[styles.hint, { color: colors.textSecondary }]}>{selectedPlace.descripcion}</Text>}

          {user?.rol === "admin" && (
            <>
              <Text style={styles.label}>Organizador responsable</Text>
              <View style={styles.chipList}>
                {organizers.map((organizer) => (
                  <Pressable
                    key={organizer.id}
                    onPress={() => setOrganizerId(organizer.id)}
                    style={[styles.chip, organizerId === organizer.id && styles.selectedChip]}
                  >
                    <Text style={[styles.chipText, organizerId === organizer.id && styles.selectedChipText]}>
                      {organizer.nombre}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <Text style={styles.label}>Fechas y horarios</Text>
          {dateRow("Inicio", form.fechaInicio, () => setPicker({ field: "fechaInicio", mode: "date" }), colors.textSecondary)}
          {dateRow("Fin", form.fechaFin, () => setPicker({ field: "fechaFin", mode: "date" }), colors.textSecondary)}
          {dateRow("Hora de inicio", form.horaInicio, () => setPicker({ field: "horaInicio", mode: "time" }), colors.textSecondary, true)}
          {dateRow("Hora de fin", form.horaFin, () => setPicker({ field: "horaFin", mode: "time" }), colors.textSecondary, true)}

          {picker && (
            <DateTimePicker
              value={form[picker.field]}
              mode={picker.mode}
              onChange={onDateChange}
            />
          )}

          {field("Cupo", form.cupo, (value) => setText("cupo", value), colors.text, "20", false, "number-pad")}
          {field("Requisitos (uno por línea)", form.requisitos, (value) => setText("requisitos", value), colors.text, "Opcional", true)}
          {field("Materiales (uno por línea)", form.materiales, (value) => setText("materiales", value), colors.text, "Opcional", true)}

          <View style={[styles.notice, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {user?.rol === "organizador"
                ? "Al crear o editar, la API enviará la actividad a revisión antes de publicarla."
                : "El estado final y la publicación dependen de la API y del flujo de moderación."}
            </Text>
          </View>
          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Pressable disabled={saving} onPress={() => void save()} style={[styles.primaryButton, saving && styles.disabled]}>
            <Text style={styles.primaryButtonText}>{saving ? "Guardando…" : volunteerId ? "Guardar cambios" : "Crear voluntariado"}</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function field(
  label: string,
  value: string,
  onChangeText: (value: string) => void,
  color: string,
  placeholder: string,
  multiline = false,
  keyboardType: "default" | "number-pad" = "default",
) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#87958D"
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={[styles.input, { color }, multiline && styles.multiline]}
      />
    </View>
  );
}

function dateRow(
  label: string,
  value: Date,
  onPress: () => void,
  muted: string,
  time = false,
) {
  const text = time
    ? new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit" }).format(value)
    : new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric" }).format(value);
  return (
    <Pressable onPress={onPress} style={styles.dateRow}>
      <Text style={[styles.hint, { color: muted }]}>{label}</Text>
      <Text style={styles.dateValue}>{text}  ›</Text>
    </Pressable>
  );
}

function toTime(value: Date): string {
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

function toLines(value: string): string[] {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, gap: 13 },
  backButton: { paddingVertical: 8 },
  backText: { color: "#164F3D", fontSize: 15, fontWeight: "700" },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  title: { fontSize: 27, fontWeight: "800" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  form: { gap: 14 },
  field: { gap: 6 },
  label: { color: "#47594F", fontSize: 13, fontWeight: "700" },
  input: { minHeight: 48, borderWidth: 1, borderColor: "#CAD5CD", borderRadius: 13, paddingHorizontal: 13, backgroundColor: "#FFFFFF", fontSize: 15 },
  multiline: { minHeight: 94, paddingTop: 12 },
  chipList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: "#CAD5CD", borderRadius: 13, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: "#FFFFFF" },
  selectedChip: { borderColor: "#164F3D", backgroundColor: "#DCE8DF" },
  chipText: { color: "#47594F", fontSize: 12, fontWeight: "600" },
  selectedChipText: { color: "#164F3D" },
  hint: { fontSize: 12, lineHeight: 18 },
  dateRow: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#DCE3DD" },
  dateValue: { color: "#164F3D", fontSize: 14, fontWeight: "700" },
  notice: { padding: 12, borderRadius: 12 },
  primaryButton: { alignItems: "center", justifyContent: "center", minHeight: 48, paddingHorizontal: 16, borderRadius: 13, backgroundColor: "#164F3D" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  error: { color: "#9E3030", fontSize: 13, lineHeight: 19 },
});
