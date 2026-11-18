export type MapMarkerKind = "voluntariado" | "lleno" | "lugar" | "flora" | "fauna";
export type MapFeatureKind = Exclude<MapMarkerKind, "lleno">;

export type MapMarkerPresentation = {
  symbol: string;
  label: string;
  color: string;
};

const MARKERS: Record<MapMarkerKind, MapMarkerPresentation> = {
  voluntariado: { symbol: "voluntariado", label: "Voluntariado disponible", color: "#7251A3" },
  lleno: { symbol: "cancelado", label: "Voluntariado lleno", color: "#A33A32" },
  lugar: { symbol: "ubicacion", label: "Lugar", color: "#B26A12" },
  flora: { symbol: "flora", label: "Flora", color: "#3B7C42" },
  fauna: { symbol: "fauna", label: "Fauna", color: "#24749A" },
};

export const MAP_LEGEND: Array<{ kind: MapMarkerKind; label: string }> = [
  { kind: "voluntariado", label: MARKERS.voluntariado.label },
  { kind: "lleno", label: MARKERS.lleno.label },
  { kind: "lugar", label: MARKERS.lugar.label },
  { kind: "flora", label: MARKERS.flora.label },
  { kind: "fauna", label: MARKERS.fauna.label },
];

export function getMapMarkerPresentation(
  kind: MapFeatureKind,
  isFull = false,
): MapMarkerPresentation {
  return MARKERS[kind === "voluntariado" && isFull ? "lleno" : kind];
}
