import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export function VolunteerPhoto({
  uri,
  title,
  variant,
}: {
  uri: string | null;
  title: string;
  variant: "card" | "detail";
}) {
  const [failed, setFailed] = useState(false);
  const imageStyle = variant === "detail" ? styles.detailImage : styles.cardImage;
  if (!uri || failed) {
    return (
      <View style={[imageStyle, styles.placeholder]}>
        <Text style={styles.placeholderText}>
          {failed ? "No se pudo cargar la imagen" : "Imagen no disponible"}
        </Text>
      </View>
    );
  }

  return (
    <Image
      accessibilityLabel={`Imagen de ${title}`}
      source={{ uri }}
      contentFit="cover"
      style={imageStyle}
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  cardImage: { width: "100%", height: 170, borderRadius: 13, backgroundColor: "#E8ECE7" },
  detailImage: { width: "100%", height: 230, backgroundColor: "#E8ECE7" },
  placeholder: { alignItems: "center", justifyContent: "center" },
  placeholderText: { color: "#61746A", fontSize: 13, fontWeight: "600" },
});
