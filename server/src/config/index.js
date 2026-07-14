const parseOrigins = () => {
  const raw = process.env.ALLOWED_ORIGINS || "http://localhost:4321,http://localhost:5173";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
};

const env = process.env.NODE_ENV || "development";

function numeroLimitado(valor, padrao, minimo, maximo) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return padrao;
  return Math.min(maximo, Math.max(minimo, Math.trunc(numero)));
}

const modoInformado = String(process.env.NAIRA_MODE || "").trim().toLowerCase();
const modosNaira = new Set(["disabled", "mock", "http"]);
// O mock facilita o teste integrado local, mas produção nunca o habilita por
// acidente. Um NAIRA_MODE explícito sempre prevalece e jamais há fallback de
// HTTP para mock.
const modoNaira = modosNaira.has(modoInformado)
  ? modoInformado
  : (env === "production" ? "disabled" : "mock");

const config = {
  port: Number(process.env.PORT) || 4000,
  env,
  isDev: env !== "production",
  allowedOrigins: parseOrigins(),
  mongoUri: process.env.MONGODB_URI || "",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-troque-em-producao",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  // Semear dados de exemplo no Mongo só quando explicitamente pedido.
  seedDemo: process.env.SEED_DEMO === "true",
  naira: {
    mode: modoNaira,
    baseUrl: String(process.env.NAIRA_BASE_URL || "").trim().replace(/\/$/, ""),
    apiKey: String(process.env.NAIRA_API_KEY || "").trim(),
    callbackSecret: String(process.env.NAIRA_CALLBACK_SECRET || "").trim(),
    callbackUrl: String(process.env.NAIRA_CALLBACK_URL || "").trim(),
    m2mToken: String(process.env.NAIRA_M2M_TOKEN || "").trim(),
    timeoutMs: numeroLimitado(process.env.NAIRA_TIMEOUT_MS, 45_000, 1_000, 120_000),
    maxPdfBytes: numeroLimitado(process.env.NAIRA_MAX_PDF_BYTES, 8 * 1024 * 1024, 64 * 1024, 20 * 1024 * 1024),
    maxManualJsonBytes: numeroLimitado(process.env.NAIRA_MAX_JSON_BYTES, 1024 * 1024, 1024, 4 * 1024 * 1024),
    fileRetentionMs: numeroLimitado(
      process.env.NAIRA_FILE_RETENTION_HOURS,
      24,
      1,
      168
    ) * 60 * 60 * 1000,
    contractVersion: "2026-07-13"
  }
};

module.exports = { config };
