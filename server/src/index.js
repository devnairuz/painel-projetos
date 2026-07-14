require("dotenv").config();
const { config } = require("./config");
const { createApp } = require("./app");
const { initRepo } = require("./repos");
const { connectMongo } = require("./db/mongo");
const { retomarImportacoesPendentes } = require("./services/projectImportService");

/** Tenta conectar no Mongo com algumas retentativas antes de desistir. */
async function connectWithRetry(uri, attempts = 4, delayMs = 4000) {
  for (let i = 1; i <= attempts; i += 1) {
    try {
      await connectMongo(uri);
      console.log(`[db] MongoDB conectado (tentativa ${i}/${attempts}).`);
      return true;
    } catch (e) {
      console.warn(`[db] Tentativa ${i}/${attempts} falhou (${e.message}).`);
      if (i < attempts) await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

async function boot() {
  let useMongo = false;
  if (config.mongoUri) {
    useMongo = await connectWithRetry(config.mongoUri);
    if (!useMongo) {
      console.warn("[db] Não foi possível conectar no Mongo após várias tentativas. Usando fallback em memória.");
    }
  } else {
    console.log("[db] MONGODB_URI ausente — usando fallback em memória (dados não persistem).");
  }

  await initRepo({ useMongo });
  await retomarImportacoesPendentes();

  const app = createApp();
  app.listen(config.port, () => {
    console.log(`[api] Rastreio de Projetos rodando em http://localhost:${config.port} (repo: ${useMongo ? "mongo" : "memory"})`);
  });
}

boot().catch((e) => {
  console.error("Falha no boot:", e);
  process.exit(1);
});
