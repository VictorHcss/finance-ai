"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

// A landing page agora é um projeto separado (pasta landing/). No app — e
// no futuro aplicativo de celular — a raiz só decide para onde ir: quem tem
// sessão vai para o dashboard, quem não tem vai para o login.
export default function AppEntry() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) router.replace(session ? "/dashboard" : "/login");
  }, [loading, session, router]);

  return null;
}
