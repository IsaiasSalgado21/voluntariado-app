import { router, usePathname } from "expo-router";
import { useEffect } from "react";
import { useSession } from "@/features/auth/use-session";

// Legacy accounts get 428 from the API until they complete their profile.
export function ProfileGate() {
  const { status, user } = useSession();
  const pathname = usePathname();
  const mustComplete = status === "authenticated" && user?.perfilCompleto === false;

  useEffect(() => {
    if (mustComplete && pathname !== "/completar-perfil") router.replace("/completar-perfil");
  }, [mustComplete, pathname]);

  return null;
}
