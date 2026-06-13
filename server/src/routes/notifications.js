const express = require("express");
const svc = require("../services/notificationService");

// Montado atrás de requireAuth (ver app.js): cada usuário vê só as suas.
const router = express.Router();
const h = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => {
  res.status(e.status || 500).json({ error: e.message || "server_error" });
});

router.get("/", h(async (req, res) => {
  const userId = req.authUser.id;
  const [items, unread] = await Promise.all([svc.list(userId), svc.unreadCount(userId)]);
  res.json({ items, unread });
}));

router.post("/:id/read", h(async (req, res) => {
  await svc.markRead(req.params.id, req.authUser.id);
  res.json({ ok: true });
}));

router.post("/read-all", h(async (req, res) => {
  await svc.markAllRead(req.authUser.id);
  res.json({ ok: true });
}));

module.exports = { router };
