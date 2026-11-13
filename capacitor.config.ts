import type { CapacitorConfig } from "@capacitor/cli";

// O appId é a identidade do app nas lojas e NÃO pode mudar depois da
// primeira publicação. Troque antes de publicar, se quiser outro.
const config: CapacitorConfig = {
  appId: "com.financeai.app",
  appName: "Finance.AI",
  // Saída do `npm run build:mobile` (export estático do Next).
  webDir: "out",
  // Mesma cor de fundo do app, para não piscar branco ao abrir.
  backgroundColor: "#0c1311",
  // No Android o app roda em https://localhost (padrão do Capacitor); essa
  // origem precisa estar no ALLOWED_ORIGINS da API (ver render.yaml).
};

export default config;
