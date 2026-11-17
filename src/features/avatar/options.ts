import { AVATAR_KEYS, DEFAULT_AVATAR_STATE, type AvatarConfig, type AvatarKey } from "./renderer.ts";

export type AvatarOptionGroup = {
  category: AvatarKey;
  title: string;
  options: readonly (readonly [value: string, label: string])[];
};

// Same groups, values and labels as the web editor (avatar-creator.js).
export const AVATAR_OPTION_GROUPS: readonly AvatarOptionGroup[] = [
  { category: "skin", title: "Tono de piel", options: [["light", "Claro"], ["medium", "Medio"], ["dark", "Oscuro"]] },
  { category: "hairColor", title: "Color de cabello", options: [["black", "Negro"], ["brown", "Castaño"], ["blonde", "Rubio"]] },
  { category: "hairStyle", title: "Peinado", options: [["short", "Corto"], ["long", "Largo"], ["bob", "Bob"], ["curly", "Rizado"]] },
  { category: "eyeStyle", title: "Ojos", options: [["round", "Redondos"], ["happy", "Felices"], ["star", "Estrella"]] },
  { category: "eyebrowStyle", title: "Cejas", options: [["natural", "Naturales"], ["straight", "Rectas"], ["arched", "Arqueadas"], ["thick", "Gruesas"]] },
  { category: "noseStyle", title: "Nariz", options: [["small", "Pequeña"], ["triangle", "Triangular"], ["soft", "Suave"], ["none", "Sin nariz"]] },
  { category: "headShape", title: "Forma de cabeza", options: [["round", "Redonda"], ["oval", "Ovalada"], ["wide", "Ancha"], ["square", "Suave"]] },
  { category: "earStyle", title: "Orejas", options: [["normal", "Normales"], ["large", "Grandes"], ["elf", "Puntiagudas"], ["small", "Discretas"]] },
  { category: "bodyType", title: "Proporciones", options: [["classic", "Clásicas"], ["round", "Redonditas"], ["slim", "Delgadas"], ["robust", "Robustas"]] },
  { category: "outfit", title: "Ropa", options: [["green", "Regenera"], ["white", "Blanca"], ["pink", "Rosa"], ["blue", "Azul"]] },
  {
    category: "accessory",
    title: "Accesorios",
    options: [
      ["none", "Ninguno"],
      ["sunglasses", "Lentes"],
      ["hat", "Gorra exploradora"],
      ["mangrove-leaf", "Insignia de manglar"],
      ["recycling-badge", "Insignia circular"],
      ["organizer-vest", "Chaleco de organizador"],
    ],
  },
];

// Accessory value -> [required medal slug, medal name].
export const AVATAR_REWARD_REQUIREMENTS: Record<string, readonly [slug: string, name: string]> = {
  hat: ["voluntario-seguro", "Voluntario Seguro"],
  "mangrove-leaf": ["guardian-manglar", "Guardián del Manglar"],
  "recycling-badge": ["agente-circular", "Agente Circular"],
  "organizer-vest": ["lider-responsable", "Líder Responsable"],
};

export function isAccessoryLocked(accessory: string, earnedMedals: ReadonlySet<string>): boolean {
  const requirement = AVATAR_REWARD_REQUIREMENTS[accessory];
  return requirement !== undefined && !earnedMedals.has(requirement[0]);
}

// Keeps only known keys/values; a locked reward accessory falls back to the default.
export function normalizeAvatarConfig(
  value: Record<string, string> | null | undefined,
  earnedMedals: ReadonlySet<string> = new Set(),
): AvatarConfig {
  const result: AvatarConfig = { ...DEFAULT_AVATAR_STATE };
  for (const key of AVATAR_KEYS) {
    const candidate = value?.[key];
    const group = AVATAR_OPTION_GROUPS.find((item) => item.category === key);
    if (candidate && group?.options.some(([option]) => option === candidate)) result[key] = candidate;
  }
  if (isAccessoryLocked(result.accessory, earnedMedals)) result.accessory = DEFAULT_AVATAR_STATE.accessory;
  return result;
}
