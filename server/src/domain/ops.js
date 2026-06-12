// Operações puras de domínio sobre um "project" (objeto plano).
// Reutilizadas pelos dois repositórios (memória e Mongo) — fonte única da regra.

const { PRODUCT_TEMPLATES } = require("./constants");

let seq = 0;
function uid(prefix) {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function computeProgress(phases) {
  let done = 0;
  let total = 0;
  for (const p of phases) {
    done += p.checklist.filter((c) => c.done).length;
    total += p.checklist.length;
  }
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

function currentPhase(phases) {
  const ordered = [...phases].sort((a, b) => a.order - b.order);
  return ordered.find((p) => p.status !== "concluida") || ordered[ordered.length - 1];
}

function daysUntil(iso) {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const ms = d.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function deriveRisk(project) {
  const hasBlocked = project.phases.some((p) => p.status === "bloqueada");
  const days = daysUntil(project.goLiveDate);
  if (project.status === "cancelado" || project.status === "encerrado") return "baixo";
  if (hasBlocked) return "critico";
  if (days !== undefined && days < 0) return "critico";
  if (days !== undefined && days <= 7) return "alto";
  if (project.status === "aguardando_cliente" || project.status === "aguardando_terceiro") return "medio";
  return "baixo";
}

/** Recalcula campos derivados in-place. */
function recompute(project) {
  project.progress = computeProgress(project.phases);
  project.risk = deriveRisk(project);
  const cp = currentPhase(project.phases);
  project.currentPhaseId = cp ? cp.id : undefined;
  project.updatedAt = new Date().toISOString();
}

/**
 * Ajusta status da fase a partir do checklist. Tudo concluído ⇒ "concluida"
 * (vence a espera). "bloqueada" sempre preservada; "aguardando_cliente" só
 * enquanto houver itens em aberto.
 */
function syncPhaseStatus(phase) {
  if (phase.status === "bloqueada") return;
  const total = phase.checklist.length;
  const done = phase.checklist.filter((c) => c.done).length;
  if (total > 0 && done === total) {
    phase.status = "concluida";
    return;
  }
  if (phase.status === "aguardando_cliente") return;
  phase.status = done === 0 || total === 0 ? "nao_iniciada" : "em_andamento";
}

function makeHistory(type, label) {
  return { id: uid("h"), type, label, at: new Date().toISOString(), actor: "Nairuz" };
}

function phasesFromTemplate(projectId, product) {
  const tpl = PRODUCT_TEMPLATES[product] || PRODUCT_TEMPLATES.ecommerce;
  return tpl.map((t, idx) => ({
    id: uid("ph"),
    projectId,
    order: idx + 1,
    name: t.name,
    status: "nao_iniciada",
    checklist: t.checklist.map((label) => ({ id: uid("chk"), label, done: false })),
    clientApproved: false,
    clientVisible: true,
    requiresApproval: false,
    points: 10
  }));
}

module.exports = {
  uid,
  computeProgress,
  currentPhase,
  deriveRisk,
  recompute,
  syncPhaseStatus,
  makeHistory,
  phasesFromTemplate
};
