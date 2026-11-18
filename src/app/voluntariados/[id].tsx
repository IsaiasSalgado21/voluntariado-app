import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker } from "@/features/map/map-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VolunteerPhoto } from "@/features/voluntariados/volunteer-photo";
import { CommentsSection } from "@/features/comentarios/comments-section";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useSession } from "@/features/auth/use-session";
import {
  requestAttendanceCorrection,
  type AttendanceCorrectionState,
} from "@/features/asistencia/api";
import {
  cancelEnrollment,
  createEnrollment,
  fetchMyEnrollment,
} from "@/features/inscripciones/api";
import {
  fetchVolunteerMapItem,
  fetchVoluntariado,
  fetchVolunteerPlace,
  type VolunteerDetail,
  type VolunteerMapItem,
  type VolunteerPlaceDetail,
} from "@/features/voluntariados/api";
import { fetchVolunteerImpact, type VolunteerImpactSummary } from "@/features/impacto/api";
import { ImpactMetricsChart } from "@/features/impacto/impact-metrics-chart";
import { VolunteerSymbol, type VolunteerSymbolName } from "@/features/voluntariados/volunteer-symbol";

export default function VolunteerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const volunteerId = (Array.isArray(id) ? id[0] : id) ?? "";
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const scheme = Colors.dark.background === theme.background ? "dark" : "light";
  const colors = Colors[scheme];
  const { status: sessionStatus, token, user } = useSession();
  const [volunteer, setVolunteer] = useState<VolunteerDetail | null>(null);
  const [place, setPlace] = useState<VolunteerPlaceDetail | null>(null);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [capacity, setCapacity] = useState<VolunteerMapItem | null>(null);
  const [capacityLoading, setCapacityLoading] = useState(true);
  const [capacityError, setCapacityError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [enrollmentWorking, setEnrollmentWorking] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [hasAttended, setHasAttended] = useState(false);
  const [hasAbsence, setHasAbsence] = useState(false);
  const [attendanceRequestStatus, setAttendanceRequestStatus] = useState<AttendanceCorrectionState | null>(null);
  const [attendanceRequestWorking, setAttendanceRequestWorking] = useState(false);
  const [attendanceRequestError, setAttendanceRequestError] = useState<string | null>(null);
  const [impact, setImpact] = useState<VolunteerImpactSummary | null>(null);
  const [impactLoading, setImpactLoading] = useState(true);
  const [impactError, setImpactError] = useState<string | null>(null);
  const [impactRefresh, setImpactRefresh] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const canEnroll = Boolean(
    token
    && user?.estado === "activo"
    && (user.rol === "usuario" || user.rol === "organizador"),
  );
  const isActivityOwner = Boolean(
    volunteer?.organizadorId && user?.id === volunteer.organizadorId,
  );

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active || !token || !user || !canEnroll || !volunteerId) return;

      setEnrollmentLoading(true);
      setEnrollmentError(null);
      setEnrolled(false);
      setEnrollmentId(null);
      setHasAttended(false);
      setHasAbsence(false);
      setAttendanceRequestStatus(null);
      setAttendanceRequestError(null);
      try {
        const result = await fetchMyEnrollment(token, volunteerId, controller.signal);
        if (active) {
          setEnrolled(result.enrolled);
          setEnrollmentId(result.enrollmentId);
          setHasAttended(result.attended);
          setHasAbsence(result.absent);
          setAttendanceRequestStatus(result.attendanceRequestStatus);
        }
      } catch (cause) {
        if (active && !controller.signal.aborted) {
          setEnrollmentError(
            cause instanceof Error ? cause.message : "No se pudo consultar tu inscripción.",
          );
        }
      } finally {
        if (active && !controller.signal.aborted) setEnrollmentLoading(false);
      }
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [token, user, canEnroll, volunteerId]);

  const requestAttendanceReview = async () => {
    if (!token || !hasAbsence || isActivityOwner || attendanceRequestWorking) return;
    setAttendanceRequestWorking(true);
    setAttendanceRequestError(null);
    try {
      const request = await requestAttendanceCorrection(token, volunteerId);
      setAttendanceRequestStatus(request.estado);
    } catch (cause) {
      setAttendanceRequestError(
        cause instanceof Error ? cause.message : "No se pudo enviar la solicitud de revisión.",
      );
    } finally {
      setAttendanceRequestWorking(false);
    }
  };

  const enroll = async () => {
    if (!token) return;
    setEnrollmentWorking(true);
    setEnrollmentError(null);
    try {
      const result = await createEnrollment(token, volunteerId);
      setEnrollmentId(result.id);
      setEnrolled(true);
    } catch (cause) {
      setEnrollmentError(cause instanceof Error ? cause.message : "No se pudo registrar tu inscripción.");
    } finally {
      setEnrollmentWorking(false);
    }
  };

  const cancel = async () => {
    if (!token || !enrollmentId) return;
    setEnrollmentWorking(true);
    setEnrollmentError(null);
    try {
      await cancelEnrollment(token, enrollmentId);
      setEnrolled(false);
      setEnrollmentId(null);
      setConfirmCancel(false);
    } catch (cause) {
      setEnrollmentError(cause instanceof Error ? cause.message : "No se pudo cancelar tu inscripción.");
    } finally {
      setEnrollmentWorking(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError(null);
    setVolunteer(null);
    setPlace(null);
    setPlaceLoading(false);
    setPlaceError(null);
    setCapacity(null);
    setCapacityLoading(true);
    setCapacityError(null);
    setEnrolled(false);
    setEnrollmentId(null);
    setEnrollmentLoading(false);
    setEnrollmentError(null);
    setConfirmCancel(false);
    void Promise.resolve().then(async () => {
      if (!active) return;
      if (!volunteerId) {
        setError("No se recibió un identificador válido para la actividad.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const found = await fetchVoluntariado(volunteerId, controller.signal);
        if (!active) return;
        setVolunteer(found);
        setLoading(false);

        if (found.lugarId) {
          setPlaceLoading(true);
          void fetchVolunteerPlace(found.lugarId, controller.signal)
            .then((result) => {
              if (active) {
                setPlace(result);
                setPlaceLoading(false);
              }
            })
            .catch((cause: unknown) => {
              if (active && !controller.signal.aborted) {
                setPlaceError(
                  cause instanceof Error ? cause.message : "No se pudo cargar el lugar.",
                );
                setPlaceLoading(false);
              }
            });
        }

        void fetchVolunteerMapItem(found.id, controller.signal)
          .then((result) => {
            if (active) setCapacity(result);
          })
          .catch((cause: unknown) => {
            if (active && !controller.signal.aborted) {
              setCapacityError(
                cause instanceof Error ? cause.message : "No se pudo verificar el cupo actual.",
              );
            }
          })
          .finally(() => {
            if (active && !controller.signal.aborted) setCapacityLoading(false);
          });
      } catch (cause) {
        if (active && !controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "No se pudo cargar el voluntariado.");
        }
      } finally {
        if (active && !controller.signal.aborted) setLoading(false);
      }
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [volunteerId]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setImpactLoading(true);
    setImpactError(null);
    void fetchVolunteerImpact(volunteerId, controller.signal)
      .then((result) => {
        if (active) setImpact(result);
      })
      .catch((cause: unknown) => {
        if (active && !controller.signal.aborted) {
          setImpactError(cause instanceof Error ? cause.message : "No se pudo cargar el impacto de la actividad.");
        }
      })
      .finally(() => {
        if (active && !controller.signal.aborted) setImpactLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [volunteerId, impactRefresh]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/voluntariados");
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color="#164F3D" size="large" />
        <Text style={[styles.muted, { color: colors.textSecondary }]}>Cargando voluntariado…</Text>
      </View>
    );
  }

  if (error || !volunteer) {
    return (
      <View style={[styles.center, styles.errorState, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {error ? "No pudimos abrir esta actividad" : "Voluntariado no disponible"}
        </Text>
        <Text style={[styles.muted, { color: colors.textSecondary }]}>
          {error ?? "La actividad pudo dejar de estar publicada o ya no está disponible."}
        </Text>
        <Pressable onPress={goBack} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Volver a voluntariados</Text>
        </Pressable>
      </View>
    );
  }

  const coordinates = volunteer.latitud !== null && volunteer.longitud !== null
    ? { latitude: volunteer.latitud, longitude: volunteer.longitud }
    : place && place.latitud !== null && place.longitud !== null
      ? { latitude: place.latitud, longitude: place.longitud }
      : null;
  const mapUrl = coordinates
    ? `https://www.openstreetmap.org/?mlat=${coordinates.latitude}&mlon=${coordinates.longitude}#map=15/${coordinates.latitude}/${coordinates.longitude}`
    : null;
  const isFull = capacity?.lleno === true;
  const enrollmentClosed = volunteer.estado !== "publicado" || volunteer.finalizadoPorFecha;
  const capacityLabel = capacityLoading
    ? `Consultando ocupación · cupo máximo ${volunteer.cupo}`
    : capacity
      ? capacity.lleno
        ? `Lleno · ${capacity.inscripciones_activas} de ${capacity.cupo}`
        : `${Math.max(0, capacity.cupo - capacity.inscripciones_activas)} lugares disponibles de ${capacity.cupo}`
      : `Cupo máximo: ${volunteer.cupo} · ocupación actual no disponible`;
  const factColors = {
    textColor: colors.text,
    labelColor: colors.textSecondary,
    iconBackground: colors.backgroundSelected,
  };
  const chipBackgroundColors = {
    requirements: scheme === "dark" ? colors.backgroundSelected : "#F3F7F1",
    materials: scheme === "dark" ? colors.backgroundSelected : "#FAF6ED",
  };
  const galleryImages = Array.from(
    new Set([volunteer.imagen, ...volunteer.imagenes].filter((image): image is string => Boolean(image))),
  );
  const heroImage = galleryImages.includes(selectedImage ?? "")
    ? selectedImage
    : galleryImages[0] ?? null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 10,
        paddingBottom: insets.bottom + 28,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver a la lista de voluntariados"
        onPress={goBack}
        style={styles.backButton}
      >
        <Text style={styles.backText}>‹  Voluntariados</Text>
      </Pressable>

      <View style={styles.hero}>
        <VolunteerPhoto
          key={`${volunteer.id}-${heroImage ?? "placeholder"}`}
          uri={heroImage}
          title={volunteer.titulo}
          variant="detail"
        />
        <View style={styles.heroOverlay}>
          {volunteer.categoria && (
            <Text style={styles.category}>{formatCategory(volunteer.categoria)}</Text>
          )}
          <Text style={styles.heroEyebrow}>PARTICIPA</Text>
          <Text style={styles.heroTitle}>{volunteer.titulo}</Text>
          <View style={styles.heroMeta}>
            <HeroFact
              icon="calendario"
              label="Fecha"
              value={`${formatDate(volunteer.fechaInicio)}${volunteer.horaInicio ? ` · ${volunteer.horaInicio.slice(0, 5)}` : ""}`}
            />
            {(place?.nombre || placeLoading) && (
              <HeroFact
                icon="ubicacion"
                label="Lugar"
                value={`${place?.nombre ?? "Cargando lugar…"}${place?.municipio ? ` · ${place.municipio}` : ""}`}
              />
            )}
          </View>
          <View style={styles.organizer}>
            {volunteer.organizadorFoto ? (
              <Image
                accessibilityLabel={`Foto de ${volunteer.organizadorNombre ?? "el organizador"}`}
                source={{ uri: volunteer.organizadorFoto }}
                contentFit="cover"
                style={styles.organizerAvatar}
              />
            ) : (
              <View style={[styles.organizerAvatar, styles.organizerAvatarFallback]}>
                <Text style={styles.organizerInitial}>
                  {(volunteer.organizadorNombre ?? "O").charAt(0).toLocaleUpperCase("es-MX")}
                </Text>
              </View>
            )}
            <Text style={styles.organizerName}>
              Organiza: {volunteer.organizadorNombre ?? "Organizador"}
            </Text>
          </View>
        </View>
      </View>
      {galleryImages.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gallery}
          accessibilityLabel="Imágenes del voluntariado"
        >
          {galleryImages.map((image, index) => {
            const active = image === heroImage;
            return (
              <Pressable
                key={`${image}-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`Mostrar imagen ${index + 1} de ${galleryImages.length}`}
                accessibilityState={{ selected: active }}
                onPress={() => setSelectedImage(image)}
                style={[styles.galleryThumbnail, active && styles.galleryThumbnailActive]}
              >
                <Image source={{ uri: image }} contentFit="cover" style={styles.galleryImage} />
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={styles.cardKicker}>ÚNETE A LA ACCIÓN</Text>
          <Text style={[styles.sectionTitle, styles.joinTitle, { color: colors.text }]}>
            Tu participación importa.
          </Text>
          {sessionStatus === "loading" ? (
            <ActivityIndicator color="#164F3D" />
          ) : !token ? (
            <>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                Inicia sesión para inscribirte y consultar tu participación.
              </Text>
              <Pressable onPress={() => router.push("/login")} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
              </Pressable>
            </>
          ) : !canEnroll ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {!user
                ? "No pudimos verificar tu perfil. Intenta abrir Mi perfil e iniciar sesión de nuevo."
                : user.rol === "admin"
                  ? "Las cuentas administradoras no pueden inscribirse en actividades."
                  : user.estado !== "activo"
                    ? "Tu cuenta debe estar activa para inscribirte."
                    : "No hay una cuenta disponible para esta participación."}
            </Text>
          ) : enrollmentLoading ? (
            <ActivityIndicator color="#164F3D" />
          ) : enrolled ? (
            <>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                Ya tienes una inscripción vigente para esta actividad.
              </Text>
              {hasAttended && (
                <Text style={[styles.attendanceStatus, { color: colors.text }]}>
                  Asistencia registrada. ¡Gracias por participar!
                </Text>
              )}
              {hasAbsence && (
                <View style={[styles.attendanceReview, { backgroundColor: colors.backgroundSelected }]}>
                  <Text style={[styles.description, { color: colors.text }]}>
                    No encontramos un registro de asistencia para esta actividad finalizada.
                  </Text>
                  {attendanceRequestStatus === "rechazada" && (
                    <Text style={[styles.muted, { color: colors.textSecondary }]}>
                      La solicitud anterior fue rechazada. Puedes solicitar otra revisión.
                    </Text>
                  )}
                  {attendanceRequestError && (
                    <Text accessibilityRole="alert" style={styles.errorText}>{attendanceRequestError}</Text>
                  )}
                  {isActivityOwner ? (
                    <Text style={[styles.muted, { color: colors.textSecondary }]}>
                      El propietario no puede solicitar la revisión de su propia actividad.
                    </Text>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      disabled={
                        attendanceRequestWorking
                        || attendanceRequestStatus === "pendiente"
                        || attendanceRequestStatus === "aceptando"
                        || attendanceRequestStatus === "aceptada"
                      }
                      onPress={() => void requestAttendanceReview()}
                      style={[
                        styles.secondaryButton,
                        (
                          attendanceRequestWorking
                          || attendanceRequestStatus === "pendiente"
                          || attendanceRequestStatus === "aceptando"
                          || attendanceRequestStatus === "aceptada"
                        ) && styles.disabled,
                      ]}
                    >
                      <Text style={styles.secondaryButtonText}>
                        {attendanceRequestWorking
                          ? "Enviando solicitud…"
                          : attendanceRequestStatus === "pendiente" || attendanceRequestStatus === "aceptando"
                            ? "Solicitud enviada al propietario"
                            : attendanceRequestStatus === "aceptada"
                              ? "Asistencia confirmada"
                              : "Solicitar revisión al propietario"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
              {confirmCancel ? (
                <View style={styles.cancelActions}>
                  <Text style={[styles.muted, { color: colors.textSecondary }]}>
                    ¿Quieres cancelar tu participación?
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={enrollmentWorking}
                    onPress={() => void cancel()}
                    style={[styles.cancelButton, enrollmentWorking && styles.disabled]}
                  >
                    <Text style={styles.cancelButtonText}>
                      {enrollmentWorking ? "Cancelando…" : "Sí, cancelar"}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => setConfirmCancel(false)} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Conservar inscripción</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setConfirmCancel(true)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Cancelar inscripción</Text>
                </Pressable>
              )}
              <Pressable onPress={() => router.push("/inscripciones")} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Ver mis inscripciones</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {isFull
                  ? "Esta actividad ya no tiene cupo disponible."
                  : enrollmentClosed
                    ? "Esta actividad ya no está abierta para nuevas inscripciones."
                    : "Confirma tu participación en esta actividad."}
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={isFull || enrollmentClosed || enrollmentWorking}
                onPress={() => void enroll()}
                style={[
                  styles.primaryButton,
                  (isFull || enrollmentClosed || enrollmentWorking) && styles.disabled,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {enrollmentWorking
                    ? "Registrando…"
                    : isFull
                      ? "Cupo completo"
                      : enrollmentClosed
                        ? "Inscripciones cerradas"
                        : "Inscribirme"}
                </Text>
              </Pressable>
            </>
          )}
          {enrollmentError && (
            <Text accessibilityRole="alert" style={styles.errorText}>{enrollmentError}</Text>
          )}
        </View>

        <View style={styles.sectionIntro}>
          <Text style={styles.sectionEyebrow}>UNA ACCIÓN QUE SUMA</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Detalles de la actividad</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Sobre la actividad</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {volunteer.descripcion}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Información</Text>
          <Fact {...factColors} icon="calendario" label="Fecha de inicio" value={formatDate(volunteer.fechaInicio)} />
          <Fact {...factColors} icon="calendario" label="Fecha de término" value={formatDate(volunteer.fechaFin)} />
          <Fact {...factColors} icon="reloj" label="Horario" value={formatTimeRange(volunteer.horaInicio, volunteer.horaFin)} />
          <Fact
            {...factColors}
            icon="ubicacion"
            label="Lugar"
            value={place?.nombre ?? (placeLoading ? "Cargando lugar…" : "Lugar registrado")}
          />
          {place?.municipio && <Fact {...factColors} icon="ubicacion" label="Municipio" value={place.municipio} />}
          <Fact
            {...factColors}
            icon="voluntariado"
            label="Organizador"
            value={volunteer.organizadorNombre ?? "Organizador no disponible"}
          />
          <Fact {...factColors} icon="participantes" label="Cupo" value={capacityLabel} />
          <Fact
            {...factColors}
            icon={volunteer.estado === "pendiente" ? "pendiente" : volunteer.estado === "cancelado" ? "cancelado" : "voluntariado"}
            label="Estado"
            value={formatVolunteerStatus(volunteer.estado, volunteer.finalizadoPorFecha)}
          />
          {capacityError && (
            <Text style={styles.errorText}>
              No se pudo verificar la ocupación actual{capacityError ? `: ${capacityError}` : ""}. La API confirmará el cupo al inscribirte.
            </Text>
          )}
          {placeError && (
            <Text style={styles.errorText}>No se pudieron cargar todos los datos del lugar: {placeError}</Text>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Requisitos</Text>
          <FactList
            kind="requirements"
            items={volunteer.requisitos}
            emptyText="No se especificaron requisitos."
            textColor={colors.textSecondary}
            chipBackgroundColor={chipBackgroundColors.requirements}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Materiales necesarios</Text>
          <FactList
            kind="materials"
            items={volunteer.materiales}
            emptyText="No se especificaron materiales."
            textColor={colors.textSecondary}
            chipBackgroundColor={chipBackgroundColors.materials}
          />
        </View>

        <CommentsSection
          volunteerId={volunteer.id}
          commentsDefault={volunteer.comentariosPorDefecto}
        />

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Impacto de esta actividad</Text>
          {impactLoading ? (
            <ActivityIndicator color="#164F3D" />
          ) : impactError ? (
            <>
              <Text accessibilityRole="alert" style={styles.errorText}>{impactError}</Text>
              <Pressable onPress={() => setImpactRefresh((key) => key + 1)} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Reintentar</Text>
              </Pressable>
            </>
          ) : !impact?.totales.length ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Aún no se han reportado resultados. El impacto se actualizará cuando concluya la actividad.
            </Text>
          ) : (
            <>
              <ImpactMetricsChart
                totals={impact.totales}
                records={impact.registros}
                textColor={colors.text}
                secondaryTextColor={colors.textSecondary}
                cardColor={colors.background}
              />
              {!!impact.registros.length && (
                <View style={styles.impactRecords}>
                  <Text style={[styles.impactLabel, { color: colors.text }]}>Registros recientes</Text>
                  {impact.registros.slice(0, 5).map((record) => (
                    <View key={record.id} style={styles.impactRecord}>
                      <Text style={[styles.impactRecordText, { color: colors.textSecondary }]}>
                        {record.etiqueta}: {formatAmount(record.cantidad)} {record.unidad}
                        {record.registradoEn ? ` · ${formatImpactDate(record.registradoEn)}` : ""}
                      </Text>
                      {!!record.nota && (
                        <Text style={[styles.impactRecordText, { color: colors.textSecondary }]}>{record.nota}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
          <Pressable onPress={() => router.push("/impacto")} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Ver impacto acumulado de Regenera →</Text>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Ubicación</Text>
          {!coordinates ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              No hay coordenadas públicas disponibles para mostrar el mapa.
            </Text>
          ) : Platform.OS === "web" ? (
            <Pressable
              onPress={() => {
                if (mapUrl) void Linking.openURL(mapUrl);
              }}
              style={styles.mapLink}
            >
              <Text style={styles.mapLinkText}>Abrir ubicación en OpenStreetMap →</Text>
            </Pressable>
          ) : (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
                latitudeDelta: 0.025,
                longitudeDelta: 0.025,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
            >
              <Marker
                coordinate={coordinates}
                title={volunteer.titulo}
                description={place?.nombre ?? undefined}
              />
            </MapView>
          )}
          {coordinates && Platform.OS !== "web" && mapUrl && (
            <Pressable onPress={() => void Linking.openURL(mapUrl)} style={styles.mapLink}>
              <Text style={styles.mapLinkText}>Abrir en OpenStreetMap →</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function Fact({
  icon,
  label,
  value,
  textColor,
  labelColor,
  iconBackground,
}: {
  icon: VolunteerSymbolName;
  label: string;
  value: string;
  textColor: string;
  labelColor: string;
  iconBackground: string;
}) {
  return (
    <View style={styles.fact}>
      <View style={[styles.factIcon, { backgroundColor: iconBackground }]}>
        <VolunteerSymbol name={icon} size={22} />
      </View>
      <View style={styles.factCopy}>
        <Text style={[styles.factLabel, { color: labelColor }]}>{label}</Text>
        <Text style={[styles.factValue, { color: textColor }]}>{value}</Text>
      </View>
    </View>
  );
}

function HeroFact({
  icon,
  label,
  value,
}: {
  icon: VolunteerSymbolName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.heroFact}>
      <VolunteerSymbol name={icon} size={20} />
      <View style={styles.heroFactCopy}>
        <Text style={styles.heroFactLabel}>{label}</Text>
        <Text numberOfLines={2} style={styles.heroFactValue}>{value}</Text>
      </View>
    </View>
  );
}

function FactList({
  items,
  emptyText,
  textColor,
  kind,
  chipBackgroundColor,
}: {
  items: string[];
  emptyText: string;
  textColor: string;
  kind: "requirements" | "materials";
  chipBackgroundColor: string;
}) {
  if (!items.length) {
    return <Text style={[styles.description, { color: textColor }]}>{emptyText}</Text>;
  }

  return (
    <View style={styles.factList}>
      {items.map((item, index) => {
        const icon = kind === "requirements" ? "confirmado" : materialSymbol(item) ?? "mochila";
        return (
          <View
            key={`${index}-${item}`}
            style={[
              styles.factChip,
              { backgroundColor: chipBackgroundColor },
            ]}
          >
            <VolunteerSymbol name={icon} size={18} />
            <Text style={[styles.factChipText, { color: textColor }]}>{item}</Text>
          </View>
        );
      })}
    </View>
  );
}

function materialSymbol(material: string): VolunteerSymbolName | null {
  const normalized = material.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-MX");
  if (/\bguantes?\b/.test(normalized)) return "guantes";
  if (/\b(?:bloqueador(?:es)?|protector(?:es)? solar(?:es)?|proteccion solar)\b/.test(normalized)) return "bloqueador-solar";
  if (/\bagua\b/.test(normalized)) return "agua";
  if (/\b(?:gorras?|sombreros?)\b/.test(normalized)) return "gorra";
  if (/\bbolsas?\b/.test(normalized)) return "bolsa-residuos";
  if (/\b(?:calzado|zapatos?|tenis)\b/.test(normalized)) return "calzado";
  return null;
}

function formatDate(value: string | null): string {
  if (!value) return "Fecha por confirmar";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha por confirmar";
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatTimeRange(start: string | null, end: string | null): string {
  const formattedStart = start?.slice(0, 5) ?? null;
  const formattedEnd = end?.slice(0, 5) ?? null;
  if (formattedStart && formattedEnd) return `${formattedStart} – ${formattedEnd}`;
  return formattedStart ?? formattedEnd ?? "Horario por confirmar";
}

function formatVolunteerStatus(status: string, finalizadoPorFecha: boolean): string {
  if (finalizadoPorFecha || status === "finalizado") return "Finalizado";
  switch (status) {
    case "publicado":
      return "Publicado";
    case "cancelado":
      return "Cancelado";
    case "pendiente":
      return "Pendiente de aprobación";
    default:
      return status;
  }
}

function formatCategory(value: string): string {
  return value
    .split("-")
    .map((word) => word.charAt(0).toLocaleUpperCase("es-MX") + word.slice(1))
    .join(" ");
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(value);
}

function formatImpactDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "fecha no disponible";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mazatlan",
  }).format(date);
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 24 },
  errorState: { alignItems: "stretch" },
  backButton: { paddingHorizontal: 20, paddingVertical: 12 },
  backText: { color: "#164F3D", fontSize: 16, fontWeight: "700" },
  hero: { position: "relative", backgroundColor: "#244B3B" },
  heroOverlay: { position: "absolute", right: 0, bottom: 0, left: 0, gap: 8, paddingHorizontal: 20, paddingVertical: 18, backgroundColor: "rgba(8, 28, 20, 0.82)" },
  heroEyebrow: { color: "#D3DED7", fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  heroTitle: { color: "#FFFFFF", fontSize: 27, fontWeight: "800", lineHeight: 34 },
  heroMeta: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 4 },
  heroFact: { flexDirection: "row", alignItems: "center", gap: 8, flexGrow: 1, flexBasis: "45%" },
  heroFactCopy: { flex: 1, gap: 2 },
  heroFactLabel: { color: "#C8D8CE", fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  heroFactValue: { color: "#FFFFFF", fontSize: 12, fontWeight: "700", lineHeight: 17 },
  organizer: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 4 },
  organizerAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#DCE8DF" },
  organizerAvatarFallback: { alignItems: "center", justifyContent: "center" },
  organizerInitial: { color: "#164F3D", fontSize: 14, fontWeight: "800" },
  organizerName: { flex: 1, color: "#D3DED7", fontSize: 12, fontWeight: "600" },
  gallery: { gap: 9, paddingHorizontal: 18, paddingTop: 10 },
  galleryThumbnail: { width: 62, height: 48, overflow: "hidden", borderWidth: 2, borderColor: "transparent", borderRadius: 10, opacity: 0.75 },
  galleryThumbnailActive: { borderColor: "#2F8064", opacity: 1 },
  galleryImage: { width: "100%", height: "100%" },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  title: { fontSize: 27, fontWeight: "800", lineHeight: 34 },
  category: { alignSelf: "flex-start", borderWidth: 1, borderColor: "rgba(255,255,255,0.45)", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5, backgroundColor: "rgba(15,50,39,0.7)", color: "#FFFFFF", fontSize: 11, fontWeight: "700", letterSpacing: 0.5, overflow: "hidden" },
  content: { padding: 18, gap: 14 },
  card: { padding: 18, borderRadius: 18, gap: 13 },
  cardKicker: { color: "#2F8064", fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  joinTitle: { marginTop: -7, fontSize: 22, lineHeight: 29 },
  sectionIntro: { gap: 6, paddingTop: 6, paddingBottom: 2 },
  sectionEyebrow: { color: "#2F8064", fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  factList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  factChip: { flexDirection: "row", alignItems: "center", gap: 7, maxWidth: "100%", borderWidth: 1, borderColor: "#DFE9DF", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  factChipText: { flexShrink: 1, fontSize: 13, lineHeight: 18 },
  impactRecords: { gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#B7C7BE", paddingTop: 10 },
  impactLabel: { fontSize: 14, fontWeight: "700" },
  impactRecord: { gap: 3 },
  impactRecordText: { fontSize: 12, lineHeight: 18 },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  description: { fontSize: 15, lineHeight: 23 },
  fact: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  factIcon: { width: 38, height: 38, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#EDF4EE" },
  factCopy: { flex: 1, gap: 3, paddingTop: 2 },
  factLabel: { fontSize: 12, fontWeight: "600" },
  factValue: { color: "#20332B", fontSize: 15, fontWeight: "700" },
  map: { height: 220, borderRadius: 14 },
  mapLink: { paddingVertical: 8 },
  mapLinkText: { color: "#164F3D", fontWeight: "700" },
  muted: { fontSize: 14, lineHeight: 21, textAlign: "center" },
  primaryButton: { alignItems: "center", justifyContent: "center", minHeight: 46, marginTop: 6, paddingHorizontal: 16, borderRadius: 13, backgroundColor: "#164F3D" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  secondaryButton: { alignItems: "center", paddingVertical: 9 },
  secondaryButtonText: { color: "#164F3D", fontSize: 14, fontWeight: "700" },
  cancelActions: { gap: 6 },
  attendanceReview: { gap: 8, padding: 12, borderRadius: 13 },
  attendanceStatus: { fontSize: 14, fontWeight: "700" },
  cancelButton: { alignItems: "center", justifyContent: "center", minHeight: 44, borderRadius: 12, backgroundColor: "#8C3434" },
  cancelButtonText: { color: "#FFFFFF", fontWeight: "700" },
  disabled: { opacity: 0.55 },
  errorText: { color: "#9E3030", fontSize: 13, lineHeight: 19 },
});
