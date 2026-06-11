const express = require("express");
const cors = require("cors");
const { config } = require("./config");
const { router: projectsRouter } = require("./routes/projects");
const { router: metaRouter } = require("./routes/meta");
const { router: authRouter } = require("./routes/auth");

function createApp() {
  const app = express();
  app.use(cors({ origin: config.allowedOrigins }));
  app.use(express.json({ limit: "2mb" }));

  // Auth mock leve: identidade do cliente via header (como no suporte-nairuz).
  app.use((req, _res, next) => {
    const email = req.header("x-user-email");
    if (email) req.userEmail = String(email).trim().toLowerCase();
    next();
  });

  app.get("/health", (_req, res) => res.json({ status: "ok", repo: req_repo() }));

  app.use("/api/projects", projectsRouter);
  app.use("/api", metaRouter);
  app.use("/api/auth", authRouter);

  app.use((_req, res) => res.status(404).json({ error: "not_found" }));
  return app;
}

// pequeno helper para health expor o repo ativo
function req_repo() {
  try {
    return require("./repos").getRepo().kind;
  } catch {
    return "unknown";
  }
}

module.exports = { createApp };
