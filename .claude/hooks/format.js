// Hook PostToolUse: da formato con Prettier al archivo recién editado.
// Solo Prettier: lint, tests y build se corren únicamente cuando el usuario lo pide.
const { spawnSync } = require("node:child_process");

const EXTENSIONES = /\.(ts|json|md|ya?ml)$/;

let entrada = "";
process.stdin.on("data", (chunk) => (entrada += chunk));
process.stdin.on("end", () => {
  let ruta = "";
  try {
    ruta = JSON.parse(entrada).tool_input?.file_path ?? "";
  } catch {
    return;
  }

  if (!EXTENSIONES.test(ruta) || /package-lock\.json$/.test(ruta)) return;

  spawnSync("npx", ["prettier", "--write", ruta], {
    stdio: "ignore",
    shell: true,
  });
});
