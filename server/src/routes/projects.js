const express = require("express");
const svc = require("../services/projectService");

const router = express.Router();
const h = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => {
  res.status(e.status || 500).json({ error: e.message || "server_error" });
});
const notFound = (res) => res.status(404).json({ error: "project_not_found" });

router.get("/", h(async (_req, res) => res.json(await svc.listProjects())));

// /client precisa vir antes de /:id
router.get("/client", h(async (req, res) => {
  const email = req.query.email || req.header("x-user-email") || "";
  res.json(await svc.listProjectsForClient(String(email)));
}));

router.get("/:id", h(async (req, res) => {
  const p = await svc.getProject(req.params.id);
  return p ? res.json(p) : notFound(res);
}));

router.post("/", h(async (req, res) => res.status(201).json(await svc.createProject(req.body))));

router.patch("/:id/status", h(async (req, res) => {
  const p = await svc.updateProjectStatus(req.params.id, req.body.status);
  return p ? res.json(p) : notFound(res);
}));

router.patch("/:id/owners", h(async (req, res) => {
  const p = await svc.updateProjectOwners(req.params.id, req.body.owners || req.body);
  return p ? res.json(p) : notFound(res);
}));

router.post("/:id/phases", h(async (req, res) => {
  const p = await svc.addPhase(req.params.id, req.body.name);
  return p ? res.json(p) : notFound(res);
}));

router.patch("/:id/phases/:phaseId", h(async (req, res) => {
  const p = await svc.updatePhase(req.params.id, req.params.phaseId, req.body);
  return p ? res.json(p) : notFound(res);
}));

router.delete("/:id/phases/:phaseId", h(async (req, res) => {
  const p = await svc.removePhase(req.params.id, req.params.phaseId);
  return p ? res.json(p) : notFound(res);
}));

router.post("/:id/phases/:phaseId/toggle/:itemId", h(async (req, res) => {
  const p = await svc.toggleChecklistItem(req.params.id, req.params.phaseId, req.params.itemId);
  return p ? res.json(p) : notFound(res);
}));

router.post("/:id/phases/:phaseId/items", h(async (req, res) => {
  const p = await svc.addChecklistItem(req.params.id, req.params.phaseId, req.body.label);
  return p ? res.json(p) : notFound(res);
}));

router.patch("/:id/phases/:phaseId/items/:itemId", h(async (req, res) => {
  const p = await svc.renameChecklistItem(req.params.id, req.params.phaseId, req.params.itemId, req.body.label);
  return p ? res.json(p) : notFound(res);
}));

router.delete("/:id/phases/:phaseId/items/:itemId", h(async (req, res) => {
  const p = await svc.removeChecklistItem(req.params.id, req.params.phaseId, req.params.itemId);
  return p ? res.json(p) : notFound(res);
}));

router.post("/:id/phases/:phaseId/approve", h(async (req, res) => {
  const p = await svc.approvePhase(req.params.id, req.params.phaseId);
  return p ? res.json(p) : notFound(res);
}));

router.post("/:id/access", h(async (req, res) => {
  const p = await svc.grantClientAccess(req.params.id, req.body.email);
  return p ? res.json(p) : notFound(res);
}));

router.delete("/:id/access", h(async (req, res) => {
  const email = req.body.email || req.query.email;
  const p = await svc.revokeClientAccess(req.params.id, email);
  return p ? res.json(p) : notFound(res);
}));

router.post("/:id/nps", h(async (req, res) => {
  const p = await svc.answerNps(req.params.id, req.body.score, req.body.comment);
  return p ? res.json(p) : notFound(res);
}));

router.patch("/:id/finalization", h(async (req, res) => {
  const p = await svc.updateFinalization(req.params.id, req.body.finalization);
  return p ? res.json(p) : notFound(res);
}));

router.patch("/:id/support-hours", h(async (req, res) => {
  const p = await svc.updateSupportHours(req.params.id, req.body);
  return p ? res.json(p) : notFound(res);
}));

module.exports = { router };
