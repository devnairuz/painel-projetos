const parseOrigins = () => {
  const raw = process.env.ALLOWED_ORIGINS || "http://localhost:4321,http://localhost:5173";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
};

const env = process.env.NODE_ENV || "development";

const config = {
  port: Number(process.env.PORT) || 4000,
  env,
  isDev: env !== "production",
  allowedOrigins: parseOrigins(),
  mongoUri: process.env.MONGODB_URI || "",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-troque-em-producao",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d"
};

module.exports = { config };
