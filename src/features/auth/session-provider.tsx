import { ApiRequestError } from "@/features/api-client";
import {
  fetchCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  type AuthUser,
  AuthenticationError,
} from "@/features/auth/api";
import { SessionContext, type SessionContextValue } from "@/features/auth/session-context";
import { readAuthToken, removeAuthToken, saveAuthToken } from "@/features/auth/token-storage";
import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from "react";

type SessionState = {
  status: SessionContextValue["status"];
  token: string | null;
  user: AuthUser | null;
  error: string | null;
};

const initialState: SessionState = {
  status: "loading",
  token: null,
  user: null,
  error: null,
};

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState(initialState);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const token = await readAuthToken();
        if (!active) return;
        if (!token) {
          setSession({ ...initialState, status: "unauthenticated" });
          return;
        }

        try {
          const user = await fetchCurrentUser(token);
          if (active) setSession({ status: "authenticated", token, user, error: null });
        } catch (error) {
          if (!active) return;
          if (error instanceof AuthenticationError && error.status === 401) {
            await removeAuthToken();
            setSession({
              status: "unauthenticated",
              token: null,
              user: null,
              error: "Tu sesión venció. Inicia sesión de nuevo.",
            });
            return;
          }

          setSession({
            status: "authenticated",
            token,
            user: null,
            error: error instanceof Error ? error.message : "No se pudo cargar tu perfil.",
          });
        }
      } catch (error) {
        if (active) {
          setSession({
            status: "unauthenticated",
            token: null,
            user: null,
            error: error instanceof Error ? error.message : "No se pudo recuperar la sesión segura.",
          });
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const acceptAuthResult = useCallback(async (result: { token: string; user: AuthUser }) => {
    await saveAuthToken(result.token);
    setSession({
      status: "authenticated",
      token: result.token,
      user: result.user,
      error: null,
    });

    try {
      const currentUser = await fetchCurrentUser(result.token);
      setSession({
        status: "authenticated",
        token: result.token,
        user: currentUser,
        error: null,
      });
    } catch (error) {
      if (error instanceof AuthenticationError && error.status === 401) {
        await removeAuthToken();
        setSession({
          status: "unauthenticated",
          token: null,
          user: null,
          error: "El servidor rechazó la sesión. Intenta iniciar sesión de nuevo.",
        });
        return;
      }

      setSession((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "No se pudo actualizar el perfil.",
      }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginRequest(email, password);
    await acceptAuthResult(result);
  }, [acceptAuthResult]);

  const register = useCallback(async (
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string,
  ) => {
    const result = await registerRequest(name, email, password, passwordConfirmation);
    await acceptAuthResult(result);
  }, [acceptAuthResult]);

  const refreshProfile = useCallback(async () => {
    if (!session.token) {
      throw new Error("Inicia sesión para consultar tu perfil.");
    }

    try {
      const user = await fetchCurrentUser(session.token);
      setSession((current) => ({ ...current, user, error: null }));
    } catch (error) {
      if (error instanceof AuthenticationError && error.status === 401) {
        await removeAuthToken();
        setSession({
          status: "unauthenticated",
          token: null,
          user: null,
          error: "Tu sesión venció. Inicia sesión de nuevo.",
        });
      } else {
        setSession((current) => ({
          ...current,
          error: error instanceof Error ? error.message : "No se pudo actualizar el perfil.",
        }));
      }
      throw error;
    }
  }, [session.token]);

  const logout = useCallback(async () => {
    const token = session.token;
    let remoteError: unknown;

    if (token) {
      try {
        await logoutRequest(token);
      } catch (error) {
        if (!(error instanceof ApiRequestError && error.status === 401)) {
          remoteError = error;
        }
      }
    }

    await removeAuthToken();
    setSession({
      status: "unauthenticated",
      token: null,
      user: null,
      error: null,
    });

    if (remoteError) {
      throw new Error(
        `La sesión se cerró en este dispositivo, pero el servidor no confirmó la revocación: ${
          remoteError instanceof Error ? remoteError.message : "error de conexión"
        }`,
      );
    }
  }, [session.token]);

  const clearError = useCallback(() => {
    setSession((current) => ({ ...current, error: null }));
  }, []);

  const value = useMemo<SessionContextValue>(() => ({
    ...session,
    login,
    register,
    logout,
    refreshProfile,
    clearError,
  }), [session, login, register, logout, refreshProfile, clearError]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
