const express = require("express");
const svc = require("../services/projectImportService");
const { config } = require("../config");

const router = express.Router();
const h = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((erro) => {
  const controlado = !!erro.status || !!erro.codigo;
  const codigo = controlado ? (erro.codigo || "invalid_request") : "server_error";
  const mensagem = controlado ? (erro.message || "Solicitação inválida.") : "Erro interno do servidor.";
  res.status(controlado ? (erro.status || 400) : 500).json({ erro: { codigo, mensagem }, error: codigo, message: mensagem });
});

router.get("/", h(async (req, res) => {
  res.json(await svc.listarImportacoes(req.authUser));
}));

function exigirJson(req, res) {
  if (req.is("application/json") || req.is("application/*+json")) return true;
  res.status(415).json({
    erro: { codigo: "invalid_media_type", mensagem: "Envie o contrato da Naira com Content-Type application/json." },
    error: "invalid_media_type",
    message: "Envie o contrato da Naira com Content-Type application/json."
  });
  return false;
}

router.post("/json", h(async (req, res) => {
  if (!exigirJson(req, res)) return;
  const resultado = await svc.criarEntradaJsonManual(req.body, {
    chaveIdempotencia: req.header("idempotency-key"),
    nomeArquivo: req.header("x-file-name"),
    tamanhoBytes: req.manualJsonBytes
  }, req.authUser);
  res.status(resultado.criada ? 201 : 200).json(resultado.importacao);
}));

router.put("/:id/json", h(async (req, res) => {
  if (!exigirJson(req, res)) return;
  const resultado = await svc.atualizarEntradaJsonManual(req.params.id, req.body, {
    chaveIdempotencia: req.header("idempotency-key"),
    versao: req.header("if-match"),
    nomeArquivo: req.header("x-file-name"),
    tamanhoBytes: req.manualJsonBytes
  }, req.authUser);
  res.json(resultado.importacao);
}));

router.get("/:id", h(async (req, res) => {
  res.json(await svc.obterImportacao(req.params.id, req.authUser));
}));

router.post("/", h(async (req, res) => {
  const resultado = await svc.criarImportacao(req.body, req.header("idempotency-key"), req.authUser);
  res.status(resultado.criada ? 201 : 200).json(resultado.importacao);
}));

router.put(
  "/:id/file",
  express.raw({ type: "application/pdf", limit: config.naira.maxPdfBytes }),
  h(async (req, res) => {
    if (!req.is("application/pdf")) {
      return res.status(415).json({
        erro: { codigo: "invalid_media_type", mensagem: "Envie o PDF com Content-Type application/pdf." },
        error: "invalid_media_type",
        message: "Envie o PDF com Content-Type application/pdf."
      });
    }
    const importacao = await svc.enviarArquivo(
      req.params.id,
      req.body,
      req.header("if-match"),
      req.authUser
    );
    res.status(202).json(importacao);
  })
);

router.patch("/:id/draft", h(async (req, res) => {
  res.json(await svc.atualizarRascunho(req.params.id, req.body, req.authUser));
}));

router.post("/:id/retry", h(async (req, res) => {
  res.status(202).json(await svc.repetir(req.params.id, req.body, req.authUser));
}));

router.post("/:id/confirm", h(async (req, res) => {
  res.json(await svc.confirmar(req.params.id, req.body, req.authUser));
}));

router.post("/:id/cancel", h(async (req, res) => {
  res.json(await svc.cancelar(req.params.id, req.body, req.authUser));
}));

module.exports = { router };
