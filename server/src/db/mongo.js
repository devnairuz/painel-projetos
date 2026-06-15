const mongoose = require("mongoose");

// Conexão MongoDB com pool — espelha o padrão do suporte-nairuz.
async function connectMongo(uri) {
  if (!uri) throw new Error("MONGODB_URI ausente");
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {
    maxPoolSize: 20,
    minPoolSize: 2,
    // Atlas free (M0) às vezes demora a responder/acordar; 5s era curto demais
    // e derrubava o servidor pro fallback em memória (dados de seed errados).
    serverSelectionTimeoutMS: 20000,
    connectTimeoutMS: 20000,
    socketTimeoutMS: 45000
  });
  return mongoose.connection;
}

module.exports = { connectMongo };
