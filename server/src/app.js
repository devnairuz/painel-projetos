const express = require("express");
const cors = require("cors");
const { config } = require("./config");
const { router: projectsRouter } = require("./routes/projects");
const { router: metaRouter } = require("./routes/meta");
const { router: authRouter } = require("./routes/auth");
const { router: companyAuthRouter } = require("./routes/companyAuth");
const { router: usersRouter } = require("./routes/users");
const { requireAuth } = require("./middleware/requireAuth");

function reqRepo() {
  try {
    return require("./repos").getRepo().kind;
  } catch {
    return "unknown";
  }
}

function createApp() {
  const app = express();
  app.use(cors({ origin: config.allowedOrigins }));
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => res.json({ status: "ok", repo: reqRepo() }));

  // ───── Auth (aberto) ─────
  app.use("/api/auth", authRouter); // login do cliente (mock por e-mail)
  app.use("/api/auth", companyAuthRouter); // empresa: register/verify/login/me

  // Leituras públicas que o portal do cliente usa (sem login da empresa).
  app.use("/api", metaRouter); // GET /team, GET /organizations (POST é protegido dentro)

  // ───── Visão da empresa (protegida por JWT) ─────
  app.use("/api/users", requireAuth, usersRouter);
  app.use("/api/projects", requireAuth, projectsRouter);

  app.use((_req, res) => res.status(404).json({ error: "not_found" }));
  return app;
}

module.exports = { createApp };
