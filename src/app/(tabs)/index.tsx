import * as Location from "expo-location";
import { router } from "expo-router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import MapView, { Circle, Marker, type Region } from "@/features/map/map-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { fetchSpeciesMapPoints, type SpeciesMapPoint } from "@/features/map/api";
import {
  getMapMarkerPresentation,
  MAP_LEGEND,
  type MapFeatureKind,
  type MapMarkerKind,
} from "@/features/map/presentation";
import { resolveApiAssetUrl } from "@/features/api-client";
import {
  fetchPlaces,
  fetchVoluntariados,
  type PlaceOption,
  type VolunteerMapItem,
} from "@/features/voluntariados/api";

type MapLayer = "voluntariados" | "lugares" | "flora-fauna";
type MapFeature =
  | { layer: "voluntariados"; data: VolunteerMapItem }
  | { layer: "lugares"; data: PlaceOption }
  | { layer: "flora-fauna"; data: SpeciesMapPoint };
type LayerStatus = { loading: boolean; error: string | null };
type LayerStatusMap = Record<MapLayer, LayerStatus>;

const LA_PAZ_REGION: Region = {
  latitude: 24.22,
  longitude: -110.32,
  latitudeDelta: 0.4,
  longitudeDelta: 0.2,
};

const LAYER_LABELS: Record<MapLayer, string> = {
  voluntariados: "Voluntariados",
  lugares: "Lugares",
  "flora-fauna": "Flora y fauna",
};

function featureCoordinates(feature: MapFeature) {
  return { latitude: feature.data.lat, longitude: feature.data.lng };
}

function featureTitle(feature: MapFeature): string {
  return feature.layer === "voluntariados" ? feature.data.titulo : feature.data.nombre;
}

function featureKind(feature: MapFeature): MapFeatureKind {
  if (feature.layer === "voluntariados") return "voluntariado";
  if (feature.layer === "lugares") return "lugar";
  return feature.data.tipo;
}

function featureMarkerKind(feature: MapFeature): MapMarkerKind {
  return feature.layer === "voluntariados" && feature.data.lleno ? "lleno" : featureKind(feature);
}

function featureDescription(feature: MapFeature): string | null {
  return feature.data.descripcion;
}

function featureImage(feature: MapFeature): string | null {
  if (feature.layer === "voluntariados") return feature.data.imagen;
  if (feature.layer === "lugares") return resolveApiAssetUrl(feature.data.imagen);
  return null;
}

function featureDetails(feature: MapFeature): string[] {
  if (feature.layer === "voluntariados") {
    const remaining = Math.max(0, feature.data.cupo - feature.data.inscripciones_activas);
    return [
      feature.data.categoria ? formatPlaceType(feature.data.categoria) : "Sin categoría",
      feature.data.fecha_inicio,
      feature.data.lugar_nombre,
      feature.data.lleno ? "Cupo lleno" : `${remaining} lugares disponibles`,
    ].filter((value): value is string => Boolean(value));
  }

  if (feature.layer === "lugares") {
    return [
      feature.data.tipo ? formatPlaceType(feature.data.tipo) : null,
      feature.data.municipio,
    ].filter((value): value is string => Boolean(value));
  }

  return [
    feature.data.nombreCientifico,
    feature.data.estadoConservacion
      ? `Conservación: ${formatPlaceType(feature.data.estadoConservacion)}`
      : null,
    feature.data.zonaAproximada
      ? `Ubicación aproximada${feature.data.radioMetros ? ` · radio ${feature.data.radioMetros} m` : ""}`
      : null,
  ].filter((value): value is string => Boolean(value));
}

function regionForFeatures(features: MapFeature[]): Region | null {
  if (features.length === 0) return null;

  let minLatitude = Number.POSITIVE_INFINITY;
  let maxLatitude = Number.NEGATIVE_INFINITY;
  let minLongitude = Number.POSITIVE_INFINITY;
  let maxLongitude = Number.NEGATIVE_INFINITY;
  for (const feature of features) {
    minLatitude = Math.min(minLatitude, feature.data.lat);
    maxLatitude = Math.max(maxLatitude, feature.data.lat);
    minLongitude = Math.min(minLongitude, feature.data.lng);
    maxLongitude = Math.max(maxLongitude, feature.data.lng);
  }

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta: Math.min(180, Math.max(0.1, (maxLatitude - minLatitude) * 1.4)),
    longitudeDelta: Math.min(360, Math.max(0.1, (maxLongitude - minLongitude) * 1.4)),
  };
}

function fallbackMarkerLabel(kind: MapMarkerKind): string {
  if (kind === "voluntariado") return "V";
  if (kind === "lleno") return "!";
  if (kind === "lugar") return "L";
  return kind === "flora" ? "F" : "Fa";
}

function MapMarkerIcon({ kind }: { kind: MapMarkerKind }) {
  const presentation = getMapMarkerPresentation(
    kind === "lleno" ? "voluntariado" : kind,
    kind === "lleno",
  );
  const [imageFailed, setImageFailed] = useState(false);
  const uri = resolveApiAssetUrl(`/img/simbolos/${presentation.symbol}.png`);

  return (
    <View style={[styles.markerIcon, { backgroundColor: presentation.color }]}>
      {uri && !imageFailed ? (
        <Image
          accessibilityLabel={presentation.label}
          onError={() => setImageFailed(true)}
          resizeMode="contain"
          source={{ uri }}
          style={styles.markerImage}
        />
      ) : (
        <Text style={styles.markerFallback}>{fallbackMarkerLabel(kind)}</Text>
      )}
    </View>
  );
}

export default function MapTabScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const scheme = colorScheme === "dark" ? "dark" : "light";
  const [region, setRegion] = useState<Region>(LA_PAZ_REGION);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [volunteers, setVolunteers] = useState<VolunteerMapItem[]>([]);
  const [places, setPlaces] = useState<PlaceOption[]>([]);
  const [species, setSpecies] = useState<SpeciesMapPoint[]>([]);
  const [layerStatus, setLayerStatus] = useState<LayerStatusMap>({
    voluntariados: { loading: true, error: null },
    lugares: { loading: true, error: null },
    "flora-fauna": { loading: true, error: null },
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [visibleLayers, setVisibleLayers] = useState<Record<MapLayer, boolean>>({
    voluntariados: true,
    lugares: true,
    "flora-fauna": true,
  });
  const [selectedFeature, setSelectedFeature] = useState<MapFeature | null>(null);
  const didFitInitialResults = useRef(false);
  const colors = Colors[scheme];

  const mapFeatures = useMemo<MapFeature[]>(() => [
    ...volunteers.map((data): MapFeature => ({ layer: "voluntariados", data })),
    ...places.map((data): MapFeature => ({ layer: "lugares", data })),
    ...species.map((data): MapFeature => ({ layer: "flora-fauna", data })),
  ], [places, species, volunteers]);
  const allLayersLoaded = Object.values(layerStatus).every((status) => !status.loading);
  const layerErrors = Object.entries(layerStatus)
    .filter(([, status]) => status.error)
    .map(([layer, status]) => `${LAYER_LABELS[layer as MapLayer]}: ${status.error}`);

  useEffect(() => {
    const controller = new AbortController();
    const loadLayer = async <T,>(
      layer: MapLayer,
      load: (signal: AbortSignal) => Promise<T[]>,
      onLoaded: (items: T[]) => void,
    ) => {
      setLayerStatus((current) => ({ ...current, [layer]: { loading: true, error: null } }));
      try {
        onLoaded(await load(controller.signal));
      } catch (cause) {
        if (!controller.signal.aborted) {
          setLayerStatus((current) => ({
            ...current,
            [layer]: {
              loading: false,
              error: cause instanceof Error ? cause.message : "No se pudo cargar esta capa.",
            },
          }));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLayerStatus((current) => ({
            ...current,
            [layer]: { ...current[layer], loading: false },
          }));
        }
      }
    };

    void Promise.all([
      loadLayer("voluntariados", (signal) => fetchVoluntariados({}, signal), setVolunteers),
      loadLayer("lugares", fetchPlaces, setPlaces),
      loadLayer("flora-fauna", fetchSpeciesMapPoints, setSpecies),
    ]);

    return () => controller.abort();
  }, [refreshKey]);

  useEffect(() => {
    if (
      !permissionChecked
      || hasLocationPermission
      || !allLayersLoaded
      || didFitInitialResults.current
    ) {
      return;
    }

    const initialRegion = regionForFeatures(mapFeatures);
    if (initialRegion) {
      setRegion(initialRegion);
      didFitInitialResults.current = true;
    }
  }, [allLayersLoaded, hasLocationPermission, mapFeatures, permissionChecked]);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (!isMounted) return;

        setPermissionChecked(true);
        setHasLocationPermission(permission.granted);
        setCanAskAgain(permission.canAskAgain);

        if (permission.granted) {
          setIsLocationLoading(true);
          const currentLocation = await Location.getCurrentPositionAsync({});
          if (!isMounted) return;
          setRegion({
            ...LA_PAZ_REGION,
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          });
        }
      } catch {
        if (isMounted) {
          setPermissionChecked(true);
          setLocationError("No pudimos obtener tu ubicación. El mapa sigue disponible.");
        }
      } finally {
        if (isMounted) setIsLocationLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const centerOnUser = async () => {
    setIsLocationLoading(true);
    setLocationError(null);

    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted) {
        setPermissionChecked(true);
        setCanAskAgain(permission.canAskAgain);

        if (!permission.canAskAgain && Platform.OS !== "web") {
          await Linking.openSettings();
          return;
        }

        permission = await Location.requestForegroundPermissionsAsync();
      }

      setPermissionChecked(true);
      setHasLocationPermission(permission.granted);
      setCanAskAgain(permission.canAskAgain);

      if (!permission.granted) {
        setLocationError("Sin permiso de ubicación, puedes seguir explorando el mapa.");
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setRegion({
        ...LA_PAZ_REGION,
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      });
    } catch {
      setLocationError("No pudimos obtener tu ubicación. Inténtalo de nuevo.");
    } finally {
      setIsLocationLoading(false);
    }
  };

  const toggleLayer = (layer: MapLayer) => {
    setVisibleLayers((current) => ({ ...current, [layer]: !current[layer] }));
    if (selectedFeature?.layer === layer) setSelectedFeature(null);
  };

  const showAllResults = () => {
    const resultsRegion = regionForFeatures(mapFeatures);
    if (resultsRegion) setRegion(resultsRegion);
  };

  const openFeatureDetail = (feature: MapFeature) => {
    if (feature.layer === "voluntariados") {
      router.push(`/voluntariados/${feature.data.id}`);
    } else if (feature.layer === "flora-fauna") {
      router.push({ pathname: "/flora-fauna/[id]", params: { id: feature.data.id } });
    }
  };

  const mapContent = (
    <MapView
      style={styles.map}
      region={region}
      onRegionChangeComplete={setRegion}
      showsUserLocation={hasLocationPermission}
      showsMyLocationButton={false}
      userInterfaceStyle={scheme}
    >
      {mapFeatures.filter((feature) => visibleLayers[feature.layer]).map((feature) => {
        const coordinate = featureCoordinates(feature);
        const markerKind = featureMarkerKind(feature);

        return (
          <Fragment key={`${feature.layer}:${feature.data.id}`}>
            {feature.layer === "flora-fauna"
              && feature.data.zonaAproximada
              && feature.data.radioMetros
              && feature.data.radioMetros > 0 && (
                <Circle
                  center={coordinate}
                  fillColor="rgba(163, 64, 53, 0.18)"
                  radius={feature.data.radioMetros}
                  strokeColor="#A34035"
                  strokeWidth={2}
                />
              )}
            <Marker
              coordinate={coordinate}
              onPress={() => setSelectedFeature(feature)}
            >
              <MapMarkerIcon kind={markerKind} />
            </Marker>
          </Fragment>
        );
      })}
    </MapView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {Platform.OS === "web" ? (
        <ScrollView contentContainerStyle={styles.webFallback}>
          <Text style={[styles.title, { color: colors.text }]}>Mapa de Regenera</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Vista de prueba web: abre cada registro en OpenStreetMap. El mapa interactivo está disponible en iPhone y Android.
          </Text>
          {(["voluntariados", "lugares", "flora-fauna"] as MapLayer[]).map((layer) => {
            const features = mapFeatures.filter((feature) => feature.layer === layer);
            if (!visibleLayers[layer]) return null;

            return (
              <View key={layer} style={styles.webLayer}>
                <Text style={[styles.webLayerTitle, { color: colors.text }]}>{LAYER_LABELS[layer]}</Text>
                {features.map((feature) => {
                  const presentation = getMapMarkerPresentation(
                    featureKind(feature),
                    feature.layer === "voluntariados" && feature.data.lleno,
                  );
                  return (
                    <View key={`${feature.layer}:${feature.data.id}`} style={[styles.webPlace, { backgroundColor: colors.backgroundElement }]}>
                      <View style={styles.webFeatureHeader}>
                        <Text style={[styles.webFeatureSymbol, { color: presentation.color }]}>●</Text>
                        <Text style={[styles.placeTitle, { color: colors.text }]}>{featureTitle(feature)}</Text>
                      </View>
                      {featureDetails(feature).map((line) => (
                        <Text key={line} style={[styles.placeSubtitle, { color: colors.textSecondary }]}>{line}</Text>
                      ))}
                      {featureDescription(feature) && (
                        <Text style={[styles.placeSubtitle, { color: colors.textSecondary }]} numberOfLines={3}>
                          {featureDescription(feature)}
                        </Text>
                      )}
                      <Pressable
                        accessibilityRole="link"
                        onPress={() => {
                          const { latitude, longitude } = featureCoordinates(feature);
                          void Linking.openURL(openStreetMapUrl(latitude, longitude));
                        }}
                      >
                        <Text style={styles.webMapLinkText}>Abrir en OpenStreetMap →</Text>
                      </Pressable>
                      {feature.layer !== "lugares" && (
                        <Pressable accessibilityRole="button" onPress={() => openFeatureDetail(feature)}>
                          <Text style={styles.webMapLinkText}>
                            {feature.layer === "voluntariados" ? "Ver voluntariado →" : "Ver especie →"}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
          {allLayersLoaded && mapFeatures.length === 0 && layerErrors.length === 0 && (
            <Text style={[styles.body, { color: colors.textSecondary }]}>No hay registros con ubicación para mostrar.</Text>
          )}
        </ScrollView>
      ) : (
        mapContent
      )}

      <View
        style={[
          styles.header,
          { top: insets.top + 12, backgroundColor: colors.backgroundElement },
        ]}
      >
        <Text style={styles.eyebrow}>REGENERA · BAJA CALIFORNIA SUR</Text>
        <Text style={[styles.title, { color: colors.text }]}>Explora el mapa</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Voluntariados, lugares y flora/fauna registrados en BCS
        </Text>
      </View>

      <View style={[styles.dataNotice, { top: insets.top + 134, backgroundColor: colors.backgroundElement }]}>
        <ScrollView
          horizontal
          contentContainerStyle={styles.layerControls}
          showsHorizontalScrollIndicator={false}
        >
          {(["voluntariados", "lugares", "flora-fauna"] as MapLayer[]).map((layer) => {
            const count = layer === "voluntariados"
              ? volunteers.length
              : layer === "lugares"
                ? places.length
                : species.length;
            const selected = visibleLayers[layer];
            const loading = layerStatus[layer].loading;
            return (
              <Pressable
                key={layer}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                onPress={() => toggleLayer(layer)}
                style={[
                  styles.layerButton,
                  { backgroundColor: selected ? "#164F3D" : colors.background },
                ]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={selected ? "#FFFFFF" : "#164F3D"} />
                ) : (
                  <Text style={[styles.layerCount, { color: selected ? "#FFFFFF" : colors.text }]}>
                    {count}
                  </Text>
                )}
                <Text style={[styles.layerLabel, { color: selected ? "#FFFFFF" : colors.text }]}>
                  {LAYER_LABELS[layer]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.layerActions}>
          {!!layerErrors.length && (
            <>
              <Text numberOfLines={2} style={[styles.noticeError, { flex: 1 }]}>
                {layerErrors[0]}
              </Text>
              <Pressable accessibilityRole="button" onPress={() => setRefreshKey((key) => key + 1)}>
                <Text style={styles.retryText}>Reintentar</Text>
              </Pressable>
            </>
          )}
          {!layerErrors.length && allLayersLoaded && mapFeatures.length === 0 && (
            <Text style={[styles.demoText, { color: colors.textSecondary }]}>
              No hay registros con ubicación disponibles.
            </Text>
          )}
          {mapFeatures.length > 0 && (
            <Pressable accessibilityRole="button" onPress={showAllResults}>
              <Text style={styles.retryText}>Ver todos</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        style={[styles.legend, { top: insets.top + 221, backgroundColor: colors.backgroundElement }]}
        contentContainerStyle={styles.legendContent}
        showsHorizontalScrollIndicator={false}
      >
        {MAP_LEGEND.map(({ kind, label }) => {
          const presentation = getMapMarkerPresentation(kind === "lleno" ? "voluntariado" : kind, kind === "lleno");
          const uri = resolveApiAssetUrl(`/img/simbolos/${presentation.symbol}.png`);
          return (
            <View key={kind} accessibilityLabel={label} style={styles.legendItem}>
              {uri ? (
                <Image source={{ uri }} resizeMode="contain" style={styles.legendIcon} />
              ) : (
                <Text style={[styles.legendFallback, { color: presentation.color }]}>●</Text>
              )}
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>{label}</Text>
            </View>
          );
        })}
      </ScrollView>

      {selectedFeature && (
        <View
          style={[
            styles.placeCard,
            { bottom: insets.bottom + 24, backgroundColor: colors.backgroundElement },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar detalles del registro"
            onPress={() => setSelectedFeature(null)}
            style={styles.closePlace}
          >
            <Text style={[styles.closePlaceText, { color: colors.textSecondary }]}>×</Text>
          </Pressable>
          {featureImage(selectedFeature) && (
            <Image source={{ uri: featureImage(selectedFeature) ?? undefined }} style={styles.placeImage} />
          )}
          <Text style={styles.placeType}>
            {getMapMarkerPresentation(
              featureKind(selectedFeature),
              selectedFeature.layer === "voluntariados" && selectedFeature.data.lleno,
            ).label.toLocaleUpperCase("es-MX")}
          </Text>
          <Text numberOfLines={2} style={[styles.placeTitle, { color: colors.text }]}>
            {featureTitle(selectedFeature)}
          </Text>
          {featureDetails(selectedFeature).map((line) => (
            <Text key={line} style={[styles.placeSubtitle, { color: colors.textSecondary }]}>{line}</Text>
          ))}
          {featureDescription(selectedFeature) && (
            <Text numberOfLines={3} style={[styles.placeDescription, { color: colors.textSecondary }]}>
              {featureDescription(selectedFeature)}
            </Text>
          )}
          {selectedFeature.layer !== "lugares" && (
            <Pressable
              accessibilityRole="button"
              onPress={() => openFeatureDetail(selectedFeature)}
              style={styles.detailButton}
            >
              <Text style={styles.detailButtonText}>
                {selectedFeature.layer === "voluntariados" ? "Ver voluntariado" : "Ver especie"}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {Platform.OS !== "web" && permissionChecked && (!hasLocationPermission || locationError) && (
        <View
          style={[
            styles.permissionCard,
            {
              bottom: insets.bottom + (selectedFeature ? 320 : 86),
              backgroundColor: colors.backgroundElement,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {hasLocationPermission ? "Ubicación no disponible" : "Explora desde tu zona"}
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {locationError ??
              "Activa tu ubicación para centrar el mapa. También puedes seguir explorando sin compartirla."}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              hasLocationPermission
                ? "Volver a intentar obtener ubicación"
                : canAskAgain
                  ? "Permitir acceso a ubicación"
                  : "Abrir ajustes de ubicación"
            }
            disabled={isLocationLoading}
            onPress={centerOnUser}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
              isLocationLoading && styles.disabled,
            ]}
          >
            {isLocationLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {hasLocationPermission
                  ? "Intentar de nuevo"
                  : canAskAgain
                    ? "Activar mi ubicación"
                    : "Abrir ajustes"}
              </Text>
            )}
          </Pressable>
        </View>
      )}

      {Platform.OS !== "web" && permissionChecked && hasLocationPermission && !locationError && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Centrar mapa en mi ubicación"
          disabled={isLocationLoading}
          onPress={centerOnUser}
          style={({ pressed }) => [
            styles.locationButton,
            {
              bottom: insets.bottom + (selectedFeature ? 320 : 96),
              backgroundColor: colors.backgroundElement,
            },
            pressed && styles.pressed,
          ]}
        >
          {isLocationLoading ? (
            <ActivityIndicator color="#164F3D" />
          ) : (
            <Text style={styles.locationButtonText}>Mi ubicación</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

function formatPlaceType(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase("es-MX") + word.slice(1))
    .join(" ");
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  header: {
    position: "absolute",
    left: 16,
    right: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 22,
    shadowColor: "#102319",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  eyebrow: {
    color: "#164F3D",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  title: {
    fontSize: 23,
    fontWeight: "700",
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  dataNotice: {
    position: "absolute",
    left: 16,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    shadowColor: "#102319",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  layerControls: {
    alignItems: "center",
    gap: 7,
  },
  layerButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  layerCount: {
    fontSize: 12,
    fontWeight: "800",
  },
  layerLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  layerActions: {
    minHeight: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 4,
    paddingTop: 5,
  },
  demoText: {
    fontSize: 12,
    fontWeight: "600",
  },
  noticeError: {
    color: "#A14537",
    fontSize: 11,
    fontWeight: "600",
  },
  retryText: {
    color: "#164F3D",
    fontSize: 12,
    fontWeight: "700",
  },
  legend: {
    position: "absolute",
    left: 16,
    right: 16,
    maxHeight: 44,
    borderRadius: 12,
    elevation: 2,
  },
  legendContent: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendIcon: {
    width: 19,
    height: 19,
  },
  legendFallback: {
    fontSize: 16,
    fontWeight: "900",
  },
  legendText: {
    fontSize: 10,
    fontWeight: "600",
  },
  markerIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    borderRadius: 18,
    shadowColor: "#102319",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  markerImage: {
    width: 24,
    height: 24,
  },
  markerFallback: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  permissionCard: {
    position: "absolute",
    left: 16,
    right: 16,
    padding: 18,
    borderRadius: 20,
    shadowColor: "#102319",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  primaryButton: {
    minHeight: 46,
    marginTop: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#164F3D",
    borderRadius: 14,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  locationButton: {
    position: "absolute",
    right: 16,
    minWidth: 130,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 23,
    shadowColor: "#102319",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  locationButtonText: {
    color: "#164F3D",
    fontSize: 14,
    fontWeight: "700",
  },
  placeCard: {
    position: "absolute",
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 20,
    shadowColor: "#102319",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 7,
  },
  closePlace: {
    position: "absolute",
    right: 10,
    top: 8,
    zIndex: 1,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  closePlaceText: {
    fontSize: 26,
    lineHeight: 30,
  },
  placeImage: {
    width: "100%",
    height: 110,
    borderRadius: 12,
    marginBottom: 10,
  },
  placeType: {
    color: "#164F3D",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  placeTitle: {
    fontSize: 17,
    fontWeight: "800",
    paddingRight: 28,
    marginTop: 3,
  },
  placeSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  placeDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  detailButton: {
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    paddingHorizontal: 12,
    backgroundColor: "#164F3D",
    borderRadius: 12,
  },
  detailButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  webFallback: {
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 270,
    paddingBottom: 24,
  },
  webLayer: {
    gap: 10,
  },
  webLayerTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  webPlace: {
    padding: 14,
    borderRadius: 14,
    gap: 4,
  },
  webFeatureHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  webFeatureSymbol: {
    fontSize: 16,
    fontWeight: "900",
  },
  webMapLinkText: {
    color: "#164F3D",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.65,
  },
});

function openStreetMapUrl(latitude: number, longitude: number): string {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`;
}
