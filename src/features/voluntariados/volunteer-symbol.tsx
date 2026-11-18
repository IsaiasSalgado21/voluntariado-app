import { Image } from "expo-image";

const SYMBOLS = {
  calendario: require("@/assets/images/simbolos/calendario.png"),
  reloj: require("@/assets/images/simbolos/reloj.png"),
  ubicacion: require("@/assets/images/simbolos/ubicacion.png"),
  participantes: require("@/assets/images/simbolos/participantes.png"),
  confirmado: require("@/assets/images/simbolos/confirmado.png"),
  mochila: require("@/assets/images/simbolos/mochila.png"),
  voluntariado: require("@/assets/images/simbolos/voluntariado.png"),
  guantes: require("@/assets/images/simbolos/guantes.png"),
  "bloqueador-solar": require("@/assets/images/simbolos/bloqueador-solar.png"),
  agua: require("@/assets/images/simbolos/agua.png"),
  gorra: require("@/assets/images/simbolos/gorra.png"),
  "bolsa-residuos": require("@/assets/images/simbolos/bolsa-residuos.png"),
  calzado: require("@/assets/images/simbolos/calzado.png"),
  pendiente: require("@/assets/images/simbolos/pendiente.png"),
  cancelado: require("@/assets/images/simbolos/cancelado.png"),
} as const;

export type VolunteerSymbolName = keyof typeof SYMBOLS;

export function VolunteerSymbol({
  name,
  size = 22,
}: {
  name: VolunteerSymbolName;
  size?: number;
}) {
  return (
    <Image
      accessibilityElementsHidden
      importantForAccessibility="no"
      source={SYMBOLS[name]}
      contentFit="contain"
      style={{ width: size, height: size }}
    />
  );
}
