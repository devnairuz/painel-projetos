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
  { id: "o7", name: "Moda Aurora", segment: "Vestuário" },
  { id: "o8", name: "Rainha dos Gabinetes", segment: "Casa & Decoração" }
];

const CLIENT_USERS = [
  { id: "c1", name: "Renata Souza", email: "renata@vivara.com", organizationId: "o1" },
  { id: "c2", name: "Diego Martins", email: "diego@decathlon.com", organizationId: "o2" },
  { id: "c3", name: "Sandra Lopes", email: "sandra@saudemais.com", organizationId: "o3" },
  { id: "c4", name: "Antônio Reis", email: "antonio@moveiscastelo.com", organizationId: "o4" },
  { id: "c5", name: "Luana Pires", email: "luana@petclube.com", organizationId: "o5" },
  { id: "c6", name: "Marcos Dias", email: "marcos@techparts.com", organizationId: "o6" },
  { id: "c7", name: "Patrícia Nunes", email: "patricia@modaaurora.com", organizationId: "o7" },
  { id: "c8", name: "Camila Duarte", email: "implantacao@rainhadosgabinetes.com.br", organizationId: "o8" }
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

function rainhaId(prefix, phaseOrder, itemOrder) {
  const phase = String(phaseOrder).padStart(2, "0");
  const item = itemOrder === undefined ? "" : `-${String(itemOrder).padStart(2, "0")}`;
  return `${prefix}-rainha-${phase}${item}`;
}

function rainhaChecklist(items, defaultBloco, phaseOrder) {
  return items.map((item, index) => {
    const done = item.done !== undefined ? item.done : item.boardStatus === "concluido";
    const clientResponsibility = item.clientResponsibility !== undefined ? item.clientResponsibility : item.travaLevel === "trava_inicio";
    return {
      id: rainhaId("chk", phaseOrder, index + 1),
      label: item.label,
      done,
      doneAt: done ? "2026-06-30T12:00:00.000Z" : undefined,
      travaLevel: item.travaLevel,
      boardStatus: item.boardStatus || (done ? "concluido" : (clientResponsibility ? "responsabilidade_cliente" : "a_fazer")),
      bloco: item.bloco || defaultBloco,
      clientResponsibility
    };
  });
}

function buildRainhaPhase(projectId, order, name, items) {
  const checklist = rainhaChecklist(items, name, order);
  const doneCount = checklist.filter((item) => item.done).length;
  const hasActiveBoard = checklist.some((item) => item.boardStatus && item.boardStatus !== "a_fazer");
  const status = checklist.length > 0 && doneCount === checklist.length
    ? "concluida"
    : (doneCount > 0 || hasActiveBoard ? "em_andamento" : "nao_iniciada");
  return {
    id: rainhaId("ph", order),
    projectId,
    order,
    name,
    status,
    checklist,
    clientApproved: false,
    clientVisible: true,
    requiresApproval: false,
    points: 0
  };
}

function buildRainhaDosGabinetesProject() {
  const id = "prj-rainha-dos-gabinetes";
  const phases = [
    buildRainhaPhase(id, 1, "Kickoff e acessos", [
      { label: "Kick-off realizado e briefing validado", travaLevel: "trava_inicio", bloco: "Descoberta" },
      { label: "Perfis e usuários VTEX liberados", travaLevel: "trava_inicio", bloco: "Acessos" },
      { label: "AppKeys/appTokens VTEX criados", travaLevel: "trava_inicio", bloco: "Acessos" },
      { label: "Acessos críticos compartilhados com a Nairuz", travaLevel: "trava_inicio", bloco: "Acessos" },
      { label: "Trilha de treinamento VTEX habilitada", travaLevel: "placeholder", bloco: "Treinamento" }
    ]),
    buildRainhaPhase(id, 2, "Descoberta - decisões de negócio", [
      { label: "Adquirência contratada (cartão, PIX e antifraude)", travaLevel: "trava_inicio", bloco: "Pagamentos" },
      { label: "ERP Bling confirmado como fonte de integração", travaLevel: "trava_inicio", bloco: "ERP Bling" },
      { label: "Responsáveis de negócio e técnico definidos", travaLevel: "trava_inicio", bloco: "Governança" },
      { label: "Aprovação de telas Home e demais páginas", travaLevel: "trava_inicio", boardStatus: "aguardando_cliente", bloco: "Design" }
    ]),
    buildRainhaPhase(id, 3, "Descoberta - catálogo e logística", [
      { label: "Árvore de categorias validada", travaLevel: "trava_inicio", boardStatus: "aguardando_cliente", bloco: "Catálogo" },
      { label: "Atributos e especificações principais definidos", travaLevel: "trava_inicio", boardStatus: "aguardando_cliente", bloco: "Catálogo" },
      { label: "Transportadora definida", travaLevel: "trava_inicio", bloco: "Logística" },
      { label: "Decisão sobre retirada em loja/pickup", travaLevel: "trava_inicio", bloco: "Retirada" },
      { label: "Quantidade de pontos de retirada definida", travaLevel: "trava_inicio", bloco: "Retirada" }
    ]),
    buildRainhaPhase(id, 4, "Design e front-end", [
      { label: "Header, footer e home implementados", travaLevel: "trava_golive", boardStatus: "em_andamento", bloco: "Front-end" },
      { label: "Páginas de categoria, busca e produto implementadas", travaLevel: "trava_golive", boardStatus: "em_andamento", bloco: "Front-end" },
      { label: "Checkout, carrinho, login, minha conta e sucesso implementados", travaLevel: "trava_golive", bloco: "Front-end" },
      { label: "Responsividade e estados principais validados", travaLevel: "trava_golive", bloco: "Front-end" }
    ]),
    buildRainhaPhase(id, 5, "Conteúdo institucional e políticas", [
      { label: "Políticas de privacidade, entrega, trocas e cancelamentos", travaLevel: "trava_golive", bloco: "Conteúdo legal", clientResponsibility: true },
      { label: "Quem Somos com conteúdo provisório", travaLevel: "placeholder", bloco: "Conteúdo", clientResponsibility: true },
      { label: "Fale Conosco e FAQ com conteúdo provisório", travaLevel: "placeholder", bloco: "Conteúdo", clientResponsibility: true },
      { label: "Favoritos habilitado com experiência provisória", travaLevel: "placeholder", bloco: "Conteúdo", clientResponsibility: true }
    ]),
    buildRainhaPhase(id, 6, "Catálogo e integrações", [
      { label: "Marcas e coleções configuradas", travaLevel: "trava_golive", bloco: "Catálogo" },
      { label: "Fluxo criar/atualizar produtos Bling → VTEX", travaLevel: "trava_golive", boardStatus: "em_andamento", bloco: "ERP Bling" },
      { label: "Integração de imagens de produto", travaLevel: "trava_golive", bloco: "ERP Bling" },
      { label: "QA de catálogo e imagens", travaLevel: "trava_golive", bloco: "Catálogo" },
      { label: "Integração de preço Bling → VTEX", travaLevel: "trava_golive", bloco: "ERP Bling" }
    ]),
    buildRainhaPhase(id, 7, "Estoque, logística e retirada", [
      { label: "Estoques, docas e inventário configurados", travaLevel: "trava_golive", boardStatus: "em_andamento", bloco: "Logística" },
      { label: "Políticas de envio e transportadoras configuradas na VTEX", travaLevel: "trava_golive", boardStatus: "em_andamento", bloco: "Logística" },
      { label: "Simulação de frete por CEP validada", travaLevel: "trava_golive", boardStatus: "pendente_golive", bloco: "Entrega / Pickup" },
      { label: "Pontos de retirada cadastrados", travaLevel: "trava_golive", bloco: "Retirada" },
      { label: "QA de frete, estoque e pickup", travaLevel: "trava_golive", bloco: "Entrega / Pickup" }
    ]),
    buildRainhaPhase(id, 8, "Pagamentos", [
      { label: "Gateway de produção configurado", travaLevel: "trava_golive", bloco: "Pagamentos" },
      { label: "Cartão, PIX e boleto validados", travaLevel: "trava_golive", bloco: "Pagamentos" },
      { label: "Antifraude configurado e testado", travaLevel: "trava_golive", bloco: "Pagamentos" },
      { label: "Testes de checkout e conciliação financeira", travaLevel: "trava_golive", boardStatus: "pendente_golive", bloco: "Pagamentos" }
    ]),
    buildRainhaPhase(id, 9, "SEO, busca e analytics", [
      { label: "SEO técnico: 404, robots, sitemap, feed, meta/OG e favicon", travaLevel: "trava_golive", bloco: "SEO" },
      { label: "Intelligent Search básico e filtros configurados", travaLevel: "trava_golive", bloco: "Busca" },
      { label: "Merchandising, relevância e sinônimos em tuning contínuo", travaLevel: "placeholder", bloco: "Busca" },
      { label: "GTM, GA e funil configurados", travaLevel: "trava_golive", bloco: "Analytics" },
      { label: "Contas compartilhadas com SAs VTEX e Search Console", travaLevel: "placeholder", bloco: "Analytics" }
    ]),
    buildRainhaPhase(id, 10, "E-mails, promoções e customizações", [
      { label: "SMTP configurado", travaLevel: "trava_golive", boardStatus: "pendente_golive", bloco: "E-mails" },
      { label: "E-mails transacionais funcionando", travaLevel: "trava_golive", bloco: "E-mails" },
      { label: "CSS/HTML dos templates de e-mail provisórios", travaLevel: "placeholder", bloco: "E-mails" },
      { label: "Promoções e cupons preparados para uso pós-lançamento", travaLevel: "placeholder", bloco: "Promoções", clientResponsibility: true },
      { label: "Quizz, kits e combos tratados como evolução pós-lançamento", travaLevel: "placeholder", bloco: "Customizações", clientResponsibility: true }
    ]),
    buildRainhaPhase(id, 11, "QA interno", [
      { label: "Smoke test do front-end core", travaLevel: "trava_golive", bloco: "QA" },
      { label: "QA do fluxo de compra completo", travaLevel: "trava_golive", bloco: "QA" },
      { label: "QA Bling: pedido, faturamento e tracking", travaLevel: "trava_golive", bloco: "ERP Bling" },
      { label: "QA estoque, preço e logística", travaLevel: "trava_golive", bloco: "QA" }
    ]),
    buildRainhaPhase(id, 12, "Homologação cliente", [
      { label: "Ambiente de homologação liberado ao cliente", travaLevel: "trava_golive", bloco: "Homologação" },
      { label: "Validação do cliente em catálogo, checkout e logística", travaLevel: "trava_golive", boardStatus: "aguardando_cliente", bloco: "Homologação", clientResponsibility: true },
      { label: "Bugs críticos de homologação resolvidos", travaLevel: "trava_golive", bloco: "Homologação" },
      { label: "Aceite operacional para pré go-live", travaLevel: "trava_golive", boardStatus: "aguardando_cliente", bloco: "Homologação", clientResponsibility: true }
    ]),
    buildRainhaPhase(id, 13, "Pré go-live", [
      { label: "Redirects 301 da migração Loja Integrada → VTEX", travaLevel: "trava_golive", boardStatus: "pendente_golive", bloco: "SEO" },
      { label: "Planilha de migração revisada", travaLevel: "placeholder", boardStatus: "aguardando_cliente", bloco: "Migração", clientResponsibility: true },
      { label: "Vídeos de treino e documentação de banners", travaLevel: "placeholder", bloco: "Treinamento" },
      { label: "Checklist pré go-live consolidado", travaLevel: "trava_golive", bloco: "Go-live" }
    ]),
    buildRainhaPhase(id, 14, "Go live", [
      { label: "VTEX IO host configurado", travaLevel: "trava_golive", bloco: "Go-live" },
      { label: "License Manager em domínio de produção", travaLevel: "trava_golive", bloco: "Go-live" },
      { label: "DNS e SSL final", travaLevel: "trava_golive", boardStatus: "pendente_golive", bloco: "Go-live" },
      { label: "Publicação assistida e monitoramento inicial", travaLevel: "trava_golive", bloco: "Go-live" },
      { label: "Revisão de banners, conteúdo e ajustes de marketing", travaLevel: "placeholder", boardStatus: "aguardando_cliente", bloco: "Marketing", clientResponsibility: true }
    ]),
    buildRainhaPhase(id, 15, "Acompanhamento pós-go live", [
      { label: "Acompanhamento 7 dias", travaLevel: "placeholder", bloco: "Pós-live" },
      { label: "Ajustes finos pós-publicação", travaLevel: "placeholder", bloco: "Pós-live" },
      { label: "Fluxo de troca e devolução estabilizado pós-launch", travaLevel: "placeholder", bloco: "Operação" },
      { label: "Tuning contínuo de busca e merchandising", travaLevel: "placeholder", bloco: "Busca" }
    ]),
    buildRainhaPhase(id, 16, "Encerramento técnico", [
      { label: "Documentação final entregue", travaLevel: "placeholder", bloco: "Encerramento" },
      { label: "Aceite final assinado", travaLevel: "placeholder", boardStatus: "aguardando_cliente", bloco: "Encerramento", clientResponsibility: true },
      { label: "Recomendações de sustentação e evolução", travaLevel: "placeholder", bloco: "Encerramento" }
    ])
  ];
  const project = {
    id,
    code: "PRJ-024",
    clientName: "Rainha dos Gabinetes",
    organizationId: "o8",
    platform: "vtex",
    type: "implantacao",
    product: "ecommerce",
    status: "em_andamento",
    startDate: "2026-06-30",
    goLiveDate: "2026-08-30",
    nextAction: "Cobrar as travas vermelhas de Descoberta antes de entrar na esteira: acessos VTEX, adquirência, ERP Bling, categorias, logística e pickup.",
    owners: { csId: "u2", techLeadId: "u1", designerId: "u3", clientContact: "Camila (Rainha dos Gabinetes)" },
    phases,
    clientEmails: ["implantacao@rainhadosgabinetes.com.br"],
    templateNotes: "Migração Loja Integrada → VTEX com ERP Bling. Foco principal: Entrega + Retirada — gabinete é volumoso e logística define a viabilidade do checkout.",
    history: [{ id: uid("h"), type: "projeto_criado", label: "Projeto criado", at: "2026-06-30T12:00:00.000Z", actor: "Nairuz" }],
    supportHours: { ...DEFAULT_SUPPORT_HOURS },
    finalization: JSON.parse(JSON.stringify(DEFAULT_FINALIZATION)),
    progress: 0,
    risk: "baixo",
    nps: null,
    updatedAt: "2026-06-30T12:00:00.000Z"
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
  return [buildRainhaDosGabinetesProject(), ...seeds.map((s, i) => buildProject(s, 14 - i))];
}

module.exports = { TEAM, ORGANIZATIONS, CLIENT_USERS, seedProjects };
