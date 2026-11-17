import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
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
import { resolveApiAssetUrl } from "@/features/api-client";
import {
  deleteAdminArticle,
  fetchAdminArticles,
  fetchAdminFloraFauna,
  fetchAdminPlaces,
  reviewContent,
  saveAdminArticle,
  saveAdminFloraFauna,
  saveAdminPlace,
  type AdminArticle,
  type AdminArticleInput,
  type AdminContentItem,
  type AdminFloraFauna,
  type AdminFloraFaunaInput,
  type AdminImageUpload,
  type AdminPlace,
  type AdminPlaceInput,
} from "@/features/admin/api";

type ContentType = "lugar" | "flora-fauna" | "articulo";
type ReviewAction = "approve" | "reject" | "archive" | "publish" | "unpublish";
type ConfirmAction = ReviewAction | "delete";
type Draft = Record<string, string>;

type AdminEntry =
  | { tipo: "lugar"; data: AdminPlace }
  | { tipo: "flora-fauna"; data: AdminFloraFauna }
  | { tipo: "articulo"; data: AdminArticle };

const TABS: Array<{ type: ContentType; label: string }> = [
  { type: "lugar", label: "Lugares" },
  { type: "flora-fauna", label: "Flora y fauna" },
  { type: "articulo", label: "Artículos" },
];

export default function AdminContentScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colors = Colors[Colors.dark.background === theme.background ? "dark" : "light"];
  const { status, token, user } = useSession();
  const [type, setType] = useState<ContentType>("lugar");
  const [entries, setEntries] = useState<AdminEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorId, setEditorId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft("lugar"));
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [removedImages, setRemovedImages] = useState<number[]>([]);
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [removePlaceImage, setRemovePlaceImage] = useState(false);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [confirmation, setConfirmation] = useState<{ id: string; action: ConfirmAction } | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (!token || status !== "authenticated") {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result: AdminEntry[] = type === "lugar"
          ? (await fetchAdminPlaces(token, controller.signal)).map((data) => ({ tipo: "lugar", data }))
          : type === "flora-fauna"
            ? (await fetchAdminFloraFauna(token, controller.signal)).map((data) => ({ tipo: "flora-fauna", data }))
            : (await fetchAdminArticles(token, controller.signal)).map((data) => ({ tipo: "articulo", data }));
        if (active) setEntries(result);
      } catch (cause) {
        if (active && !controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "No se pudo cargar el contenido.");
        }
      } finally {
        if (active && !controller.signal.aborted) setLoading(false);
      }
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [status, token, type, refreshKey]);

  const changeType = (nextType: ContentType) => {
    setType(nextType);
    closeEditor(nextType);
  };

  const closeEditor = (nextType = type) => {
    setEditorOpen(false);
    setEditorId(null);
    setDraft(emptyDraft(nextType));
    setExistingImages([]);
    setRemovedImages([]);
    setSelectedImages([]);
    setRemovePlaceImage(false);
    setError(null);
  };

  const openNew = () => {
    setEditorOpen(true);
    setEditorId(null);
    setDraft(emptyDraft(type));
    setExistingImages([]);
    setRemovedImages([]);
    setSelectedImages([]);
    setRemovePlaceImage(false);
    setError(null);
  };

  const openEdit = (entry: AdminEntry) => {
    setEditorOpen(true);
    setEditorId(entry.data.id);
    setRemovedImages([]);
    setSelectedImages([]);
    setRemovePlaceImage(false);
    if (entry.tipo === "lugar") {
      setDraft({
        nombre: entry.data.nombre,
        descripcion: entry.data.descripcion,
        municipio: entry.data.municipio,
        direccion: entry.data.direccion,
        latitud: coordinateText(entry.data.latitud),
        longitud: coordinateText(entry.data.longitud),
        tipo: entry.data.tipo,
      });
      setExistingImages(entry.data.imagen ? [entry.data.imagen] : []);
    } else if (entry.tipo === "flora-fauna") {
      setDraft({
        nombre: entry.data.nombre,
        nombreCientifico: entry.data.nombreCientifico,
        tipo: entry.data.tipo,
        descripcion: entry.data.descripcion,
        habitat: entry.data.habitat,
        estadoConservacion: entry.data.estadoConservacion,
        ubicacionNombre: entry.data.ubicacion?.nombre ?? "",
        latitud: coordinateText(entry.data.ubicacion?.latitud ?? null),
        longitud: coordinateText(entry.data.ubicacion?.longitud ?? null),
        fuenteInformacion: entry.data.fuenteInformacion,
      });
      setExistingImages(entry.data.imagenes);
    } else {
      setDraft({
        titulo: entry.data.titulo,
        contenido: entry.data.contenido,
        categoria: entry.data.categoria,
      });
      setExistingImages(entry.data.imagenes);
    }
    setError(null);
  };

  const updateDraft = (key: string, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
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
      const maxImages = imageLimit(type);
      const available = type === "lugar"
        ? 1
        : Math.max(0, maxImages - (existingImages.length - removedImages.length) - selectedImages.length);
      if (available < 1) {
        setError(`Este contenido permite hasta ${maxImages} imagen${maxImages === 1 ? "" : "es"}.`);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: type !== "lugar",
        selectionLimit: available,
        quality: 0.8,
      });
      if (result.canceled) return;
      const assets = result.assets.slice(0, available);
      if (type === "lugar") {
        setSelectedImages(assets.slice(0, 1));
        setRemovePlaceImage(false);
      } else {
        setSelectedImages((current) => [...current, ...assets]);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo abrir la biblioteca de fotos.");
    }
  };

  const save = async () => {
    if (!token) return;
    if (!validateDraft(type, draft)) {
      setError(type === "lugar"
        ? "Completa nombre, municipio y tipo. Latitud y longitud deben ir juntas."
        : type === "flora-fauna"
          ? "Completa nombre, tipo y descripción. Latitud y longitud deben ir juntas."
          : "Completa título, categoría y contenido.");
      return;
    }
    if (selectedImages.some((image) => image.fileSize !== null && image.fileSize !== undefined && image.fileSize > 5 * 1024 * 1024)) {
      setError("Cada imagen debe pesar 5 MB o menos. Elige una versión más ligera.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const uploads = selectedImages.map(toUpload);
      if (type === "lugar") {
        const input: AdminPlaceInput = {
          nombre: draft.nombre.trim(),
          descripcion: draft.descripcion.trim(),
          municipio: draft.municipio.trim(),
          direccion: draft.direccion.trim(),
          latitud: draft.latitud.trim(),
          longitud: draft.longitud.trim(),
          tipo: draft.tipo as AdminPlaceInput["tipo"],
          imagen: uploads[0] ?? null,
          imagenEliminar: removePlaceImage,
        };
        await saveAdminPlace(token, input, editorId ?? undefined);
      } else if (type === "flora-fauna") {
        const input: AdminFloraFaunaInput = {
          nombre: draft.nombre.trim(),
          nombreCientifico: draft.nombreCientifico.trim(),
          tipo: draft.tipo as AdminFloraFaunaInput["tipo"],
          descripcion: draft.descripcion.trim(),
          habitat: draft.habitat.trim(),
          estadoConservacion: draft.estadoConservacion.trim(),
          ubicacionNombre: draft.ubicacionNombre.trim(),
          latitud: draft.latitud.trim(),
          longitud: draft.longitud.trim(),
          fuenteInformacion: draft.fuenteInformacion.trim(),
          imagenes: uploads,
          imagenesEliminar: removedImages,
        };
        await saveAdminFloraFauna(token, input, editorId ?? undefined);
      } else {
        const input: AdminArticleInput = {
          titulo: draft.titulo.trim(),
          contenido: draft.contenido.trim(),
          categoria: draft.categoria.trim(),
          imagenes: uploads,
          imagenesEliminar: removedImages,
        };
        await saveAdminArticle(token, input, editorId ?? undefined);
      }
      closeEditor();
      setRefreshKey((key) => key + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el contenido.");
    } finally {
      setSaving(false);
    }
  };

  const runConfirmedAction = async (entry: AdminEntry, action: ConfirmAction) => {
    if (!token) return;
    if (action === "reject" && !reasons[entry.data.id]?.trim()) {
      setError("Escribe un motivo antes de rechazar el contenido.");
      setConfirmation(null);
      return;
    }
    setWorkingId(entry.data.id);
    setError(null);
    try {
      if (action === "delete") {
        if (entry.tipo !== "articulo") throw new Error("Solo se pueden eliminar artículos.");
        await deleteAdminArticle(token, entry.data.id);
      } else {
        await reviewContent(token, toModerationItem(entry), action, reasons[entry.data.id]?.trim());
      }
      setConfirmation(null);
      setRefreshKey((key) => key + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar el contenido.");
    } finally {
      setWorkingId(null);
    }
  };

  if (user?.rol !== "admin" && status === "authenticated") {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={styles.error}>Esta herramienta es exclusiva de administradores.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 28 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/dashboard")} style={styles.backButton}>
        <Text style={styles.backText}>‹  Mi panel</Text>
      </Pressable>
      <Text style={styles.eyebrow}>REGENERA · CONTENIDO</Text>
      <Text style={[styles.title, { color: colors.text }]}>Gestión de contenido</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Crea y edita catálogos y artículos. Los cambios de estado y permisos se validan en la API.
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map((tab) => (
          <Pressable key={tab.type} onPress={() => changeType(tab.type)} style={[styles.tab, type === tab.type && styles.selectedTab]}>
            <Text style={[styles.tabText, type === tab.type && styles.selectedTabText]}>{tab.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {status === "loading" || loading ? (
        <View style={styles.state}>
          <ActivityIndicator size="large" color="#164F3D" />
          <Text style={[styles.body, { color: colors.textSecondary }]}>Cargando contenido…</Text>
        </View>
      ) : status !== "authenticated" || !token ? (
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Inicia sesión con una cuenta administradora.</Text>
          <Pressable onPress={() => router.push("/login")}><Text style={styles.actionText}>Iniciar sesión →</Text></Pressable>
        </View>
      ) : (
        <>
          {error && !editorOpen && entries.length === 0 && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          {error && !editorOpen && entries.length === 0 && (
            <Pressable onPress={() => setRefreshKey((key) => key + 1)} style={styles.actionButton}>
              <Text style={styles.actionText}>Reintentar</Text>
            </Pressable>
          )}

          {!editorOpen && (
            <Pressable onPress={openNew} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>＋ Crear {contentNoun(type)}</Text>
            </Pressable>
          )}

          {editorOpen ? (
            <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {editorId ? `Editar ${contentNoun(type)}` : `Crear ${contentNoun(type)}`}
              </Text>
              {type === "lugar" ? (
                <PlaceFields draft={draft} update={updateDraft} colors={colors} />
              ) : type === "flora-fauna" ? (
                <FloraFields draft={draft} update={updateDraft} colors={colors} />
              ) : (
                <ArticleFields draft={draft} update={updateDraft} colors={colors} />
              )}
              <ImageEditor
                type={type}
                existingImages={existingImages}
                removedImages={removedImages}
                selectedImages={selectedImages}
                removePlaceImage={removePlaceImage}
                onPick={() => void pickImages()}
                onRemoveExisting={(index) => {
                  if (type === "lugar") setRemovePlaceImage(true);
                  else setRemovedImages((current) => current.includes(index) ? current : [...current, index]);
                }}
                onRestoreExisting={(index) => {
                  if (type === "lugar") setRemovePlaceImage(false);
                  else {
                    const currentCount = existingImages.length - removedImages.length + selectedImages.length;
                    if (currentCount >= imageLimit(type)) {
                      setError(`Este contenido permite hasta ${imageLimit(type)} imágenes.`);
                      return;
                    }
                    setRemovedImages((current) => current.filter((value) => value !== index));
                  }
                }}
                onRemoveSelected={(index) => setSelectedImages((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                colors={colors}
              />
              {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
              <View style={styles.formActions}>
                <Pressable disabled={saving} onPress={() => void save()} style={[styles.primaryButton, saving && styles.disabled]}>
                  <Text style={styles.primaryButtonText}>{saving ? "Guardando…" : "Guardar cambios"}</Text>
                </Pressable>
                <Pressable disabled={saving} onPress={() => closeEditor()} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </Pressable>
              </View>
            </View>
          ) : entries.length === 0 ? (
            <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Aún no hay {contentPlural(type)}.</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>Crea el primer registro para esta sección.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {entries.map((entry) => {
                const item = toModerationItem(entry);
                const actions = availableActions(entry);
                const confirming = confirmation?.id === entry.data.id;
                return (
                  <View key={entry.data.id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                    <View style={styles.cardHeading}>
                      <Text style={[styles.cardTitle, { color: colors.text }]}>{item.titulo}</Text>
                      <Text style={styles.statusBadge}>{statusLabel(item.estado)}</Text>
                    </View>
                    {!!item.detalle && <Text style={[styles.body, { color: colors.textSecondary }]}>{item.detalle}</Text>}
                    <EntryImages entry={entry} />
                    <View style={styles.actions}>
                      <Pressable onPress={() => openEdit(entry)} style={styles.actionButton}>
                        <Text style={styles.actionText}>Editar</Text>
                      </Pressable>
                      {actions.map((action) => (
                        <Pressable
                          key={action}
                          disabled={workingId === entry.data.id}
                          onPress={() => {
                            setError(null);
                            setConfirmation({ id: entry.data.id, action });
                          }}
                          style={styles.actionButton}
                        >
                          <Text style={styles.actionText}>{actionLabel(action)}</Text>
                        </Pressable>
                      ))}
                      {entry.tipo === "articulo" && (
                        <Pressable
                          disabled={workingId === entry.data.id}
                          onPress={() => {
                            setError(null);
                            setConfirmation({ id: entry.data.id, action: "delete" });
                          }}
                          style={styles.dangerButton}
                        >
                          <Text style={styles.dangerText}>Eliminar</Text>
                        </Pressable>
                      )}
                    </View>
                    {actions.includes("reject") && (
                      <Field
                        label="Motivo de rechazo"
                        value={reasons[entry.data.id] ?? ""}
                        onChange={(value) => setReasons((current) => ({ ...current, [entry.data.id]: value }))}
                        colors={colors}
                        multiline
                      />
                    )}
                    {confirming && (
                      <View style={styles.confirmBox}>
                        <Text style={[styles.body, { color: colors.text }]}>
                          {confirmation.action === "delete"
                            ? "Esta acción eliminará el artículo y sus imágenes."
                            : `¿Confirmas ${actionLabel(confirmation.action).toLocaleLowerCase("es-MX")} este contenido?`}
                        </Text>
                        <View style={styles.actions}>
                          <Pressable
                            disabled={workingId === entry.data.id}
                            onPress={() => void runConfirmedAction(entry, confirmation.action)}
                            style={styles.primaryButton}
                          >
                            <Text style={styles.primaryButtonText}>
                              {workingId === entry.data.id ? "Procesando…" : "Confirmar"}
                            </Text>
                          </Pressable>
                          <Pressable onPress={() => setConfirmation(null)} style={styles.cancelButton}>
                            <Text style={styles.cancelText}>Cancelar</Text>
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
          {error && entries.length > 0 && !editorOpen && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        </>
      )}
    </ScrollView>
  );
}

function PlaceFields({ draft, update, colors }: { draft: Draft; update: (key: string, value: string) => void; colors: typeof Colors.light | typeof Colors.dark }) {
  return (
    <>
      <Field label="Nombre" value={draft.nombre ?? ""} onChange={(value) => update("nombre", value)} colors={colors} />
      <Field label="Municipio" value={draft.municipio ?? ""} onChange={(value) => update("municipio", value)} colors={colors} />
      <Field label="Dirección" value={draft.direccion ?? ""} onChange={(value) => update("direccion", value)} colors={colors} />
      <ChoiceField label="Tipo" value={draft.tipo ?? "otro"} options={["playa", "parque", "reserva", "zona_urbana", "otro"]} update={(value) => update("tipo", value)} />
      <Field label="Descripción" value={draft.descripcion ?? ""} onChange={(value) => update("descripcion", value)} colors={colors} multiline />
      <Text style={styles.label}>Coordenadas (opcionales; usa punto decimal y signo negativo)</Text>
      <View style={styles.coordinateRow}>
        <Field label="Latitud" value={draft.latitud ?? ""} onChange={(value) => update("latitud", value)} colors={colors} keyboardType="numbers-and-punctuation" />
        <Field label="Longitud" value={draft.longitud ?? ""} onChange={(value) => update("longitud", value)} colors={colors} keyboardType="numbers-and-punctuation" />
      </View>
    </>
  );
}

function FloraFields({ draft, update, colors }: { draft: Draft; update: (key: string, value: string) => void; colors: typeof Colors.light | typeof Colors.dark }) {
  return (
    <>
      <Field label="Nombre común" value={draft.nombre ?? ""} onChange={(value) => update("nombre", value)} colors={colors} />
      <Field label="Nombre científico" value={draft.nombreCientifico ?? ""} onChange={(value) => update("nombreCientifico", value)} colors={colors} />
      <ChoiceField label="Tipo" value={draft.tipo ?? "flora"} options={["flora", "fauna"]} update={(value) => update("tipo", value)} />
      <Field label="Descripción" value={draft.descripcion ?? ""} onChange={(value) => update("descripcion", value)} colors={colors} multiline />
      <Field label="Hábitat" value={draft.habitat ?? ""} onChange={(value) => update("habitat", value)} colors={colors} />
      <Field label="Estado de conservación" value={draft.estadoConservacion ?? ""} onChange={(value) => update("estadoConservacion", value)} colors={colors} />
      <Field label="Fuente de información" value={draft.fuenteInformacion ?? ""} onChange={(value) => update("fuenteInformacion", value)} colors={colors} />
      <Field label="Nombre de ubicación" value={draft.ubicacionNombre ?? ""} onChange={(value) => update("ubicacionNombre", value)} colors={colors} />
      <View style={styles.coordinateRow}>
        <Field label="Latitud" value={draft.latitud ?? ""} onChange={(value) => update("latitud", value)} colors={colors} keyboardType="numbers-and-punctuation" />
        <Field label="Longitud" value={draft.longitud ?? ""} onChange={(value) => update("longitud", value)} colors={colors} keyboardType="numbers-and-punctuation" />
      </View>
    </>
  );
}

function ArticleFields({ draft, update, colors }: { draft: Draft; update: (key: string, value: string) => void; colors: typeof Colors.light | typeof Colors.dark }) {
  return (
    <>
      <Field label="Título" value={draft.titulo ?? ""} onChange={(value) => update("titulo", value)} colors={colors} />
      <Field label="Categoría" value={draft.categoria ?? ""} onChange={(value) => update("categoria", value)} colors={colors} />
      <Field label="Contenido" value={draft.contenido ?? ""} onChange={(value) => update("contenido", value)} colors={colors} multiline />
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  colors,
  multiline = false,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  colors: typeof Colors.light | typeof Colors.dark;
  multiline?: boolean;
  keyboardType?: "default" | "numbers-and-punctuation";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        placeholderTextColor="#87958D"
        style={[styles.input, multiline && styles.multiline, { color: colors.text }]}
      />
    </View>
  );
}

function ChoiceField({ label, value, options, update }: { label: string; value: string; options: string[]; update: (value: string) => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chips}>
        {options.map((option) => (
          <Pressable key={option} onPress={() => update(option)} style={[styles.chip, value === option && styles.selectedChip]}>
            <Text style={[styles.chipText, value === option && styles.selectedChipText]}>{optionLabel(option)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ImageEditor({
  type,
  existingImages,
  removedImages,
  selectedImages,
  removePlaceImage,
  onPick,
  onRemoveExisting,
  onRestoreExisting,
  onRemoveSelected,
  colors,
}: {
  type: ContentType;
  existingImages: string[];
  removedImages: number[];
  selectedImages: ImagePicker.ImagePickerAsset[];
  removePlaceImage: boolean;
  onPick: () => void;
  onRemoveExisting: (index: number) => void;
  onRestoreExisting: (index: number) => void;
  onRemoveSelected: (index: number) => void;
  colors: typeof Colors.light | typeof Colors.dark;
}) {
  const maxImages = imageLimit(type);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Imágenes · máximo {maxImages}</Text>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Cada archivo debe ser una imagen de hasta 5 MB.
      </Text>
      <View style={styles.imageGrid}>
        {existingImages.map((uri, index) => {
          const removed = type === "lugar" ? removePlaceImage : removedImages.includes(index);
          const sourceUri = resolveApiAssetUrl(uri) ?? uri;
          return (
            <View key={`${uri}-${index}`} style={[styles.imageTile, removed && styles.removedImage]}>
              <Image source={{ uri: sourceUri }} style={styles.imagePreview} />
              <Pressable
                onPress={() => removed ? onRestoreExisting(index) : onRemoveExisting(index)}
                style={styles.imageAction}
              >
                <Text style={styles.imageActionText}>{removed ? "Restaurar" : "Quitar"}</Text>
              </Pressable>
            </View>
          );
        })}
        {selectedImages.map((asset, index) => (
          <View key={`${asset.assetId ?? asset.uri}-${index}`} style={styles.imageTile}>
            <Image source={{ uri: asset.uri }} style={styles.imagePreview} />
            <Pressable onPress={() => onRemoveSelected(index)} style={styles.imageAction}>
              <Text style={styles.imageActionText}>Quitar nueva</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <Pressable onPress={onPick} style={styles.secondaryButton}>
        <Text style={styles.secondaryText}>{type === "lugar" ? "Elegir imagen" : "Agregar imágenes"}</Text>
      </Pressable>
    </View>
  );
}

function EntryImages({ entry }: { entry: AdminEntry }) {
  const images = entry.tipo === "lugar"
    ? entry.data.imagen ? [entry.data.imagen] : []
    : entry.data.imagenes;
  if (images.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageGrid}>
      {images.map((uri, index) => (
        <Image key={`${uri}-${index}`} source={{ uri: resolveApiAssetUrl(uri) ?? uri }} style={styles.listImage} />
      ))}
    </ScrollView>
  );
}

function emptyDraft(type: ContentType): Draft {
  if (type === "lugar") {
    return { nombre: "", descripcion: "", municipio: "", direccion: "", latitud: "", longitud: "", tipo: "otro" };
  }
  if (type === "flora-fauna") {
    return {
      nombre: "",
      nombreCientifico: "",
      tipo: "flora",
      descripcion: "",
      habitat: "",
      estadoConservacion: "",
      ubicacionNombre: "",
      latitud: "",
      longitud: "",
      fuenteInformacion: "",
    };
  }
  return { titulo: "", contenido: "", categoria: "" };
}

function validateDraft(type: ContentType, draft: Draft): boolean {
  if (type === "lugar") {
    return Boolean(draft.nombre?.trim() && draft.municipio?.trim() && draft.tipo)
      && Boolean(draft.latitud?.trim()) === Boolean(draft.longitud?.trim());
  }
  if (type === "flora-fauna") {
    return Boolean(draft.nombre?.trim() && draft.descripcion?.trim() && draft.tipo)
      && Boolean(draft.latitud?.trim()) === Boolean(draft.longitud?.trim());
  }
  return Boolean(draft.titulo?.trim() && draft.categoria?.trim() && draft.contenido?.trim());
}

function toUpload(asset: ImagePicker.ImagePickerAsset): AdminImageUpload {
  return {
    uri: asset.uri,
    fileName: asset.fileName ?? null,
    mimeType: asset.mimeType ?? null,
    ...(asset.file ? { file: asset.file } : {}),
  };
}

function coordinateText(value: number | null): string {
  return value === null ? "" : String(value);
}

function toModerationItem(entry: AdminEntry): AdminContentItem {
  if (entry.tipo === "lugar") {
    return {
      id: entry.data.id,
      tipo: "lugar",
      titulo: entry.data.nombre,
      detalle: [entry.data.municipio, entry.data.descripcion].filter(Boolean).join(" · "),
      estado: entry.data.estado,
      imagen: entry.data.imagen,
    };
  }
  if (entry.tipo === "flora-fauna") {
    return {
      id: entry.data.id,
      tipo: "flora-fauna",
      titulo: entry.data.nombre,
      detalle: [entry.data.tipo, excerpt(entry.data.descripcion)].filter(Boolean).join(" · "),
      estado: entry.data.estado,
      imagen: entry.data.imagenes[0] ?? null,
    };
  }
  return {
    id: entry.data.id,
    tipo: "articulo",
    titulo: entry.data.titulo,
    detalle: [entry.data.categoria, excerpt(entry.data.contenido)].filter(Boolean).join(" · "),
    estado: entry.data.estado,
    imagen: entry.data.imagenes[0] ?? null,
  };
}

function availableActions(entry: AdminEntry): ReviewAction[] {
  const state = entry.data.estado;
  if (entry.tipo === "lugar") {
    if (state === "pendiente_de_aprobacion") return ["approve", "reject"];
    if (state === "activo") return ["archive"];
    if (state === "archivado") return ["publish"];
    return [];
  }
  if (entry.tipo === "flora-fauna") {
    if (state === "publicado") return ["archive"];
    if (state === "archivado") return ["publish"];
    return [];
  }
  if (state === "pendiente") return ["approve", "reject"];
  if (state === "borrador") return ["publish"];
  if (state === "publicado") return ["unpublish"];
  return [];
}

function excerpt(value: string): string {
  return value.length > 180 ? `${value.slice(0, 177).trimEnd()}…` : value;
}

function imageLimit(type: ContentType): number {
  return type === "lugar" ? 1 : type === "flora-fauna" ? 5 : 10;
}

function actionLabel(action: ConfirmAction): string {
  const labels: Record<ConfirmAction, string> = {
    approve: "Aprobar",
    reject: "Rechazar",
    archive: "Archivar",
    publish: "Publicar",
    unpublish: "Retirar publicación",
    delete: "Eliminar artículo",
  };
  return labels[action];
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pendiente: "Pendiente",
    pendiente_de_aprobacion: "Pendiente de aprobación",
    rechazado: "Rechazado",
    borrador: "Borrador",
    publicado: "Publicado",
    activo: "Activo",
    archivado: "Archivado",
  };
  return labels[status] ?? status;
}

function contentNoun(type: ContentType): string {
  return type === "lugar" ? "lugar" : type === "flora-fauna" ? "registro" : "artículo";
}

function contentPlural(type: ContentType): string {
  return type === "lugar" ? "lugares" : type === "flora-fauna" ? "registros" : "artículos";
}

function optionLabel(option: string): string {
  const labels: Record<string, string> = {
    zona_urbana: "Zona urbana",
  };
  return labels[option] ?? option.charAt(0).toLocaleUpperCase("es-MX") + option.slice(1);
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, gap: 13 },
  center: { flex: 1, justifyContent: "center", padding: 24 },
  backButton: { paddingVertical: 8 },
  backText: { color: "#164F3D", fontSize: 15, fontWeight: "700" },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  title: { fontSize: 27, fontWeight: "800" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  tabs: { gap: 8, paddingVertical: 4 },
  tab: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 13, backgroundColor: "#E8ECE7" },
  selectedTab: { backgroundColor: "#164F3D" },
  tabText: { color: "#47594F", fontSize: 12, fontWeight: "700" },
  selectedTabText: { color: "#FFFFFF" },
  list: { gap: 11 },
  card: { padding: 16, borderRadius: 17, gap: 10 },
  cardHeading: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "800" },
  statusBadge: { color: "#775613", backgroundColor: "#F5E9C9", overflow: "hidden", borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontWeight: "800" },
  body: { fontSize: 13, lineHeight: 19 },
  field: { gap: 7 },
  label: { color: "#40554A", fontSize: 12, fontWeight: "700" },
  hint: { fontSize: 12, lineHeight: 17 },
  input: { minHeight: 44, borderWidth: 1, borderColor: "#CAD5CD", borderRadius: 12, paddingHorizontal: 11, backgroundColor: "#FFFFFF", color: "#20332B" },
  multiline: { minHeight: 100, paddingTop: 11 },
  coordinateRow: { flexDirection: "row", gap: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12, backgroundColor: "#E8ECE7" },
  selectedChip: { backgroundColor: "#164F3D" },
  chipText: { color: "#47594F", fontSize: 12, fontWeight: "700" },
  selectedChipText: { color: "#FFFFFF" },
  primaryButton: { minHeight: 42, borderRadius: 12, paddingHorizontal: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#164F3D" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  secondaryButton: { alignSelf: "flex-start", minHeight: 40, paddingHorizontal: 12, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#DCE8DF" },
  secondaryText: { color: "#164F3D", fontSize: 13, fontWeight: "700" },
  cancelButton: { minHeight: 42, paddingHorizontal: 13, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#E8ECE7" },
  cancelText: { color: "#40554A", fontSize: 13, fontWeight: "700" },
  dangerButton: { minHeight: 38, paddingHorizontal: 10, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#F4DDDA" },
  dangerText: { color: "#8C3434", fontSize: 12, fontWeight: "700" },
  actionButton: { minHeight: 38, paddingHorizontal: 9, justifyContent: "center" },
  actionText: { color: "#164F3D", fontSize: 13, fontWeight: "700" },
  formActions: { gap: 8 },
  actions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 7 },
  confirmBox: { borderRadius: 12, padding: 11, gap: 10, backgroundColor: "#F3F4EF" },
  imageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  imageTile: { width: 92, gap: 4 },
  imagePreview: { width: 92, height: 74, borderRadius: 10, backgroundColor: "#E8ECE7" },
  listImage: { width: 72, height: 58, borderRadius: 9, backgroundColor: "#E8ECE7" },
  removedImage: { opacity: 0.45 },
  imageAction: { paddingVertical: 4 },
  imageActionText: { color: "#8C3434", fontSize: 11, fontWeight: "700", textAlign: "center" },
  state: { alignItems: "center", gap: 10, paddingVertical: 28 },
  error: { color: "#9E3030", fontSize: 13, lineHeight: 19 },
  disabled: { opacity: 0.65 },
});
