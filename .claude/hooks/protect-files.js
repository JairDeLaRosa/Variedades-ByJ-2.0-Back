// Hook PreToolUse: bloquea ediciones (Edit/Write) a archivos sensibles.
// Los lockfiles se modifican solo con `npm install`, nunca a mano.
const PROTEGIDOS = [
  { patron: /(^|[\\/])\.env(\.(?!example$)[^\\/]+)?$/, motivo: "archivo de entorno con secretos" },
  { patron: /(^|[\\/])credentials[^\\/]*\.json$/i, motivo: "credenciales" },
  { patron: /(^|[\\/])service-account[^\\/]*\.json$/i, motivo: "credenciales" },
  { patron: /\.(pem|key)$/i, motivo: "llave privada" },
  { patron: /(^|[\\/])package-lock\.json$/, motivo: "lockfile (usar npm install)" },
];

let entrada = "";
process.stdin.on("data", (chunk) => (entrada += chunk));
process.stdin.on("end", () => {
  let ruta = "";
  try {
    ruta = JSON.parse(entrada).tool_input?.file_path ?? "";
  } catch {
    process.exit(0);
  }

  const bloqueado = PROTEGIDOS.find(({ patron }) => patron.test(ruta));
  if (bloqueado) {
    console.error(
      `Edición bloqueada: ${ruta} es ${bloqueado.motivo}. Pídele al usuario que lo cambie.`,
    );
    process.exit(2);
  }
});
