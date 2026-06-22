const express = require("express");
const svc = require("../services/projectService");

const router = express.Router();
const h = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => {
  res.status(e.status || 500).json({ error: e.message || "server_error" });
});

// Cronômetro do usuário logado (1 ativo por vez). O usuário vem do JWT.
router.get("/current", h(async (req, res) => {
  res.json({ timer: await svc.getCurrentTimer(req.authUser.id) });
}));

router.post("/start", h(async (req, res) => {
  res.json(await svc.startTimer(req.authUser.id, req.body || {}));
}));

router.post("/stop", h(async (req, res) => {
  res.json(await svc.stopTimer(req.authUser.id));
}));

module.exports = { router };
