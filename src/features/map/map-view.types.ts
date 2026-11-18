import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type MapViewProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  region?: Region;
  initialRegion?: Region;
  onRegionChangeComplete?: (region: Region) => void;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  userInterfaceStyle?: "light" | "dark";
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  rotateEnabled?: boolean;
  pitchEnabled?: boolean;
};

export type MarkerProps = {
  children?: ReactNode;
  coordinate: { latitude: number; longitude: number };
  pinColor?: string;
  onPress?: () => void;
  title?: string;
  description?: string;
};

export type CircleProps = {
  center: { latitude: number; longitude: number };
  radius: number;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
};
