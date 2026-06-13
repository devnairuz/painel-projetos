const express = require("express");
const svc = require("../services/companyAuthService");
const { requireRole } = require("../middleware/requireAuth");

// Montado já atrás de requireAuth (ver app.js). Gestão é só de admin.
const router = express.Router();
const h = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => {
  res.status(e.status || 500).json({ error: e.message || "server_error" });
});

// Lista enxuta para menções/colaboradores — qualquer usuário logado.
router.get("/mentionable", h(async (_req, res) => {
  const users = await svc.listUsers();
  res.json(
    users
      .filter((u) => u.active !== false)
      .map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role })),
  );
}));

router.get("/", requireRole("admin"), h(async (_req, res) => res.json(await svc.listUsers())));
router.patch("/:id", requireRole("admin"), h(async (req, res) =>
  res.json(await svc.updateUser(req.params.id, req.body))
));

module.exports = { router };
