// A landing é um site separado do app. Todos os botões que levam para o
// sistema montam o endereço a partir desta variável (ver .env.example).
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const appLinks = {
  login: `${APP_URL}/login`,
  register: `${APP_URL}/register`,
  demo: `${APP_URL}/login?demo=1`,
};

export const sectionLinks = [
  { href: "#recursos", label: "Recursos" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#app", label: "App" },
  { href: "#precos", label: "Preços" },
  { href: "#faq", label: "Dúvidas" },
];
