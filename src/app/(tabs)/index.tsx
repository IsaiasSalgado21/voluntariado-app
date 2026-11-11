import * as Location from "expo-location";
import { useEffect, useState } from "react";
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
import MapView, { Callout, Marker, type Region } from "@/features/map/map-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { fetchPlaces, type PlaceOption } from "@/features/voluntariados/api";

const LA_PAZ_REGION: Region = {
  latitude: 24.22,
  longitude: -110.32,
  latitudeDelta: 0.4,
  longitudeDelta: 0.2,
};

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
  const [places, setPlaces] = useState<PlaceOption[]>([]);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [placesRefreshKey, setPlacesRefreshKey] = useState(0);
  const [selectedPlace, setSelectedPlace] = useState<PlaceOption | null>(null);
  const colors = Colors[scheme];

  useEffect(() => {
    const controller = new AbortController();
    setPlacesLoading(true);
    setPlacesError(null);

    fetchPlaces(controller.signal)
      .then(setPlaces)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setPlacesError(cause instanceof Error ? cause.message : "No se pudieron cargar los lugares.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setPlacesLoading(false);
      });

    return () => controller.abort();
  }, [placesRefreshKey]);

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

  const mapContent = (
    <MapView
      style={styles.map}
      region={region}
      onRegionChangeComplete={setRegion}
      showsUserLocation={hasLocationPermission}
      showsMyLocationButton={false}
      userInterfaceStyle={scheme}
    >
      {places.map((place) => (
        <Marker
          key={place.id}
          coordinate={{ latitude: place.lat, longitude: place.lng }}
          pinColor={place.tipo === "parque" ? "#286447" : "#167D8D"}
          onPress={() => setSelectedPlace(place)}
        >
          <Callout>
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>{place.nombre}</Text>
              {place.tipo && <Text style={styles.calloutSubtitle}>{formatPlaceType(place.tipo)}</Text>}
              {place.municipio && <Text style={styles.calloutSubtitle}>{place.municipio}</Text>}
              {place.descripcion && <Text>{place.descripcion}</Text>}
            </View>
          </Callout>
        </Marker>
      ))}
    </MapView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {Platform.OS === "web" ? (
        <ScrollView contentContainerStyle={styles.webFallback}>
          <Text style={[styles.title, { color: colors.text }]}>Mapa de Regenera</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Vista de prueba web: abre cada lugar en OpenStreetMap. El mapa interactivo está disponible en iPhone y Android.
          </Text>
          {places.map((place) => (
            <Pressable
              key={place.id}
              accessibilityRole="link"
              onPress={() => Linking.openURL(openStreetMapUrl(place.lat, place.lng))}
              style={[styles.webPlace, { backgroundColor: colors.backgroundElement }]}
            >
              <Text style={[styles.placeTitle, { color: colors.text }]}>{place.nombre}</Text>
              {!!place.municipio && (
                <Text style={[styles.placeSubtitle, { color: colors.textSecondary }]}>{place.municipio}</Text>
              )}
              <Text style={styles.webMapLinkText}>Abrir en OpenStreetMap →</Text>
            </Pressable>
          ))}
          {!placesLoading && !placesError && places.length === 0 && (
            <Text style={[styles.body, { color: colors.textSecondary }]}>No hay lugares disponibles para mostrar.</Text>
          )}
        </ScrollView>
      ) : (
        mapContent
      )}

      <View
        style={[
          styles.header,
          {
            top: insets.top + 12,
            backgroundColor: colors.backgroundElement,
          },
        ]}
      >
        <Text style={styles.eyebrow}>REGENERA · BAJA CALIFORNIA SUR</Text>
        <Text style={[styles.title, { color: colors.text }]}>Explora el mapa</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Espacios y lugares registrados en Baja California Sur
        </Text>
      </View>

      <View
        style={[
          styles.dataNotice,
          {
            top: insets.top + 134,
            backgroundColor: colors.backgroundElement,
          },
        ]}
      >
        {placesLoading ? (
          <>
            <ActivityIndicator size="small" color="#164F3D" />
            <Text style={[styles.demoText, { color: colors.textSecondary }]}>Cargando lugares…</Text>
          </>
        ) : placesError ? (
          <>
            <Text style={styles.errorDot}>●</Text>
            <Text style={[styles.demoText, styles.noticeError]}>{placesError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setPlacesRefreshKey((key) => key + 1)}
            >
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.demoDot}>●</Text>
            <Text style={[styles.demoText, { color: colors.textSecondary }]}>
              {places.length} {places.length === 1 ? "lugar público" : "lugares públicos"}
            </Text>
          </>
        )}
      </View>

      {selectedPlace && (
        <View
          style={[
            styles.placeCard,
            { bottom: insets.bottom + 24, backgroundColor: colors.backgroundElement },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar detalles del lugar"
            onPress={() => setSelectedPlace(null)}
            style={styles.closePlace}
          >
            <Text style={[styles.closePlaceText, { color: colors.textSecondary }]}>×</Text>
          </Pressable>
          {selectedPlace.imagen && (
            <Image source={{ uri: selectedPlace.imagen }} style={styles.placeImage} />
          )}
          <Text style={styles.placeType}>
            {selectedPlace.tipo ? formatPlaceType(selectedPlace.tipo).toLocaleUpperCase("es-MX") : "LUGAR"}
          </Text>
          <Text style={[styles.placeTitle, { color: colors.text }]}>{selectedPlace.nombre}</Text>
          {selectedPlace.municipio && (
            <Text style={[styles.placeSubtitle, { color: colors.textSecondary }]}>
              {selectedPlace.municipio}
            </Text>
          )}
          {selectedPlace.descripcion && (
            <Text numberOfLines={3} style={[styles.placeDescription, { color: colors.textSecondary }]}>
              {selectedPlace.descripcion}
            </Text>
          )}
        </View>
      )}

      {Platform.OS !== "web" && permissionChecked && (!hasLocationPermission || locationError) && (
        <View
          style={[
            styles.permissionCard,
            {
              bottom: insets.bottom + (selectedPlace ? 220 : 86),
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
              bottom: insets.bottom + (selectedPlace ? 220 : 96),
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: "#102319",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  demoDot: {
    color: "#C58B2A",
    fontSize: 10,
    marginRight: 8,
  },
  demoText: {
    fontSize: 12,
    fontWeight: "600",
  },
  errorDot: {
    color: "#A14537",
    fontSize: 10,
    marginRight: 8,
  },
  noticeError: {
    color: "#A14537",
    flex: 1,
  },
  retryText: {
    color: "#164F3D",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 8,
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
  callout: {
    padding: 8,
    maxWidth: 220,
  },
  calloutTitle: {
    fontWeight: "700",
    marginBottom: 2,
  },
  calloutSubtitle: {
    color: "#4F6357",
    fontSize: 12,
    marginBottom: 2,
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
  webFallback: {
    flex: 1,
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 196,
    paddingBottom: 24,
  },
  webPlace: {
    padding: 14,
    borderRadius: 14,
    gap: 4,
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
