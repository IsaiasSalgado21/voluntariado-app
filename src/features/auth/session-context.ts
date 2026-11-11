import { createContext } from "react";
import type { AuthUser } from "./api";

export type SessionStatus = "loading" | "unauthenticated" | "authenticated";

export type SessionContextValue = {
  status: SessionStatus;
  token: string | null;
  user: AuthUser | null;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
};

export const SessionContext = createContext<SessionContextValue | null>(null);
