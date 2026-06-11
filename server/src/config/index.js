const parseOrigins = () => {
  const raw = process.env.ALLOWED_ORIGINS || "http://localhost:4321,http://localhost:5173";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
};

const config = {
  port: Number(process.env.PORT) || 4000,
  env: process.env.NODE_ENV || "development",
  allowedOrigins: parseOrigins(),
  mongoUri: process.env.MONGODB_URI || ""
};

module.exports = { config };
