import { router } from "expo-router";
import { File, Paths } from "expo-file-system";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";
import type Svg from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { ApiRequestError } from "@/features/api-client";
import { uploadAvatar } from "@/features/auth/account-api";
import { useSession } from "@/features/auth/use-session";
import {
  AVATAR_OPTION_GROUPS,
  AVATAR_REWARD_REQUIREMENTS,
  isAccessoryLocked,
  normalizeAvatarConfig,
} from "@/features/avatar/options";
import { assertAvatarPng, base64ToBytes } from "@/features/avatar/png";
import { renderAvatarMarkup, type AvatarConfig } from "@/features/avatar/renderer";
import { fetchEarnedMedalSlugs } from "@/features/gamificacion/progreso";

const EXPORT_SIZE = 512;

export default function AvatarEditorScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const scheme = Colors.dark.background === theme.background ? "dark" : "light";
  const colors = Colors[scheme];
  const { status, token, user, refreshProfile } = useSession();
  const svgRef = useRef<Svg | null>(null);
  const [earned, setEarned] = useState<ReadonlySet<string>>(new Set());
  const [medalsError, setMedalsError] = useState<string | null>(null);
  const [config, setConfig] = useState<AvatarConfig>(() => normalizeAvatarConfig(user?.avatarConfig));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    fetchEarnedMedalSlugs(token, controller.signal)
      .then((slugs) => setEarned(new Set(slugs)))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setMedalsError(cause instanceof Error ? cause.message : "No se pudieron cargar tus medallas.");
      });
    return () => controller.abort();
  }, [token]);

  const markup = useMemo(() => renderAvatarMarkup(config), [config]);

  const exportPng = () =>
    new Promise<string>((resolve, reject) => {
      const svg = svgRef.current;
      if (!svg) {
        reject(new Error("No se pudo preparar la imagen del avatar."));
        return;
      }
      svg.toDataURL((data: string) => resolve(data), { width: EXPORT_SIZE, height: EXPORT_SIZE });
    });

  const save = async () => {
    if (!token) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const bytes = base64ToBytes(await exportPng());
      assertAvatarPng(bytes);
      const file = new File(Paths.cache, `avatar-${Date.now()}.png`);
      file.create({ overwrite: true });
      file.write(bytes);
      try {
        await uploadAvatar(token, config, { uri: file.uri, name: "avatar.png", type: "image/png" });
      } finally {
        if (file.exists) file.delete();
      }
      await refreshProfile();
      setNotice("Tu avatar quedó guardado.");
    } catch (cause) {
      const detail = cause instanceof ApiRequestError
        ? Object.values(cause.fieldErrors)[0]
        : undefined;
      setError(detail ?? (cause instanceof Error ? cause.message : "No se pudo guardar el avatar."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver a mi perfil"
        onPress={() => router.canGoBack() ? router.back() : router.replace("/perfil")}
        style={styles.backButton}
      >
        <Text style={styles.backText}>‹  Mi perfil</Text>
      </Pressable>
      <Text style={styles.eyebrow}>REGENERA · TU CUENTA</Text>
      <Text style={[styles.title, { color: colors.text }]}>Mi personaje</Text>

      {Platform.OS === "web" ? (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          El editor de avatar está disponible en la app móvil (Android o iOS).
        </Text>
      ) : (
        <>
          <View style={[styles.preview, { backgroundColor: colors.backgroundElement }]}>
            <SvgXml xml={markup} override={{ ref: svgRef, width: 220, height: 220 }} />
          </View>

          {!!medalsError && (
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {medalsError} Los accesorios de recompensa permanecerán bloqueados.
            </Text>
          )}

          {AVATAR_OPTION_GROUPS.map((group) => (
            <View key={group.category} style={styles.group}>
              <Text style={[styles.groupTitle, { color: colors.text }]}>{group.title}</Text>
              <View style={styles.options}>
                {group.options.map(([value, label]) => {
                  const locked = group.category === "accessory" && isAccessoryLocked(value, earned);
                  const selected = config[group.category] === value;
                  return (
                    <Pressable
                      key={value}
                      accessibilityRole="radio"
                      accessibilityState={{ selected, disabled: locked }}
                      disabled={locked}
                      onPress={() => setConfig((current) => ({ ...current, [group.category]: value }))}
                      style={[
                        styles.option,
                        { backgroundColor: selected ? "#164F3D" : colors.backgroundElement },
                        locked && styles.locked,
                      ]}
                    >
                      <Text style={{ color: selected ? "#FFFFFF" : colors.text, fontWeight: "700", fontSize: 13 }}>
                        {label}
                      </Text>
                      {locked && (
                        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                          Se desbloquea con {AVATAR_REWARD_REQUIREMENTS[value][1]}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          {!!error && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}
          {!!notice && <Text style={styles.noticeText}>{notice}</Text>}

          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={save}
            style={[styles.primaryButton, saving && styles.disabled]}
          >
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Guardar avatar</Text>}
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 14 },
  backButton: { paddingVertical: 2, alignSelf: "flex-start" },
  backText: { color: "#164F3D", fontSize: 15, fontWeight: "700" },
  eyebrow: { color: "#164F3D", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  title: { fontSize: 28, fontWeight: "800" },
  hint: { fontSize: 13, lineHeight: 19 },
  preview: { borderRadius: 20, alignItems: "center", paddingVertical: 14 },
  group: { gap: 8 },
  groupTitle: { fontSize: 15, fontWeight: "800" },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { minHeight: 40, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, justifyContent: "center" },
  locked: { opacity: 0.5 },
  errorText: { color: "#A14537", fontSize: 13, lineHeight: 19 },
  noticeText: { color: "#164F3D", fontSize: 13, fontWeight: "700" },
  primaryButton: { backgroundColor: "#164F3D", minHeight: 50, borderRadius: 15, justifyContent: "center", alignItems: "center" },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  disabled: { opacity: 0.6 },
});
