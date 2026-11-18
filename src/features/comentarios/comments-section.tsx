import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { RegeneraCard, RegeneraSectionHeading } from "@/components/regenera-ui";
import { ApiRequestError } from "@/features/api-client";
import { useSession } from "@/features/auth/use-session";
import {
  canCreateCommentForRole,
  createVolunteerComment,
  deleteVolunteerComment,
  fetchVolunteerComments,
  publishVolunteerComment,
  replyToVolunteerComment,
  updateVolunteerCommentVisibility,
  type VolunteerComment,
} from "./api";
import type { CommentsDefault } from "../voluntariados/api";

type Props = {
  volunteerId: string;
  commentsDefault: CommentsDefault;
};

type ApiFeedback = {
  message: string;
  status: number | null;
};

type AppColors = typeof Colors.light | typeof Colors.dark;

const MAX_COMMENT_LENGTH = 1000;

export function CommentsSection({ volunteerId, commentsDefault }: Props) {
  const theme = useTheme();
  const colors = Colors[Colors.dark.background === theme.background ? "dark" : "light"];
  const { status: sessionStatus, token, user, logout } = useSession();
  const [comments, setComments] = useState<VolunteerComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState<ApiFeedback | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [content, setContent] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);

  const canCreate = sessionStatus === "authenticated" && Boolean(token) && canCreateCommentForRole(user?.rol);
  const forcePrivate = canCreate && user?.rol === "usuario" && commentsDefault === "privado";
  const commentsByParent = useMemo(() => {
    const grouped = new Map<string, VolunteerComment[]>();
    for (const comment of comments) {
      if (!comment.parentId) continue;
      const replies = grouped.get(comment.parentId) ?? [];
      replies.push(comment);
      grouped.set(comment.parentId, replies);
    }
    return grouped;
  }, [comments]);
  const roots = comments.filter((comment) => !comment.parentId);

  useEffect(() => {
    setIsPrivate(forcePrivate);
  }, [forcePrivate, volunteerId]);

  const reportFailure = useCallback(async (cause: unknown) => {
    const feedback = feedbackFor(cause);
    setError(feedback);
    if (feedback.status === 401) {
      try {
        await logout();
      } catch (logoutError) {
        setError({
          message: `${feedback.message} ${logoutError instanceof Error ? logoutError.message : ""}`.trim(),
          status: 401,
        });
      }
    }
  }, [logout]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setComments([]);
    setError(null);

    if (sessionStatus === "loading") {
      setLoading(true);
      return () => {
        active = false;
        controller.abort();
      };
    }

    if (!token) {
      setLoading(false);
      return () => {
        active = false;
        controller.abort();
      };
    }

    setLoading(true);
    void fetchVolunteerComments(token, volunteerId, controller.signal)
      .then((result) => {
        if (active) setComments(result);
      })
      .catch(async (cause: unknown) => {
        if (active && !controller.signal.aborted) await reportFailure(cause);
      })
      .finally(() => {
        if (active && !controller.signal.aborted) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [sessionStatus, token, volunteerId, reloadKey, reportFailure]);

  const runAction = async (action: () => Promise<unknown>, successMessage: string) => {
    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(successMessage);
      setReplyTargetId(null);
      setReplyContent("");
      setReplyError(null);
      setDeleteCandidateId(null);
      setReloadKey((key) => key + 1);
    } catch (cause) {
      await reportFailure(cause);
    } finally {
      setWorking(false);
    }
  };

  const submitComment = async () => {
    if (!token) return;
    const trimmed = content.trim();
    if (!trimmed) {
      setComposerError("Escribe un comentario antes de enviarlo.");
      return;
    }
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      setComposerError("El comentario no puede superar los 1000 caracteres.");
      return;
    }

    setWorking(true);
    setError(null);
    setNotice(null);
    setComposerError(null);
    try {
      await createVolunteerComment(token, volunteerId, trimmed, forcePrivate || isPrivate);
      setContent("");
      setIsPrivate(forcePrivate);
      setNotice("Tu comentario se envió correctamente.");
      setReloadKey((key) => key + 1);
    } catch (cause) {
      const feedback = feedbackFor(cause);
      if (feedback.status === 422) setComposerError(feedback.message);
      else await reportFailure(cause);
    } finally {
      setWorking(false);
    }
  };

  const submitReply = async (commentId: string) => {
    if (!token) return;
    const trimmed = replyContent.trim();
    if (!trimmed) {
      setReplyError("Escribe una respuesta antes de enviarla.");
      return;
    }
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      setReplyError("La respuesta no puede superar los 1000 caracteres.");
      return;
    }

    setWorking(true);
    setError(null);
    setNotice(null);
    setReplyError(null);
    try {
      await replyToVolunteerComment(token, commentId, trimmed);
      setReplyContent("");
      setReplyTargetId(null);
      setNotice("La respuesta se envió correctamente.");
      setReloadKey((key) => key + 1);
    } catch (cause) {
      const feedback = feedbackFor(cause);
      if (feedback.status === 422) setReplyError(feedback.message);
      else await reportFailure(cause);
    } finally {
      setWorking(false);
    }
  };

  const toggleVisibility = (comment: VolunteerComment) => {
    if (!token) return;
    void runAction(
      () => updateVolunteerCommentVisibility(token, comment.id, !comment.esPublicado),
      comment.esPublicado ? "Comentario oculto." : "Comentario publicado.",
    );
  };

  const publishComment = (comment: VolunteerComment) => {
    if (!token) return;
    void runAction(
      () => publishVolunteerComment(token, comment.id),
      "La duda se publicó correctamente.",
    );
  };

  const removeComment = (comment: VolunteerComment) => {
    if (!token) return;
    void runAction(
      () => deleteVolunteerComment(token, comment.id),
      "El comentario se eliminó.",
    );
  };

  const renderComment = (comment: VolunteerComment, isReply = false) => {
    const authorName = comment.autor.nombre?.trim() || "Participante";
    const replyList = commentsByParent.get(comment.id) ?? [];
    const visibilityLabel = comment.esPrivado
      ? comment.esPublicado ? "Duda privada publicada" : "Duda privada"
      : !comment.esPublicado
        ? "Oculto"
        : null;

    return (
      <View
        key={comment.id}
        style={[
          styles.commentCard,
          { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected },
          isReply && styles.replyCard,
        ]}
      >
        <View style={styles.commentHeader}>
          <View style={styles.authorIdentity}>
            {comment.autor.foto ? (
              <Image
                accessibilityLabel={`Foto de ${authorName}`}
                source={{ uri: comment.autor.foto }}
                style={styles.avatar}
              />
            ) : (
              <View
                accessibilityLabel={`Avatar de ${authorName}`}
                style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.backgroundSelected }]}
              >
                <Text style={[styles.avatarInitial, { color: colors.text }]}>{initialFor(authorName)}</Text>
              </View>
            )}
            <View style={styles.authorText}>
              <Text style={[styles.authorName, { color: colors.text }]}>{authorName}</Text>
              <Text style={[styles.authorRole, { color: colors.textSecondary }]}>
                {roleLabel(comment.autor.rol)}
              </Text>
            </View>
          </View>
          <Text style={[styles.date, { color: colors.textSecondary }]}>{formatCommentDate(comment.createdAt)}</Text>
        </View>

        {visibilityLabel && (
          <Text
            style={[
              styles.visibilityBadge,
              comment.esPrivado ? styles.privateBadge : styles.hiddenBadge,
            ]}
          >
            {comment.esPrivado ? "🔒 " : ""}{visibilityLabel}
          </Text>
        )}
        <Text style={[styles.commentContent, { color: colors.text }]}>{comment.contenido}</Text>

        <View style={styles.actionRow}>
          {comment.puedeModerar && !comment.esPrivado && (
            <ActionButton
              label={comment.esPublicado ? "Ocultar" : "Mostrar"}
              disabled={working}
              onPress={() => toggleVisibility(comment)}
              colors={colors}
            />
          )}
          {comment.puedePublicar && (
            <ActionButton
              label="Publicar duda"
              disabled={working}
              onPress={() => publishComment(comment)}
              colors={colors}
            />
          )}
          {comment.puedeModerar && !comment.parentId && (
            <ActionButton
              label={replyTargetId === comment.id ? "Cerrar respuesta" : "Responder"}
              disabled={working}
              onPress={() => {
                setReplyError(null);
                setReplyContent("");
                setReplyTargetId((current) => current === comment.id ? null : comment.id);
              }}
              colors={colors}
            />
          )}
          {comment.puedeEliminar && (
            <ActionButton
              label={deleteCandidateId === comment.id ? "Cancelar eliminación" : "Eliminar"}
              disabled={working}
              destructive
              onPress={() => setDeleteCandidateId((current) => current === comment.id ? null : comment.id)}
              colors={colors}
            />
          )}
        </View>

        {deleteCandidateId === comment.id && (
          <View style={[styles.confirmBox, { backgroundColor: colors.backgroundSelected }]}>
            <Text style={[styles.confirmText, { color: colors.text }]}>
              ¿Eliminar este comentario? Esta acción no se puede deshacer.
            </Text>
            <View style={styles.actionRow}>
              <ActionButton
                label={working ? "Eliminando…" : "Confirmar"}
                disabled={working}
                destructive
                onPress={() => removeComment(comment)}
                colors={colors}
              />
              <ActionButton
                label="Conservar"
                disabled={working}
                onPress={() => setDeleteCandidateId(null)}
                colors={colors}
              />
            </View>
          </View>
        )}

        {replyTargetId === comment.id && !isReply && (
          <View style={[styles.replyForm, { backgroundColor: colors.backgroundSelected }]}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Responder a {authorName}
            </Text>
            <TextInput
              accessibilityLabel={`Respuesta a ${authorName}`}
              accessibilityHint="Máximo 1000 caracteres"
              editable={!working}
              maxLength={MAX_COMMENT_LENGTH}
              multiline
              onChangeText={setReplyContent}
              placeholder="Escribe una respuesta"
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, styles.multiline, { color: colors.text, borderColor: colors.backgroundSelected }]}
              textAlignVertical="top"
              value={replyContent}
            />
            <Text style={[styles.characterCount, { color: colors.textSecondary }]}>
              {replyContent.length} / {MAX_COMMENT_LENGTH}
            </Text>
            {replyError && <Text accessibilityRole="alert" style={styles.errorText}>{replyError}</Text>}
            <View style={styles.actionRow}>
              <ActionButton
                label={working ? "Enviando…" : "Enviar respuesta"}
                disabled={working}
                onPress={() => void submitReply(comment.id)}
                primary
                colors={colors}
              />
              <ActionButton
                label="Cancelar"
                disabled={working}
                onPress={() => {
                  setReplyTargetId(null);
                  setReplyContent("");
                  setReplyError(null);
                }}
                colors={colors}
              />
            </View>
          </View>
        )}

        {!!replyList.length && (
          <View
            accessibilityLabel={`Respuestas a ${authorName}`}
            style={styles.replies}
          >
            {replyList.map((reply) => renderComment(reply, true))}
          </View>
        )}
      </View>
    );
  };

  return (
    <RegeneraCard style={styles.section}>
      <View style={styles.sectionHeader}>
        <RegeneraSectionHeading
          eyebrow="CONVERSACIÓN"
          title="Comentarios y dudas"
          subtitle="Comparte preguntas o actualizaciones relacionadas con esta actividad."
        />
        {token && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Actualizar comentarios"
            disabled={loading || working}
            onPress={() => setReloadKey((key) => key + 1)}
            style={styles.refreshButton}
          >
            <Text style={[styles.refreshText, { color: colors.textSecondary }]}>Actualizar</Text>
          </Pressable>
        )}
      </View>

      {sessionStatus === "loading" ? (
        <ActivityIndicator color="#164F3D" />
      ) : !token ? (
        <View style={styles.loginPrompt}>
          <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
            Inicia sesión para ver y publicar comentarios.
          </Text>
          <ActionButton
            label="Iniciar sesión"
            disabled={false}
            primary
            onPress={() => router.push("/login")}
            colors={colors}
          />
        </View>
      ) : (
        <>
          {error && (
            <View style={styles.feedback}>
              <Text accessibilityRole="alert" style={styles.errorText}>{error.message}</Text>
              {error.status === 401 ? (
                <ActionButton
                  label="Iniciar sesión"
                  disabled={false}
                  primary
                  onPress={() => router.push("/login")}
                  colors={colors}
                />
              ) : (
                <ActionButton
                  label="Reintentar"
                  disabled={loading || working}
                  onPress={() => setReloadKey((key) => key + 1)}
                  colors={colors}
                />
              )}
            </View>
          )}
          {notice && <Text accessibilityLiveRegion="polite" style={styles.noticeText}>{notice}</Text>}

          {canCreate && (
            <View style={[styles.composer, { backgroundColor: colors.backgroundSelected }]}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Escribe un comentario</Text>
              <TextInput
                accessibilityLabel="Escribe un comentario"
                accessibilityHint="Máximo 1000 caracteres"
                editable={!working}
                maxLength={MAX_COMMENT_LENGTH}
                multiline
                onChangeText={(value) => {
                  setContent(value);
                  setComposerError(null);
                }}
                placeholder="Comparte una pregunta o experiencia"
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, styles.multiline, { color: colors.text, borderColor: colors.backgroundSelected }]}
                textAlignVertical="top"
                value={content}
              />
              <Text style={[styles.characterCount, { color: colors.textSecondary }]}>
                {content.length} / {MAX_COMMENT_LENGTH}
              </Text>
              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Duda privada</Text>
                  <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                    {forcePrivate
                      ? "Esta actividad recibe dudas privadas; esta opción no se puede cambiar."
                      : "Una duda privada la ven su autor, la organización y administración."}
                  </Text>
                </View>
                <Switch
                  accessibilityLabel="Marcar comentario como duda privada"
                  accessibilityState={{ disabled: forcePrivate || working }}
                  disabled={forcePrivate || working}
                  onValueChange={setIsPrivate}
                  trackColor={{ true: "#164F3D" }}
                  value={forcePrivate || isPrivate}
                />
              </View>
              {composerError && <Text accessibilityRole="alert" style={styles.errorText}>{composerError}</Text>}
              <ActionButton
                label={working ? "Enviando…" : "Enviar comentario"}
                disabled={working}
                primary
                onPress={() => void submitComment()}
                colors={colors}
              />
            </View>
          )}

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color="#164F3D" />
              <Text style={[styles.bodyText, { color: colors.textSecondary }]}>Cargando comentarios…</Text>
            </View>
          ) : roots.length === 0 ? (
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>Aún no hay comentarios.</Text>
          ) : (
            <View style={styles.commentList}>
              {roots.map((comment) => renderComment(comment))}
            </View>
          )}
        </>
      )}
    </RegeneraCard>
  );
}

function ActionButton({
  label,
  disabled,
  onPress,
  colors,
  primary = false,
  destructive = false,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
  colors: AppColors;
  primary?: boolean;
  destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.actionButton,
        primary && styles.primaryButton,
        destructive && styles.destructiveButton,
        disabled && styles.disabled,
        !primary && !destructive && { borderColor: colors.backgroundSelected },
      ]}
    >
      <Text style={[styles.actionText, primary && styles.primaryButtonText, destructive && styles.destructiveText]}>
        {label}
      </Text>
    </Pressable>
  );
}

function feedbackFor(error: unknown): ApiFeedback {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) {
      return { message: "Tu sesión expiró. Inicia sesión de nuevo para continuar.", status: 401 };
    }
    if (error.status === 403) {
      return { message: "No tienes permiso para realizar esta acción.", status: 403 };
    }
    if (error.status === 404) {
      return { message: "El comentario o voluntariado ya no está disponible. Actualiza la lista.", status: 404 };
    }
    if (error.status === 422) {
      return {
        message: Object.values(error.fieldErrors)[0] ?? error.message,
        status: 422,
      };
    }
    return { message: error.message, status: error.status };
  }
  return {
    message: error instanceof Error ? error.message : "No se pudo completar la solicitud. Intenta de nuevo.",
    status: null,
  };
}

function roleLabel(role: string | null): string {
  switch (role) {
    case "usuario":
    case "voluntario":
      return "Voluntario";
    case "organizador":
      return "Organizador";
    case "admin":
      return "Administrador";
    default:
      return "Participante";
  }
}

function initialFor(name: string): string {
  return Array.from(name.trim())[0]?.toLocaleUpperCase("es-MX") ?? "?";
}

function formatCommentDate(value: string | null): string {
  if (!value) return "Fecha no disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const styles = StyleSheet.create({
  section: { padding: 18, borderRadius: 18, gap: 14 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  refreshButton: { minHeight: 40, justifyContent: "center", paddingHorizontal: 8 },
  refreshText: { fontSize: 13, fontWeight: "700" },
  composer: { gap: 8, padding: 14, borderRadius: 14, backgroundColor: "#F1F4EF" },
  fieldLabel: { fontSize: 14, fontWeight: "700" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  multiline: { minHeight: 88, textAlignVertical: "top" },
  characterCount: { alignSelf: "flex-end", fontSize: 12 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  switchCopy: { flex: 1, gap: 3 },
  helperText: { fontSize: 12, lineHeight: 17 },
  bodyText: { fontSize: 14, lineHeight: 20 },
  loginPrompt: { alignItems: "flex-start", gap: 10 },
  feedback: { gap: 8 },
  errorText: { color: "#A14537", fontSize: 13, lineHeight: 19 },
  noticeText: { color: "#246043", fontSize: 13, fontWeight: "600" },
  loading: { alignItems: "center", gap: 8, paddingVertical: 12 },
  commentList: { gap: 12 },
  commentCard: { borderWidth: 1, borderRadius: 14, padding: 13, gap: 10 },
  replyCard: { marginLeft: 12, borderLeftWidth: 3 },
  commentHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  authorIdentity: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  authorText: { flex: 1, gap: 2 },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 15, fontWeight: "800" },
  authorName: { fontSize: 14, fontWeight: "700" },
  authorRole: { fontSize: 11 },
  date: { maxWidth: "42%", fontSize: 10, textAlign: "right" },
  visibilityBadge: { alignSelf: "flex-start", overflow: "hidden", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, fontSize: 11, fontWeight: "700" },
  privateBadge: { color: "#4B3276", backgroundColor: "#E9E1F7" },
  hiddenBadge: { color: "#5F4A24", backgroundColor: "#F4E8C9" },
  commentContent: { fontSize: 14, lineHeight: 21 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 7 },
  actionButton: { minHeight: 38, justifyContent: "center", borderWidth: 1, borderRadius: 11, paddingHorizontal: 11, paddingVertical: 7 },
  actionText: { color: "#164F3D", fontSize: 12, fontWeight: "700" },
  primaryButton: { borderColor: "#164F3D", backgroundColor: "#164F3D" },
  primaryButtonText: { color: "#FFFFFF" },
  destructiveButton: { borderColor: "#9E3030", backgroundColor: "#F8E8E6" },
  destructiveText: { color: "#8C2828" },
  disabled: { opacity: 0.55 },
  confirmBox: { gap: 8, padding: 10, borderRadius: 12, backgroundColor: "#F8E8E6" },
  confirmText: { fontSize: 13, lineHeight: 18 },
  replyForm: { gap: 8, padding: 11, borderRadius: 12, backgroundColor: "#F1F4EF" },
  replies: { gap: 8, borderLeftWidth: 2, borderLeftColor: "#B7C7BC", paddingLeft: 8 },
});
