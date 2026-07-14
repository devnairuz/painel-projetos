const express = require("express");
const cors = require("cors");
const { config } = require("./config");
const { router: projectsRouter } = require("./routes/projects");
const { router: metaRouter } = require("./routes/meta");
const { router: authRouter } = require("./routes/auth");
const { router: companyAuthRouter } = require("./routes/companyAuth");
const { router: usersRouter } = require("./routes/users");
const { router: notificationsRouter } = require("./routes/notifications");
const { router: clientPortalRouter } = require("./routes/clientPortal");
const { router: projectImportsRouter } = require("./routes/projectImports");
const { router: nairaIntegrationRouter } = require("./routes/nairaIntegration");
const { requireAuth } = require("./middleware/requireAuth");
const { requireClientAuth } = require("./middleware/requireClientAuth");

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
  app.use(express.json({
    limit: "8mb",
    verify: (req, _res, buffer) => {
      // Necessário para validar o HMAC do callback exatamente sobre os bytes
      // recebidos, antes de qualquer normalização do JSON.
      if (req.originalUrl === "/api/integrations/naira/callback") {
        req.rawBody = Buffer.from(buffer);
      }
      const caminho = String(req.originalUrl || "").split("?")[0];
      if (caminho === "/api/project-imports/json" || /^\/api\/project-imports\/[^/]+\/json$/.test(caminho)) {
        // Guardamos somente o tamanho: a entrada bruta pode conter dados
        // sensíveis e nunca deve sobreviver ao ciclo da requisição.
        req.manualJsonBytes = buffer.length;
      }
    }
  }));

  app.get("/health", (_req, res) => res.json({ status: "ok", repo: reqRepo() }));

  // ───── Auth (aberto) ─────
  app.use("/api/auth", authRouter); // login do cliente (mock por e-mail)
  app.use("/api/auth", companyAuthRouter); // empresa: register/verify/login/me
  app.use("/api/integrations/naira", nairaIntegrationRouter);

  // Leituras públicas que o portal do cliente usa (sem login da empresa).
  app.use("/api", metaRouter); // GET /team, GET /organizations (POST é protegido dentro)

  // ───── Portal do cliente (token de cliente) ─────
  app.use("/api/client", requireClientAuth, clientPortalRouter);

  // ───── Visão da empresa (protegida por JWT) ─────
  app.use("/api/users", requireAuth, usersRouter);
  app.use("/api/notifications", requireAuth, notificationsRouter);
  app.use("/api/projects", requireAuth, projectsRouter);
  app.use("/api/project-imports", requireAuth, projectImportsRouter);

  app.use((_req, res) => res.status(404).json({ error: "not_found" }));
  app.use((erro, _req, res, next) => {
    void next;
    if (erro && erro.type === "entity.too.large") {
      return res.status(413).json({ error: "file_too_large", message: "O conteúdo enviado excede o limite permitido." });
    }
    if (erro instanceof SyntaxError && erro.status === 400) {
      return res.status(400).json({ error: "invalid_json", message: "O JSON enviado é inválido." });
    }
    const controlado = !!erro.status || !!erro.codigo;
    const codigo = controlado ? (erro.codigo || "invalid_request") : "server_error";
    const mensagem = controlado ? (erro.message || "Solicitação inválida.") : "Erro interno do servidor.";
    res.status(controlado ? (erro.status || 400) : 500).json({
      erro: { codigo, mensagem },
      error: codigo,
      message: mensagem
    });
  });
  return app;
}

module.exports = { createApp };
