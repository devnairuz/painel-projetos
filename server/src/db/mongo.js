const mongoose = require("mongoose");

// Conexão MongoDB com pool — espelha o padrão do suporte-nairuz.
async function connectMongo(uri) {
  if (!uri) throw new Error("MONGODB_URI ausente");
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 20000
  });
  return mongoose.connection;
}

module.exports = { connectMongo };
