const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Hermes may not expose atob/Uint8Array.fromBase64 everywhere, so decode manually.
export function base64ToBytes(input: string): Uint8Array {
  const clean = input.replace(/^data:[^,]*,/, "").replace(/[\s=]+/g, "");
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let index = 0;
  for (const char of clean) {
    const value = ALPHABET.indexOf(char);
    if (value < 0) throw new Error("Imagen del avatar inválida.");
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[index++] = (buffer >> bits) & 0xff;
    }
  }
  return bytes.subarray(0, index);
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
export const MAX_AVATAR_BYTES = 1024 * 1024;

// The API accepts PNG files up to 1 MB only.
export function assertAvatarPng(bytes: Uint8Array): void {
  if (!PNG_SIGNATURE.every((byte, position) => bytes[position] === byte)) {
    throw new Error("No se pudo generar una imagen PNG válida del avatar.");
  }
  if (bytes.byteLength > MAX_AVATAR_BYTES) {
    throw new Error("La imagen del avatar supera 1 MB.");
  }
}
