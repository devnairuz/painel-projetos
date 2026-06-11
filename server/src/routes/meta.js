const express = require("express");
const svc = require("../services/projectService");

const router = express.Router();
const h = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => {
  res.status(e.status || 500).json({ error: e.message || "server_error" });
});

router.get("/team", (_req, res) => res.json(svc.listTeam()));

router.get("/organizations", h(async (_req, res) => res.json(await svc.listOrganizations())));
router.post("/organizations", h(async (req, res) =>
  res.status(201).json(await svc.createOrganization(req.body))
));

module.exports = { router };
