import type { ReactNode } from "react";
import type { MapViewProps, MarkerProps } from "./map-view.types";
export type { Region } from "./map-view.types";

export default function MapView(_props: MapViewProps) {
  return null;
}

export function Marker(_props: MarkerProps) {
  return null;
}

export function Callout({ children }: { children?: ReactNode }) {
  return children ?? null;
}
