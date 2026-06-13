const express = require("express");
const svc = require("../services/projectService");

// Montado atrás de requireClientAuth (ver app.js). Tudo escopado ao e-mail do
// cliente logado — ele só enxerga/age nos projetos onde foi liberado.
const router = express.Router();
const h = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => {
  res.status(e.status || 500).json({ error: e.message || "server_error" });
});

/** Garante que o cliente tem acesso ao projeto; senão 404. */
async function authorized(req, res) {
  const project = await svc.getProjectForClient(req.params.id, req.clientEmail);
  if (!project) {
    res.status(404).json({ error: "project_not_found" });
    return null;
  }
  return project;
}

function findPhase(project, phaseId) {
  return (project.phases || []).find((phase) => phase.id === phaseId);
}

function findClientTask(phase, itemId) {
  return (phase.checklist || []).find((item) => item.id === itemId && item.clientResponsibility);
}

router.get("/projects", h(async (req, res) => {
  res.json(await svc.listProjectsForClient(req.clientEmail));
}));

router.get("/projects/:id", h(async (req, res) => {
  const project = await authorized(req, res);
  if (project) res.json(project);
}));

router.post("/projects/:id/phases/:phaseId/approve", h(async (req, res) => {
  const project = await authorized(req, res);
  if (!project) return;
  const phase = findPhase(project, req.params.phaseId);
  if (!phase || !phase.requiresApproval) {
    return res.status(404).json({ error: "phase_not_found" });
  }
  await svc.approvePhase(req.params.id, req.params.phaseId);
  res.json(await svc.getProjectForClient(req.params.id, req.clientEmail));
}));

router.post("/projects/:id/nps", h(async (req, res) => {
  if (!(await authorized(req, res))) return;
  await svc.answerNps(req.params.id, req.body.score, req.body.comment);
  res.json(await svc.getProjectForClient(req.params.id, req.clientEmail));
}));

router.post("/projects/:id/phases/:phaseId/items/:itemId/comments", h(async (req, res) => {
  const project = await authorized(req, res);
  if (!project) return;
  const phase = findPhase(project, req.params.phaseId);
  const item = phase && findClientTask(phase, req.params.itemId);
  if (!phase || !item) {
    return res.status(404).json({ error: "task_not_found" });
  }
  await svc.addChecklistComment(req.params.id, req.params.phaseId, req.params.itemId, {
      authorType: "cliente",
      authorName: req.clientName,
      body: req.body.body
    });
  res.json(await svc.getProjectForClient(req.params.id, req.clientEmail));
}));

module.exports = { router };
