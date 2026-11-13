// Gera o app para o Capacitor: export estático do Next em out/ + `cap sync`.
//
// Uso:
//   npm run build:mobile -- --api=https://finance-ai-api.onrender.com/api
// ou com a variável MOBILE_API_URL definida no ambiente.
//
// A URL da API é obrigatória e não pode ser localhost: dentro do celular,
// "localhost" é o próprio aparelho, não o seu computador.
import { spawnSync } from "node:child_process";

const apiArg = process.argv.find((arg) => arg.startsWith("--api="));
const apiUrl = (apiArg ? apiArg.slice("--api=".length) : process.env.MOBILE_API_URL ?? "").trim();
const skipSync = process.argv.includes("--no-sync");

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

if (!apiUrl) {
  fail(
    "Informe a URL da API de produção:\n" +
      "  npm run build:mobile -- --api=https://<sua-api>.onrender.com/api",
  );
}
if (!/^https:\/\//.test(apiUrl)) {
  fail(`A URL da API precisa ser https (recebido: ${apiUrl}).`);
}
if (/localhost|127\.0\.0\.1/.test(apiUrl)) {
  fail("A URL da API não pode ser localhost no aplicativo.");
}

const env = { ...process.env, BUILD_TARGET: "mobile", NEXT_PUBLIC_API_URL: apiUrl };

function run(command, args) {
  console.log(`\n▶ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", env, shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`API do app: ${apiUrl}`);
run("npx", ["next", "build"]);
if (!skipSync) run("npx", ["cap", "sync"]);
console.log("\n✔ Pronto. Abra o projeto Android com: npm run android\n");
