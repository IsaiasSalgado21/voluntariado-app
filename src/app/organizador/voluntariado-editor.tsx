import DateTimePicker, { type DateTimePickerEvent } from "@/features/organizador/date-time-picker";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, RegeneraColors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { AppNavigationBar, RegeneraCard, RegeneraPageHeader, RegeneraSectionHeading } from "@/components/regenera-ui";
import { useSession } from "@/features/auth/use-session";
import {
  createManagedVolunteer,
  fetchAdminOrganizers,
  fetchManagedCommentsDefault,
  fetchManagedPlaceOptions,
  fetchManagedVolunteers,
  fetchVolunteerCategoryOptions,
  normalizeCategory,
  updateManagedCommentsDefault,
  updateManagedVolunteer,
  type VolunteerImageUpload,
  type ManagedPlaceOption,
  type OrganizerOption,
  type VolunteerCategoryOption,
  type VolunteerFormValues,
} from "@/features/organizador/api";
import type { CommentsDefault } from "@/features/voluntariados/api";
import { formatDateValue, parseDateValue, parseTimeValue } from "@/features/organizador/date";

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
  const [places, setPlaces] = useState<ManagedPlaceOption[]>([]);
  const [categories, setCategories] = useState<VolunteerCategoryOption[]>([]);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [organizers, setOrganizers] = useState<OrganizerOption[]>([]);
  const [organizerId, setOrganizerId] = useState("");
  const [commentsDefault, setCommentsDefault] = useState<CommentsDefault>("publico");
  const [initialCommentsDefault, setInitialCommentsDefault] = useState<CommentsDefault>("publico");
  const [createdVolunteerId, setCreatedVolunteerId] = useState<string | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [removedImages, setRemovedImages] = useState<number[]>([]);
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [picker, setPicker] = useState<{ field: DateField; mode: "date" | "time" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    void Promise.resolve().then(async () => {
      if (status !== "authenticated" || !token) {
        setLoading(false);
        return;
      }
      try {
        const [availablePlaces, ownedActivities, availableCategories, currentCommentsDefault] = await Promise.all([
          fetchManagedPlaceOptions(token, controller.signal),
          fetchManagedVolunteers(token, controller.signal),
          fetchVolunteerCategoryOptions(controller.signal),
          volunteerId
            ? fetchManagedCommentsDefault(token, volunteerId, controller.signal)
            : Promise.resolve("publico" as const),
        ]);
        if (!active) return;
        setPlaces(availablePlaces);
        setCategories(availableCategories);
        setCommentsDefault(currentCommentsDefault);
        setInitialCommentsDefault(currentCommentsDefault);
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
          setExistingImages(activity.imagenes);
          setRemovedImages([]);
          setSelectedImages([]);
          setIsCustomCategory(!availableCategories.some((category) => category.value === activity.categoria));
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

  const onDateChange = (event: DateTimePickerEvent, value?: Date) => {
    if (value && picker) setForm((current) => ({ ...current, [picker.field]: value }));
    if (event.type !== "set" || (Platform.OS !== "ios" && Platform.OS !== "web")) {
      setPicker(null);
    }
  };

  const pickImages = async () => {
    setError(null);
    try {
      if (Platform.OS !== "web") {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError("Permite el acceso a Fotos para adjuntar imágenes.");
          return;
        }
      }
      const available = Math.max(
        0,
        10 - (existingImages.length - removedImages.length) - selectedImages.length,
      );
      if (available === 0) {
        setError("Cada voluntariado puede tener un máximo de 10 imágenes.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: available,
        quality: 0.8,
      });
      if (result.canceled) return;
      const selectedAssets = result.assets.slice(0, available);
      const validAssets = selectedAssets.filter((asset) => {
        if (asset.fileSize !== null && asset.fileSize !== undefined && asset.fileSize > 5 * 1024 * 1024) {
          return false;
        }
        return true;
      });
      setSelectedImages((current) => [...current, ...validAssets]);
      if (selectedAssets.length !== result.assets.length) {
        setError("Cada voluntariado puede tener un máximo de 10 imágenes.");
      } else if (validAssets.length !== selectedAssets.length) {
        setError("Cada imagen debe pesar 5 MB o menos. Las imágenes más grandes no se agregaron.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo abrir la biblioteca de fotos.");
    }
  };

  const removeExistingImage = (index: number) => {
    setRemovedImages((current) => current.includes(index) ? current : [...current, index]);
  };

  const save = async () => {
    if (!token) return;
    if (form.titulo.trim().length === 0 || form.descripcion.trim().length === 0
      || form.categoria.trim().length === 0 || !form.lugarId) {
      setError("Completa título, descripción, categoría y lugar.");
      return;
    }
    const categoria = isCustomCategory ? normalizeCategory(form.categoria) : form.categoria.trim();
    if (!categoria) {
      setError("Escribe una categoría válida.");
      return;
    }
    const fechaInicio = formatDateValue(form.fechaInicio);
    const fechaFin = formatDateValue(form.fechaFin);
    if (fechaFin < fechaInicio || toTime(form.horaFin) <= toTime(form.horaInicio)) {
      setError("La fecha y hora de fin deben ser posteriores al inicio.");
      return;
    }
    const payload: VolunteerFormValues = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim(),
      categoria,
      lugarId: form.lugarId,
      fechaInicio,
      fechaFin,
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
      let savedVolunteerId = volunteerId ?? createdVolunteerId;
      const images = selectedImages.map(toVolunteerImageUpload);
      if (savedVolunteerId) {
        await updateManagedVolunteer(token, savedVolunteerId, payload, images, removedImages);
      } else {
        const created = await createManagedVolunteer(token, payload, images);
        savedVolunteerId = created.id;
        setCreatedVolunteerId(created.id);
      }

      if (!volunteerId || createdVolunteerId || commentsDefault !== initialCommentsDefault) {
        const savedDefault = await updateManagedCommentsDefault(token, savedVolunteerId, commentsDefault);
        setCommentsDefault(savedDefault);
        setInitialCommentsDefault(savedDefault);
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
      <AppNavigationBar
        backLabel="Voluntariados"
        onBack={() => router.canGoBack() ? router.back() : router.replace("/organizador/voluntariados")}
      />
      <RegeneraPageHeader
        eyebrow="REGENERA · ACTIVIDADES"
        title={volunteerId ? "Editar voluntariado" : "Crear voluntariado"}
        subtitle="Completa los detalles. La API valida lugar, fechas, horarios, cupo y permisos antes de guardar."
      />

      {loading ? (
        <ActivityIndicator size="large" color="#164F3D" />
      ) : (
        <RegeneraCard style={styles.form}>
          <RegeneraSectionHeading eyebrow="DETALLES" title="Información de la actividad" />
          {field("Título", form.titulo, (value) => setText("titulo", value), colors.text, "Ej. Limpieza de playa")}
          {field("Descripción", form.descripcion, (value) => setText("descripcion", value), colors.text, "Describe la actividad", true)}
          <Text style={styles.label}>Categoría recomendada</Text>
          <View style={styles.chipList}>
            {categories.map((category) => (
              <Pressable
                key={category.value}
                onPress={() => {
                  setIsCustomCategory(false);
                  setText("categoria", category.value);
                }}
                style={[styles.chip, !isCustomCategory && form.categoria === category.value && styles.selectedChip]}
              >
                <Text style={[styles.chipText, !isCustomCategory && form.categoria === category.value && styles.selectedChipText]}>
                  {category.label}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => {
                setIsCustomCategory(true);
                setText("categoria", "");
              }}
              style={[styles.chip, isCustomCategory && styles.selectedChip]}
            >
              <Text style={[styles.chipText, isCustomCategory && styles.selectedChipText]}>Otra categoría</Text>
            </Pressable>
          </View>
          {isCustomCategory && field(
            "Nombre de la nueva categoría",
            form.categoria,
            (value) => setText("categoria", value),
            colors.text,
            "Ej. Restauración de dunas",
          )}
          {isCustomCategory && <Text style={[styles.hint, { color: colors.textSecondary }]}>Después de guardar, aparecerá como categoría recomendada.</Text>}

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
            {places.length === 0 && <Text style={[styles.hint, { color: colors.textSecondary }]}>No hay lugares disponibles para tu cuenta.</Text>}
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

          <RegeneraCard style={[styles.imagesCard, { backgroundColor: colors.background }]}>
            <RegeneraSectionHeading
              eyebrow="GALERÍA"
              title="Imágenes del voluntariado"
              subtitle={`${existingImages.length - removedImages.length + selectedImages.length} de 10 imágenes · Máximo 5 MB por imagen`}
            />
            <View style={styles.imageGrid}>
              {existingImages.map((uri, index) => {
                const removed = removedImages.includes(index);
                return (
                <View key={`${uri}-${index}`} style={[styles.imageItem, removed && styles.removedImage]}>
                  <Image source={{ uri }} resizeMode="cover" style={styles.imagePreview} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${removed ? "Restaurar" : "Quitar"} imagen existente ${index + 1}`}
                    onPress={() => removed
                      ? setRemovedImages((current) => current.filter((itemIndex) => itemIndex !== index))
                      : removeExistingImage(index)}
                    style={[styles.imageRemoveButton, removed && styles.imageRestoreButton]}
                  >
                    <Text style={[styles.imageRemoveText, removed && styles.imageRestoreText]}>
                      {removed ? "Restaurar" : "Quitar"}
                    </Text>
                  </Pressable>
                </View>
                );
              })}
              {selectedImages.map((asset, index) => (
                <View key={`${asset.uri}-${index}`} style={styles.imageItem}>
                  <Image source={{ uri: asset.uri }} resizeMode="cover" style={styles.imagePreview} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar imagen nueva ${index + 1}`}
                    onPress={() => setSelectedImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    style={styles.imageRemoveButton}
                  >
                    <Text style={styles.imageRemoveText}>Quitar</Text>
                  </Pressable>
                </View>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={existingImages.length - removedImages.length + selectedImages.length >= 10}
              onPress={() => void pickImages()}
              style={[
                styles.imagePickButton,
                existingImages.length - removedImages.length + selectedImages.length >= 10 && styles.disabled,
              ]}
            >
              <Text style={styles.imagePickText}>＋  Agregar imágenes</Text>
            </Pressable>
          </RegeneraCard>

          <View style={styles.commentConfig}>
            <Text style={styles.label}>Visibilidad predeterminada de comentarios</Text>
            <View style={styles.chipList}>
              {(["publico", "privado"] as const).map((value) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: commentsDefault === value }}
                  key={value}
                  onPress={() => setCommentsDefault(value)}
                  style={[styles.chip, commentsDefault === value && styles.selectedChip]}
                >
                  <Text style={[styles.chipText, commentsDefault === value && styles.selectedChipText]}>
                    {value === "publico" ? "Público" : "Privado"}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {commentsDefault === "privado"
                ? "Los comentarios nuevos de voluntarios serán dudas privadas; las verá su autor, la organización y administración."
                : "Los comentarios nuevos serán públicos; cada voluntario puede marcar su duda como privada."}
            </Text>
          </View>

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
        </RegeneraCard>
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

  form: { gap: 14, padding: 16 },
  imagesCard: { padding: 13, gap: 12, backgroundColor: "#F5F7F2" },
  field: { gap: 6 },
  commentConfig: { gap: 8, padding: 12, borderRadius: 12, backgroundColor: "#FFFFFF" },
  label: { color: "#47594F", fontSize: 13, fontWeight: "700" },
  input: { minHeight: 48, borderWidth: 1, borderColor: "#CAD5CD", borderRadius: 13, paddingHorizontal: 13, backgroundColor: "#FFFFFF", fontSize: 15 },
  multiline: { minHeight: 94, paddingTop: 12 },
  chipList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: "#CAD5CD", borderRadius: 13, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: "#FFFFFF" },
  selectedChip: { borderColor: "#164F3D", backgroundColor: "#DCE8DF" },
  chipText: { color: "#47594F", fontSize: 12, fontWeight: "600" },
  selectedChipText: { color: "#164F3D" },
  imageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  imageItem: { width: 92, gap: 5 },
  removedImage: { opacity: 0.58 },
  imagePreview: { width: 92, height: 76, borderRadius: 10, backgroundColor: "#DCE8DF" },
  imageRemoveButton: { minHeight: 34, alignItems: "center", justifyContent: "center", borderRadius: 9, backgroundColor: "#F4DDDA" },
  imageRemoveText: { color: RegeneraColors.error, fontSize: 11, fontWeight: "700" },
  imageRestoreButton: { backgroundColor: "#DCE8DF" },
  imageRestoreText: { color: RegeneraColors.primary },
  imagePickButton: { minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#AFC5B4", borderRadius: 12, backgroundColor: "#DCE8DF" },
  imagePickText: { color: RegeneraColors.primary, fontSize: 13, fontWeight: "700" },
  hint: { fontSize: 12, lineHeight: 18 },
  dateRow: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#DCE3DD" },
  dateValue: { color: "#164F3D", fontSize: 14, fontWeight: "700" },
  notice: { padding: 12, borderRadius: 12 },
  primaryButton: { alignItems: "center", justifyContent: "center", minHeight: 48, paddingHorizontal: 16, borderRadius: 13, backgroundColor: "#164F3D" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  error: { color: "#9E3030", fontSize: 13, lineHeight: 19 },
});

function toVolunteerImageUpload(asset: ImagePicker.ImagePickerAsset): VolunteerImageUpload {
  return {
    uri: asset.uri,
    fileName: asset.fileName ?? null,
    mimeType: asset.mimeType ?? null,
    ...(asset.file ? { file: asset.file } : {}),
  };
}
