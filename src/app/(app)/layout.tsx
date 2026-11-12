import { AppProviders } from "@/components/providers";

// Tudo que é o "sistema" (login, cadastro, dashboard...) fica neste grupo.
// É esta parte que vai ser empacotada como aplicativo — a landing em
// (marketing) não depende de nada daqui.
export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
