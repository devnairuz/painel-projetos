const crypto = require("crypto");
const express = require("express");
const { config } = require("../config");
const { requireAuth } = require("../middleware/requireAuth");
const importService = require("../services/projectImportService");
const { statusIntegracao } = require("../integrations/nairaClient");

const router = express.Router();
const h = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((erro) => {
  const controlado = !!erro.status || !!erro.codigo;
  const codigo = controlado ? (erro.codigo || "invalid_request") : "server_error";
  const mensagem = controlado ? (erro.message || "Solicitação inválida.") : "Erro interno do servidor.";
  res.status(controlado ? (erro.status || 400) : 500).json({ erro: { codigo, mensagem }, error: codigo, message: mensagem });
});

function iguaisEmTempoConstante(valor, esperado) {
  const primeiro = crypto.createHash("sha256").update(String(valor || "")).digest();
  const segundo = crypto.createHash("sha256").update(String(esperado || "")).digest();
  return crypto.timingSafeEqual(primeiro, segundo);
}

function exigirTokenM2M(req, res, next) {
  if (!config.naira.m2mToken) {
    return res.status(503).json({ error: "m2m_not_configured", message: "NAIRA_M2M_TOKEN não está configurado." });
  }
  const cabecalho = req.header("authorization") || "";
  const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7) : req.header("x-naira-token");
  if (!iguaisEmTempoConstante(token, config.naira.m2mToken)) {
    return res.status(401).json({ error: "invalid_m2m_token", message: "Token da integração inválido." });
  }
  next();
}

function exigirAssinaturaCallback(req, res, next) {
  if (!config.naira.callbackSecret) {
    return res.status(503).json({ error: "callback_not_configured", message: "NAIRA_CALLBACK_SECRET não está configurado." });
  }
  if (!Buffer.isBuffer(req.rawBody)) {
    return res.status(400).json({ error: "callback_body_unavailable", message: "Não foi possível validar o corpo bruto do callback." });
  }
  const recebida = String(req.header("x-naira-signature") || "").replace(/^sha256=/i, "").trim().toLowerCase();
  const calculada = crypto
    .createHmac("sha256", config.naira.callbackSecret)
    .update(req.rawBody)
    .digest("hex");
  if (!/^[a-f0-9]{64}$/.test(recebida) || !iguaisEmTempoConstante(recebida, calculada)) {
    return res.status(401).json({ error: "invalid_callback_signature", message: "Assinatura do callback inválida." });
  }
  next();
}

router.get("/status", requireAuth, (_req, res) => {
  res.json(statusIntegracao(importService.persistenciaPronta()));
});

router.post("/imports", exigirTokenM2M, h(async (req, res) => {
  const resultado = await importService.criarEntradaM2M(req.body, req.header("idempotency-key"));
  res.status(resultado.criada ? 201 : 200).json(resultado.importacao);
}));

router.post("/callback", exigirAssinaturaCallback, h(async (req, res) => {
  res.json(await importService.receberCallback(req.body));
}));

module.exports = { router, iguaisEmTempoConstante };
