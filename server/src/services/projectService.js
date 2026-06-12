// Regras de negócio dos projetos. Carrega via repo, aplica operação pura de
// domínio, persiste. Igual para memória ou Mongo.
const { getRepo } = require("../repos");
const { TEAM } = require("../data/seed");
const { DEFAULT_FINALIZATION, DEFAULT_SUPPORT_HOURS } = require("../domain/constants");
const {
  uid,
  recompute,
  syncPhaseStatus,
  makeHistory,
  phasesFromTemplate,
  currentPhase
} = require("../domain/ops");

const norm = (s) => String(s || "").trim().toLowerCase();

async function listProjects() {
  return getRepo().listProjects();
}

async function getProject(id) {
  return getRepo().getProject(id);
}

async function listProjectsForClient(email) {
  const target = norm(email);
  const all = await getRepo().listProjects();
  return all.filter((p) => (p.clientEmails || []).some((e) => norm(e) === target));
}

function listTeam() {
  return TEAM;
}
async function listOrganizations() {
  return getRepo().listOrganizations();
}
async function createOrganization({ name, segment }) {
  const clean = String(name || "").trim();
  if (!clean) {
    const err = new Error("Nome da organização é obrigatório.");
    err.status = 400;
    throw err;
  }
  const org = { id: uid("org"), name: clean, segment: String(segment || "").trim() };
  await getRepo().insertOrganization(org);
  return org;
}

async function createProject(input) {
  const repo = getRepo();
  const id = uid("prj");
  const phases = phasesFromTemplate(id, input.product);
  const seqNumber = (await repo.countProjects()) + 1;
  const project = {
    id,
    code: `PRJ-${String(seqNumber).padStart(3, "0")}`,
    clientName: input.clientName,
    organizationId: input.organizationId,
    platform: input.platform,
    type: input.type,
    product: input.product,
    status: "nao_iniciado",
    startDate: new Date().toISOString(),
    goLiveDate: input.goLiveDate || undefined,
    progress: 0,
    risk: "baixo",
    nextAction: undefined,
    updatedAt: new Date().toISOString(),
    owners: input.owners || {},
    phases,
    clientEmails: [],
    history: [makeHistory("projeto_criado", "Projeto criado")],
    nps: null,
    supportHours: { ...DEFAULT_SUPPORT_HOURS },
    finalization: JSON.parse(JSON.stringify(DEFAULT_FINALIZATION))
  };
  const cp = currentPhase(phases);
  project.currentPhaseId = cp ? cp.id : undefined;
  await repo.insertProject(project);
  return project;
}

/** Exclui um projeto. */
async function deleteProject(id) {
  await getRepo().deleteProject(id);
  return { id, deleted: true };
}

/** Helper: carrega, aplica `fn(project)`, persiste e retorna o projeto. */
async function mutateProject(id, fn) {
  const repo = getRepo();
  const project = await repo.getProject(id);
  if (!project) return null;
  fn(project);
  await repo.updateProject(project);
  return project;
}

async function updateProjectStatus(id, status) {
  return mutateProject(id, (p) => {
    p.status = status;
    recompute(p);
  });
}

async function addPhase(id, name) {
  const clean = String(name || "").trim();
  if (!clean) return getProject(id);
  return mutateProject(id, (p) => {
    const order = p.phases.reduce((m, ph) => Math.max(m, ph.order), 0) + 1;
    p.phases.push({
      id: uid("ph"), projectId: id, order, name: clean, status: "nao_iniciada",
      checklist: [], clientApproved: false, clientVisible: true, requiresApproval: false, points: 10
    });
    p.history.push(makeHistory("fase_adicionada", `Etapa "${clean}" adicionada`));
    recompute(p);
  });
}

/**
 * Atualiza uma etapa: nome (com histórico), visibilidade ao cliente, exigência
 * de aprovação, pontos e responsável. Aplica só os campos presentes em `patch`.
 */
async function updatePhase(id, phaseId, patch = {}) {
  return mutateProject(id, (p) => {
    const ph = p.phases.find((x) => x.id === phaseId);
    if (!ph) return;
    if (typeof patch.name === "string") {
      const clean = patch.name.trim();
      if (clean && clean !== ph.name) {
        const old = ph.name;
        ph.name = clean;
        p.history.push(makeHistory("fase_renomeada", `Etapa "${old}" renomeada para "${clean}"`));
      }
    }
    if (typeof patch.clientVisible === "boolean") ph.clientVisible = patch.clientVisible;
    if (typeof patch.requiresApproval === "boolean") ph.requiresApproval = patch.requiresApproval;
    if (patch.points !== undefined) ph.points = Math.max(0, Number(patch.points) || 0);
    if (patch.ownerId !== undefined) ph.ownerId = patch.ownerId || undefined;
    if (patch.startDate !== undefined) ph.startDate = patch.startDate || undefined;
    if (patch.dueDate !== undefined) ph.dueDate = patch.dueDate || undefined;
    if (patch.finishedDate !== undefined) ph.finishedDate = patch.finishedDate || undefined;
    p.updatedAt = new Date().toISOString();
  });
}

/** Atualiza os responsáveis do projeto (CS, Tech Lead, Designer, contato cliente). */
async function updateProjectOwners(id, owners = {}) {
  return mutateProject(id, (p) => {
    p.owners = { ...p.owners, ...owners };
    p.updatedAt = new Date().toISOString();
  });
}

async function removePhase(id, phaseId) {
  return mutateProject(id, (p) => {
    const ph = p.phases.find((x) => x.id === phaseId);
    if (!ph) return;
    p.phases = p.phases.filter((x) => x.id !== phaseId);
    p.history.push(makeHistory("fase_removida", `Etapa "${ph.name}" removida`));
    recompute(p);
  });
}

async function toggleChecklistItem(id, phaseId, itemId) {
  return mutateProject(id, (p) => {
    const ph = p.phases.find((x) => x.id === phaseId);
    const item = ph && ph.checklist.find((c) => c.id === itemId);
    if (!ph || !item) return;
    item.done = !item.done;
    item.doneAt = item.done ? new Date().toISOString() : undefined;
    if (item.done && ph.checklist.every((c) => c.done) && ph.checklist.length > 0 && !ph.finishedDate) {
      ph.finishedDate = new Date().toISOString();
    }
    syncPhaseStatus(ph);
    recompute(p);
  });
}

async function addChecklistItem(id, phaseId, label) {
  const clean = String(label || "").trim();
  if (!clean) return getProject(id);
  return mutateProject(id, (p) => {
    const ph = p.phases.find((x) => x.id === phaseId);
    if (!ph) return;
    ph.checklist.push({ id: uid("chk"), label: clean, done: false, clientResponsibility: false, comments: [] });
    syncPhaseStatus(ph);
    recompute(p);
  });
}

/** Atualiza uma subtarefa: rótulo e/ou responsabilidade do cliente. */
async function updateChecklistItem(id, phaseId, itemId, patch = {}) {
  return mutateProject(id, (p) => {
    const ph = p.phases.find((x) => x.id === phaseId);
    const item = ph && ph.checklist.find((c) => c.id === itemId);
    if (!item) return;
    if (typeof patch.label === "string" && patch.label.trim()) item.label = patch.label.trim();
    if (typeof patch.clientResponsibility === "boolean") item.clientResponsibility = patch.clientResponsibility;
    p.updatedAt = new Date().toISOString();
  });
}

/** Adiciona um comentário a uma subtarefa (Nairuz ou cliente). */
async function addChecklistComment(id, phaseId, itemId, { authorType, authorName, body } = {}) {
  const text = String(body || "").trim();
  if (!text) return getProject(id);
  return mutateProject(id, (p) => {
    const ph = p.phases.find((x) => x.id === phaseId);
    const item = ph && ph.checklist.find((c) => c.id === itemId);
    if (!item) return;
    if (!Array.isArray(item.comments)) item.comments = [];
    item.comments.push({
      id: uid("cmt"),
      authorType: authorType === "cliente" ? "cliente" : "nairuz",
      authorName: String(authorName || "").trim() || (authorType === "cliente" ? "Cliente" : "Nairuz"),
      body: text,
      createdAt: new Date().toISOString()
    });
    p.updatedAt = new Date().toISOString();
  });
}

async function removeChecklistItem(id, phaseId, itemId) {
  return mutateProject(id, (p) => {
    const ph = p.phases.find((x) => x.id === phaseId);
    if (!ph) return;
    ph.checklist = ph.checklist.filter((c) => c.id !== itemId);
    syncPhaseStatus(ph);
    recompute(p);
  });
}

async function approvePhase(id, phaseId) {
  return mutateProject(id, (p) => {
    const ph = p.phases.find((x) => x.id === phaseId);
    if (!ph) return;
    const now = new Date().toISOString();
    ph.clientApproved = true;
    ph.clientApprovedAt = now;
    // Finalizada segue a data da aprovação do cliente.
    ph.finishedDate = now;
    recompute(p);
  });
}

async function grantClientAccess(id, email) {
  const clean = norm(email);
  return mutateProject(id, (p) => {
    if (!clean) return;
    if (!(p.clientEmails || []).some((e) => norm(e) === clean)) {
      p.clientEmails = [...(p.clientEmails || []), clean];
    }
    p.updatedAt = new Date().toISOString();
  });
}

async function revokeClientAccess(id, email) {
  const clean = norm(email);
  return mutateProject(id, (p) => {
    p.clientEmails = (p.clientEmails || []).filter((e) => norm(e) !== clean);
    p.updatedAt = new Date().toISOString();
  });
}

async function answerNps(id, score, comment) {
  return mutateProject(id, (p) => {
    p.nps = {
      score: Math.max(0, Math.min(10, Math.round(Number(score) || 0))),
      comment: (comment && String(comment).trim()) || undefined,
      answeredAt: new Date().toISOString()
    };
    p.updatedAt = new Date().toISOString();
  });
}

async function updateFinalization(id, finalization) {
  return mutateProject(id, (p) => {
    p.finalization = finalization;
    p.updatedAt = new Date().toISOString();
  });
}

async function updateSupportHours(id, hours) {
  return mutateProject(id, (p) => {
    p.supportHours = { antes: Number(hours.antes) || 0, depois: Number(hours.depois) || 0 };
    p.updatedAt = new Date().toISOString();
  });
}

module.exports = {
  listProjects,
  getProject,
  listProjectsForClient,
  listTeam,
  listOrganizations,
  createOrganization,
  createProject,
  deleteProject,
  updateProjectStatus,
  addPhase,
  updatePhase,
  updateProjectOwners,
  removePhase,
  toggleChecklistItem,
  addChecklistItem,
  updateChecklistItem,
  addChecklistComment,
  removeChecklistItem,
  approvePhase,
  grantClientAccess,
  revokeClientAccess,
  answerNps,
  updateFinalization,
  updateSupportHours
};
