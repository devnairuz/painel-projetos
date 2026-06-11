require("dotenv").config();
const { config } = require("./config");
const { createApp } = require("./app");
const { initRepo } = require("./repos");
const { connectMongo } = require("./db/mongo");

async function boot() {
  let useMongo = false;
  if (config.mongoUri) {
    try {
      await connectMongo(config.mongoUri);
      useMongo = true;
      console.log("[db] MongoDB conectado.");
    } catch (e) {
      console.warn(`[db] Falha ao conectar no Mongo (${e.message}). Usando fallback em memória.`);
    }
  } else {
    console.log("[db] MONGODB_URI ausente — usando fallback em memória (dados não persistem).");
  }

  await initRepo({ useMongo });

  const app = createApp();
  app.listen(config.port, () => {
    console.log(`[api] Portal de Implantação rodando em http://localhost:${config.port} (repo: ${useMongo ? "mongo" : "memory"})`);
  });
}

boot().catch((e) => {
  console.error("Falha no boot:", e);
  process.exit(1);
});
