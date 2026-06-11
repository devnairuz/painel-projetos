// Seed compartilhado pelos repositórios. Constrói projetos completos a partir
// dos templates, marcando algumas fases como concluídas para ficar realista.

const { DEFAULT_SUPPORT_HOURS, DEFAULT_FINALIZATION } = require("../domain/constants");
const { phasesFromTemplate, recompute, uid } = require("../domain/ops");

const TEAM = [
  { id: "u1", name: "Paulo Cavalcante", role: "tech_lead", avatarColor: "#52d09e" },
  { id: "u2", name: "Marina Alves", role: "cs", avatarColor: "#034c8c" },
  { id: "u3", name: "Rafael Lima", role: "designer", avatarColor: "#7c3aed" },
  { id: "u4", name: "Júlia Santos", role: "dev", avatarColor: "#db2777" },
  { id: "u5", name: "Bruno Costa", role: "pm", avatarColor: "#ea580c" },
  { id: "u6", name: "Carla Mendes", role: "cs", avatarColor: "#0d9488" }
];

const ORGANIZATIONS = [
  { id: "o1", name: "Loja Vivara", segment: "Joalheria" },
  { id: "o2", name: "Decathlon BR", segment: "Esportes" },
  { id: "o3", name: "Farmácia SaúdeMais", segment: "Saúde" },
  { id: "o4", name: "Móveis Castelo", segment: "Casa & Decoração" },
  { id: "o5", name: "PetClube", segment: "Pet" },
  { id: "o6", name: "TechParts", segment: "Eletrônicos" },
  { id: "o7", name: "Moda Aurora", segment: "Vestuário" }
];

const CLIENT_USERS = [
  { id: "c1", name: "Renata Souza", email: "renata@vivara.com", organizationId: "o1" },
  { id: "c2", name: "Diego Martins", email: "diego@decathlon.com", organizationId: "o2" },
  { id: "c3", name: "Sandra Lopes", email: "sandra@saudemais.com", organizationId: "o3" },
  { id: "c4", name: "Antônio Reis", email: "antonio@moveiscastelo.com", organizationId: "o4" },
  { id: "c5", name: "Luana Pires", email: "luana@petclube.com", organizationId: "o5" },
  { id: "c6", name: "Marcos Dias", email: "marcos@techparts.com", organizationId: "o6" },
  { id: "c7", name: "Patrícia Nunes", email: "patricia@modaaurora.com", organizationId: "o7" }
];

/**
 * Marca as `doneCount` primeiras fases como concluídas (checklist todo done) e,
 * opcionalmente, deixa a fase seguinte "em andamento" com `partial` itens.
 */
function applyProgress(phases, doneCount, opts = {}) {
  phases.forEach((ph, idx) => {
    if (idx < doneCount) {
      ph.status = "concluida";
      ph.checklist.forEach((c) => (c.done = true));
      ph.finishedDate = "2026-05-20T12:00:00.000Z";
      if (opts.approveUntil !== undefined && idx <= opts.approveUntil) {
        ph.clientApproved = true;
        ph.clientApprovedAt = "2026-05-25T12:00:00.000Z";
      }
    } else if (idx === doneCount && opts.currentStatus) {
      ph.status = opts.currentStatus;
      if (opts.partial) ph.checklist.slice(0, opts.partial).forEach((c) => (c.done = true));
      if (opts.dueDate) ph.dueDate = opts.dueDate;
      ph.ownerId = opts.currentOwner;
    }
  });
}

function buildProject(seed, seqNumber) {
  const id = uid("prj");
  const phases = phasesFromTemplate(id, seed.product || "ecommerce");
  applyProgress(phases, seed.doneCount || 0, seed.progressOpts || {});
  const project = {
    id,
    code: `PRJ-${String(seqNumber).padStart(3, "0")}`,
    clientName: seed.clientName,
    organizationId: seed.organizationId,
    platform: seed.platform,
    type: seed.type,
    product: seed.product || "ecommerce",
    status: seed.status,
    startDate: seed.startDate,
    goLiveDate: seed.goLiveDate,
    nextAction: seed.nextAction,
    owners: seed.owners,
    phases,
    clientEmails: seed.clientEmails || [],
    history: [{ id: uid("h"), type: "projeto_criado", label: "Projeto criado", at: seed.startDate, actor: "Nairuz" }],
    supportHours: { ...DEFAULT_SUPPORT_HOURS },
    finalization: JSON.parse(JSON.stringify(DEFAULT_FINALIZATION)),
    progress: 0,
    risk: "baixo",
    nps: null,
    updatedAt: seed.updatedAt
  };
  recompute(project);
  return project;
}

function seedProjects() {
  const seeds = [
    {
      clientName: "Loja Vivara", organizationId: "o1", platform: "vtex", type: "implantacao", status: "aguardando_cliente",
      startDate: "2026-03-10", goLiveDate: "2026-07-01", nextAction: "Cliente confirmar bandeiras aceitas no gateway",
      updatedAt: "2026-06-09T14:30:00.000Z", owners: { csId: "u2", techLeadId: "u1", designerId: "u3", clientContact: "Renata (Vivara)" },
      clientEmails: ["renata@vivara.com"], doneCount: 4, progressOpts: { approveUntil: 2, currentStatus: "aguardando_cliente", partial: 1, currentOwner: "u1", dueDate: "2026-06-15" }
    },
    {
      clientName: "Decathlon BR", organizationId: "o2", platform: "shopify", type: "implantacao", status: "qa",
      startDate: "2026-02-01", goLiveDate: "2026-06-18", nextAction: "Fechar bugs críticos do QA interno",
      updatedAt: "2026-06-10T09:10:00.000Z", owners: { csId: "u6", techLeadId: "u1", designerId: "u3", clientContact: "Diego (Decathlon)" },
      clientEmails: ["diego@decathlon.com"], doneCount: 9, progressOpts: { approveUntil: 2, currentStatus: "em_andamento", partial: 1, currentOwner: "u4", dueDate: "2026-06-14" }
    },
    {
      clientName: "Farmácia SaúdeMais", organizationId: "o3", platform: "linx", type: "implantacao", status: "em_andamento",
      startDate: "2026-04-15", goLiveDate: "2026-08-20", nextAction: "Aprovar layout de PDP",
      updatedAt: "2026-06-08T16:45:00.000Z", owners: { csId: "u2", techLeadId: "u1", designerId: "u3", clientContact: "Sandra (SaúdeMais)" },
      clientEmails: ["sandra@saudemais.com"], doneCount: 2, progressOpts: { approveUntil: 1, currentStatus: "aguardando_cliente", partial: 1, currentOwner: "u3", dueDate: "2026-06-20" }
    },
    {
      clientName: "Móveis Castelo", organizationId: "o4", platform: "woocommerce", type: "implantacao", status: "aguardando_nairuz",
      startDate: "2026-01-20", goLiveDate: "2026-06-12", nextAction: "Nairuz finalizar integração com ERP",
      updatedAt: "2026-06-10T11:00:00.000Z", owners: { csId: "u6", techLeadId: "u1", designerId: "u3", clientContact: "Antônio (Castelo)" },
      clientEmails: ["antonio@moveiscastelo.com"], doneCount: 7, progressOpts: { approveUntil: 2, currentStatus: "bloqueada", currentOwner: "u4", dueDate: "2026-06-05" }
    },
    {
      clientName: "PetClube", organizationId: "o5", platform: "tray", type: "evolucao", status: "homologacao",
      startDate: "2026-03-01", goLiveDate: "2026-06-25", nextAction: "Cliente validar ambiente de homologação",
      updatedAt: "2026-06-09T10:20:00.000Z", owners: { csId: "u2", techLeadId: "u1", designerId: "u3", clientContact: "Luana (PetClube)" },
      clientEmails: ["luana@petclube.com"], doneCount: 10, progressOpts: { approveUntil: 2, currentStatus: "aguardando_cliente", partial: 1, currentOwner: "u6", dueDate: "2026-06-22" }
    },
    {
      clientName: "TechParts", organizationId: "o6", platform: "wake", type: "implantacao", status: "pronto_go_live",
      startDate: "2026-02-10", goLiveDate: "2026-06-14", nextAction: "Agendar janela de go live com o cliente",
      updatedAt: "2026-06-10T08:00:00.000Z", owners: { csId: "u6", techLeadId: "u1", designerId: "u3", clientContact: "Marcos (TechParts)" },
      clientEmails: ["marcos@techparts.com"], doneCount: 11, progressOpts: { approveUntil: 2, currentStatus: "em_andamento", currentOwner: "u1", dueDate: "2026-06-14" }
    },
    {
      clientName: "Moda Aurora", organizationId: "o7", platform: "shopify", type: "sustentacao", status: "publicado",
      startDate: "2025-11-01", goLiveDate: "2026-02-15", nextAction: "Acompanhamento mensal de evolução",
      updatedAt: "2026-06-07T13:00:00.000Z", owners: { csId: "u2", techLeadId: "u1", designerId: "u3", clientContact: "Patrícia (Aurora)" },
      clientEmails: ["patricia@modaaurora.com"], doneCount: 13, progressOpts: { approveUntil: 2 }
    }
  ];
  return seeds.map((s, i) => buildProject(s, 14 - i));
}

module.exports = { TEAM, ORGANIZATIONS, CLIENT_USERS, seedProjects };
