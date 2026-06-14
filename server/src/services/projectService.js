// Regras de negócio dos projetos. Carrega via repo, aplica operação pura de
// domínio, persiste. Igual para memória ou Mongo.
const { getRepo } = require("../repos");
const notificationService = require("./notificationService");
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
const nowIso = () => new Date().toISOString();

function cleanCommentAttachments(attachments = []) {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .slice(0, 3)
    .map((item) => {
      const url = String((item && item.url) || "").trim();
      const mimeType = String((item && item.mimeType) || "").trim();
      if (!url || !mimeType.startsWith("image/")) return null;
      if (!url.startsWith("data:image/") && !url.startsWith("https://") && !url.startsWith("http://")) return null;
      return {
        id: String(item.id || uid("att")),
        name: String(item.name || "imagem").trim().slice(0, 140),
        mimeType,
        size: Number(item.size) || undefined,
        url
      };
    })
    .filter(Boolean);
}

const DEFAULT_SECURITY_CHECKS = [
  "Acessos revisados",
  "Tokens e senhas fora de comentários",
  "Cliente visualiza apenas projetos liberados",
  "Dados sensíveis não expostos no portal do cliente"
];

function checklistTaskStatus(phase, item) {
  if (item.done) return "concluida";
  if (phase.status === "bloqueada") return "bloqueada";
  if (phase.status === "em_andamento") return "em_andamento";
  return "aberta";
}

function syncTasksFromChecklist(project) {
  const manual = (project.tasks || []).filter((task) => task.source !== "checklist");
  const createdAt = project.startDate || project.updatedAt || nowIso();
  const checklistTasks = (project.phases || []).flatMap((phase) =>
    (phase.checklist || []).map((item) => ({
      id: `task-${item.id}`,
      projectId: project.id,
      phaseId: phase.id,
      checklistItemId: item.id,
      title: item.label,
      status: checklistTaskStatus(phase, item),
      source: "checklist",
      ownerId: item.ownerId || phase.ownerId,
      dueDate: phase.dueDate,
      clientResponsibility: !!item.clientResponsibility,
      createdAt,
      updatedAt: item.doneAt || project.updatedAt,
      completedAt: item.doneAt
    }))
  );
  project.tasks = [...checklistTasks, ...manual];
}

function normalizeProject(project) {
  if (!project) return project;
  project.phases = project.phases || [];
  project.clientEmails = project.clientEmails || [];
  project.collaborators = project.collaborators || [];
  project.charges = project.charges || [];
  project.scopeFiles = project.scopeFiles || [];
  project.timeEntries = project.timeEntries || [];
  project.attachments = project.attachments || [];
  project.tracking = {
    scopeStatus: "pendente",
    estimatedHours: 0,
    usedHours: (project.timeEntries || [])
      .filter((entry) => entry.kind === "realizado")
      .reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0),
    deadlineConfidence: "no_prazo",
    ...(project.tracking || {})
  };
  project.security = {
    checklist: DEFAULT_SECURITY_CHECKS.map((label, index) => ({
      id: `sec-${index + 1}`,
      label,
      done: false
    })),
    ...(project.security || {})
  };
  project.security.checklist = project.security.checklist || [];
  syncTasksFromChecklist(project);
  return project;
}

/**
 * Remove o conteúdo (base64) dos arquivos de escopo, mantendo só os metadados.
 * Usado nas LISTAGENS: o conteúdo pesa muito e só é preciso no detalhe/download.
 * `hasFile` sinaliza que existe arquivo salvo (sem trafegar os bytes).
 */
function stripScopeContent(project) {
  if (!project || !Array.isArray(project.scopeFiles)) return project;
  project.scopeFiles = project.scopeFiles.map((file) => {
    if (!file || !file.url) return file;
    const rest = { ...file };
    delete rest.url;
    return { ...rest, hasFile: true };
  });
  return project;
}

async function listProjects() {
  const projects = await getRepo().listProjects();
  return projects.map(normalizeProject).map(stripScopeContent);
}

async function getProject(id) {
  return normalizeProject(await getRepo().getProject(id));
}

async function listProjectsForClient(email) {
  const target = norm(email);
  const all = await getRepo().listProjects();
  return all
    .map(normalizeProject)
    .filter((p) => (p.clientEmails || []).some((e) => norm(e) === target))
    .map((p) => toClientProject(p, target))
    .map(stripScopeContent);
}

/** Projeto específico, só se o e-mail do cliente tiver acesso liberado. */
async function getProjectForClient(id, email) {
  const target = norm(email);
  const p = normalizeProject(await getRepo().getProject(id));
  if (!p) return null;
  const allowed = (p.clientEmails || []).some((e) => norm(e) === target);
  return allowed ? toClientProject(p, target) : null;
}

/** Recorte seguro do projeto para o portal do cliente. */
function toClientProject(project, clientEmail) {
  return {
    ...project,
    clientEmails: (project.clientEmails || []).filter((e) => norm(e) === clientEmail),
    collaborators: [],
    phases: (project.phases || []).filter((ph) => ph.clientVisible !== false),
    tasks: (project.tasks || []).filter((task) => !!task.clientResponsibility),
    charges: (project.charges || []).filter((charge) => charge.ownerSide === "cliente"),
    timeEntries: [],
    security: undefined
  };
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
    collaborators: [],
    charges: [],
    scopeFiles: [],
    timeEntries: [],
    attachments: [],
    tracking: { scopeStatus: "pendente", estimatedHours: 0, usedHours: 0, deadlineConfidence: "no_prazo" },
    security: {
      checklist: DEFAULT_SECURITY_CHECKS.map((label, index) => ({ id: `sec-${index + 1}`, label, done: false }))
    },
    history: [makeHistory("projeto_criado", "Projeto criado")],
    nps: null,
    supportHours: { ...DEFAULT_SUPPORT_HOURS },
    finalization: JSON.parse(JSON.stringify(DEFAULT_FINALIZATION))
  };
  normalizeProject(project);
  const cp = currentPhase(phases);
  project.currentPhaseId = cp ? cp.id : undefined;
  await repo.insertProject({ ...project, tasks: persistableTasks(project) });
  return project;
}

/** Exclui um projeto. */
async function deleteProject(id) {
  await getRepo().deleteProject(id);
  return { id, deleted: true };
}

/**
 * Só tarefas manuais vão pro banco. As de checklist são derivadas na leitura
 * (syncTasksFromChecklist), então gravá-las duplicaria a fonte de verdade.
 */
function persistableTasks(project) {
  return (project.tasks || []).filter((task) => task.source !== "checklist");
}

/** Helper: carrega, aplica `fn(project)`, persiste e retorna o projeto. */
async function mutateProject(id, fn) {
  const repo = getRepo();
  const project = await repo.getProject(id);
  if (!project) return null;
  normalizeProject(project);
  fn(project);
  normalizeProject(project);
  // Persiste apenas a fonte de verdade (checklist + tarefas manuais); as tarefas
  // de checklist são reconstruídas na próxima leitura.
  await repo.updateProject({ ...project, tasks: persistableTasks(project) });
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

/** Define os colaboradores (usuários que recebem notificações do projeto). */
async function updateCollaborators(id, userIds = []) {
  const clean = [...new Set((userIds || []).map((x) => String(x)).filter(Boolean))];
  return mutateProject(id, (p) => {
    p.collaborators = clean;
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
    ph.checklist.push({ id: uid("chk"), label: clean, done: false, ownerId: undefined, clientResponsibility: false, comments: [] });
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
    if (patch.ownerId !== undefined) item.ownerId = patch.ownerId || undefined;
    if (typeof patch.clientResponsibility === "boolean") item.clientResponsibility = patch.clientResponsibility;
    p.updatedAt = new Date().toISOString();
  });
}

/** Adiciona um comentário a uma subtarefa (Nairuz ou cliente). */
async function addChecklistComment(id, phaseId, itemId, { authorType, authorId, authorName, body, mentionedUserIds, attachments } = {}) {
  const text = String(body || "").trim();
  const cleanAttachments = cleanCommentAttachments(attachments);
  if (!text && cleanAttachments.length === 0) return getProject(id);
  const mentions = Array.isArray(mentionedUserIds) ? mentionedUserIds.filter(Boolean) : [];
  const project = await mutateProject(id, (p) => {
    const ph = p.phases.find((x) => x.id === phaseId);
    const item = ph && ph.checklist.find((c) => c.id === itemId);
    if (!item) return;
    if (!Array.isArray(item.comments)) item.comments = [];
    item.comments.push({
      id: uid("cmt"),
      authorId: String(authorId || "").trim() || undefined,
      authorType: authorType === "cliente" ? "cliente" : "nairuz",
      authorName: String(authorName || "").trim() || (authorType === "cliente" ? "Cliente" : "Nairuz"),
      body: text,
      attachments: cleanAttachments,
      mentionedUserIds: mentions,
      createdAt: new Date().toISOString()
    });
    p.updatedAt = new Date().toISOString();
  });
  if (project) {
    const ph = project.phases.find((x) => x.id === phaseId);
    const item = ph && ph.checklist.find((c) => c.id === itemId);
    const label = item ? item.label + ": " : "";
    const notificationBody = text || `${cleanAttachments.length} imagem(ns) enviada(s)`;
    const who = String(authorName || "").trim() || (authorType === "cliente" ? "Cliente" : "Nairuz");
    // Comentário do cliente avisa os colaboradores do projeto.
    if (authorType === "cliente") {
      await notificationService.notifyProject(project, {
        type: "comentario",
        title: `Comentário do cliente — ${project.clientName}`,
        body: `${label}${notificationBody}`,
        link: `/projetos/${project.id}`
      });
    }
    // Menções avisam diretamente os usuários citados.
    if (mentions.length > 0) {
      await notificationService.createForUsers(mentions, {
        type: "mencao",
        title: `${who} mencionou você — ${project.clientName}`,
        body: `${label}${notificationBody}`,
        link: `/projetos/${project.id}`
      });
    }
  }
  return project;
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
  const project = await mutateProject(id, (p) => {
    p.nps = {
      score: Math.max(0, Math.min(10, Math.round(Number(score) || 0))),
      comment: (comment && String(comment).trim()) || undefined,
      answeredAt: new Date().toISOString()
    };
    p.updatedAt = new Date().toISOString();
  });
  if (project && project.nps) {
    await notificationService.notifyProject(project, {
      type: "nps",
      title: `NPS recebido — ${project.clientName}`,
      body: `Nota ${project.nps.score}${project.nps.comment ? ` · "${project.nps.comment}"` : ""}`,
      link: `/projetos/${project.id}`
    });
  }
  return project;
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

async function addTask(id, input = {}) {
  const title = String(input.title || "").trim();
  if (!title) return getProject(id);
  return mutateProject(id, (p) => {
    p.tasks.push({
      id: uid("task"),
      projectId: id,
      title,
      status: input.status || "aberta",
      source: "manual",
      ownerId: input.ownerId || undefined,
      dueDate: input.dueDate || undefined,
      clientResponsibility: !!input.clientResponsibility,
      createdAt: nowIso()
    });
    p.updatedAt = nowIso();
  });
}

async function updateTask(id, taskId, patch = {}) {
  return mutateProject(id, (p) => {
    const task = (p.tasks || []).find((item) => item.id === taskId);
    if (!task) return;
    if (typeof patch.title === "string" && patch.title.trim()) task.title = patch.title.trim();
    if (patch.status) task.status = patch.status;
    if (patch.ownerId !== undefined) task.ownerId = patch.ownerId || undefined;
    if (patch.dueDate !== undefined) task.dueDate = patch.dueDate || undefined;
    if (typeof patch.clientResponsibility === "boolean") task.clientResponsibility = patch.clientResponsibility;
    task.updatedAt = nowIso();
    task.completedAt = task.status === "concluida" ? (task.completedAt || nowIso()) : undefined;

    if (task.source === "checklist" && task.phaseId && task.checklistItemId) {
      const phase = p.phases.find((ph) => ph.id === task.phaseId);
      const item = phase && phase.checklist.find((check) => check.id === task.checklistItemId);
      if (phase && item) {
        if (patch.ownerId !== undefined) item.ownerId = patch.ownerId || undefined;
        if (patch.status) {
          item.done = task.status === "concluida";
          item.doneAt = item.done ? (item.doneAt || nowIso()) : undefined;
          syncPhaseStatus(phase);
          recompute(p);
        }
      }
    }
    p.updatedAt = nowIso();
  });
}

async function addCharge(id, input = {}) {
  const title = String(input.title || "").trim();
  if (!title) return getProject(id);
  return mutateProject(id, (p) => {
    p.charges.push({
      id: uid("chg"),
      projectId: id,
      title,
      description: String(input.description || "").trim() || undefined,
      ownerSide: input.ownerSide || "cliente",
      ownerId: input.ownerId || undefined,
      status: "aberta",
      priority: input.priority || "medio",
      dueDate: input.dueDate || undefined,
      createdAt: nowIso()
    });
    p.updatedAt = nowIso();
  });
}

async function updateCharge(id, chargeId, patch = {}) {
  return mutateProject(id, (p) => {
    const charge = (p.charges || []).find((item) => item.id === chargeId);
    if (!charge) return;
    if (typeof patch.title === "string" && patch.title.trim()) charge.title = patch.title.trim();
    if (patch.description !== undefined) charge.description = String(patch.description || "").trim() || undefined;
    if (patch.ownerSide) charge.ownerSide = patch.ownerSide;
    if (patch.ownerId !== undefined) charge.ownerId = patch.ownerId || undefined;
    if (patch.priority) charge.priority = patch.priority;
    if (patch.dueDate !== undefined) charge.dueDate = patch.dueDate || undefined;
    if (patch.status) {
      charge.status = patch.status;
      charge.resolvedAt = patch.status === "resolvida" ? (charge.resolvedAt || nowIso()) : undefined;
    }
    charge.updatedAt = nowIso();
    p.updatedAt = nowIso();
  });
}

async function updateTracking(id, patch = {}) {
  return mutateProject(id, (p) => {
    p.tracking = {
      ...p.tracking,
      ...patch,
      estimatedHours: Math.max(0, Number(patch.estimatedHours ?? p.tracking.estimatedHours) || 0),
      usedHours: Math.max(0, Number(patch.usedHours ?? p.tracking.usedHours) || 0),
      updatedAt: nowIso()
    };
    p.updatedAt = nowIso();
  });
}

async function addScopeFile(id, input = {}) {
  const name = String(input.name || "").trim();
  if (!name) return getProject(id);
  return mutateProject(id, (p) => {
    p.scopeFiles.push({
      id: uid("scp"),
      name,
      size: Number(input.size) || undefined,
      mimeType: input.mimeType || undefined,
      url: String(input.url || "").trim() || undefined,
      notes: String(input.notes || "").trim() || undefined,
      uploadedAt: nowIso(),
      uploadedBy: input.uploadedBy || "Nairuz"
    });
    if (p.tracking.scopeStatus === "pendente") p.tracking.scopeStatus = "recebido";
    p.tracking.updatedAt = nowIso();
    p.updatedAt = nowIso();
  });
}

async function addTimeEntry(id, input = {}) {
  const hours = Math.max(0, Number(input.hours) || 0);
  const label = String(input.label || "").trim();
  if (!hours || !label) return getProject(id);
  return mutateProject(id, (p) => {
    p.timeEntries.push({
      id: uid("time"),
      label,
      hours,
      kind: input.kind === "planejado" ? "planejado" : "realizado",
      ownerId: input.ownerId || undefined,
      loggedAt: nowIso()
    });
    const used = p.timeEntries
      .filter((entry) => entry.kind === "realizado")
      .reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0);
    p.tracking.usedHours = used;
    p.tracking.updatedAt = nowIso();
    p.updatedAt = nowIso();
  });
}

async function updateSecurity(id, checklist = []) {
  return mutateProject(id, (p) => {
    p.security = {
      lastReviewAt: nowIso(),
      checklist: checklist.map((item, index) => ({
        id: item.id || `sec-${index + 1}`,
        label: String(item.label || "").trim(),
        done: !!item.done,
        updatedAt: nowIso()
      })).filter((item) => item.label)
    };
    p.updatedAt = nowIso();
  });
}

module.exports = {
  listProjects,
  getProject,
  listProjectsForClient,
  getProjectForClient,
  listTeam,
  listOrganizations,
  createOrganization,
  createProject,
  deleteProject,
  updateProjectStatus,
  addPhase,
  updatePhase,
  updateProjectOwners,
  updateCollaborators,
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
  updateSupportHours,
  addTask,
  updateTask,
  addCharge,
  updateCharge,
  updateTracking,
  addScopeFile,
  addTimeEntry,
  updateSecurity
};
