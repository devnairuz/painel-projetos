import type {
  BoardStatus,
  ChecklistItem,
  ClientUser,
  Organization,
  Phase,
  PhaseStatus,
  Project,
  TeamMember,
  TravaLevel,
} from '@/types'
import { DEFAULT_PHASE_NAMES } from '@/constants'
import { DEFAULT_FINALIZATION, DEFAULT_SUPPORT_HOURS } from '@/constants/templates'
import { computeProgress, currentPhase, deriveRisk } from '@/utils/projects'

// ───────────────────────── Time Nairuz ─────────────────────────

export const TEAM: TeamMember[] = [
  { id: 'u1', name: 'Paulo Cavalcante', role: 'tech_lead', avatarColor: '#14b885' },
  { id: 'u2', name: 'Marina Alves', role: 'cs', avatarColor: '#2563eb' },
  { id: 'u3', name: 'Rafael Lima', role: 'designer', avatarColor: '#7c3aed' },
  { id: 'u4', name: 'Júlia Santos', role: 'dev', avatarColor: '#db2777' },
  { id: 'u5', name: 'Bruno Costa', role: 'pm', avatarColor: '#ea580c' },
  { id: 'u6', name: 'Carla Mendes', role: 'cs', avatarColor: '#0d9488' },
]

/**
 * Logins de cliente (mock). Sem senha real — qualquer senha é aceita no
 * protótipo. Cada cliente enxerga só os projetos da própria organização.
 */
export const CLIENT_USERS: ClientUser[] = [
  { id: 'c1', name: 'Renata Souza', email: 'renata@vivara.com', organizationId: 'o1' },
  { id: 'c2', name: 'Diego Martins', email: 'diego@decathlon.com', organizationId: 'o2' },
  { id: 'c3', name: 'Sandra Lopes', email: 'sandra@saudemais.com', organizationId: 'o3' },
  { id: 'c4', name: 'Antônio Reis', email: 'antonio@moveiscastelo.com', organizationId: 'o4' },
  { id: 'c5', name: 'Luana Pires', email: 'luana@petclube.com', organizationId: 'o5' },
  { id: 'c6', name: 'Marcos Dias', email: 'marcos@techparts.com', organizationId: 'o6' },
  { id: 'c7', name: 'Patrícia Nunes', email: 'patricia@modaaurora.com', organizationId: 'o7' },
  { id: 'c8', name: 'Camila Duarte', email: 'implantacao@rainhadosgabinetes.com.br', organizationId: 'o8' },
]

export const ORGANIZATIONS: Organization[] = [
  { id: 'o1', name: 'Loja Vivara', segment: 'Joalheria' },
  { id: 'o2', name: 'Decathlon BR', segment: 'Esportes' },
  { id: 'o3', name: 'Farmácia SaúdeMais', segment: 'Saúde' },
  { id: 'o4', name: 'Móveis Castelo', segment: 'Casa & Decoração' },
  { id: 'o5', name: 'PetClube', segment: 'Pet' },
  { id: 'o6', name: 'TechParts', segment: 'Eletrônicos' },
  { id: 'o7', name: 'Moda Aurora', segment: 'Vestuário' },
  { id: 'o8', name: 'Rainha dos Gabinetes', segment: 'Casa & Decoração' },
]

// ───────────────────────── Helpers de seed ─────────────────────────

let _seq = 0
const uid = (prefix: string) => `${prefix}${(++_seq).toString(36)}`

function checklist(labels: string[], doneCount: number): ChecklistItem[] {
  return labels.map((label, i) => ({
    id: uid('chk'),
    label,
    done: i < doneCount,
    doneAt: i < doneCount ? '2026-05-20T12:00:00.000Z' : undefined,
  }))
}

/** Checklists padrão por nome de fase (resumidos, mas realistas). */
const PHASE_CHECKLISTS: Record<string, string[]> = {
  'Kickoff e acessos': [
    'Reunião de kickoff realizada',
    'Acessos da plataforma liberados',
    'Acesso ao repositório/ambiente',
    'Contatos e canais definidos',
  ],
  'Escopo e alinhamento': [
    'Escopo documentado e validado',
    'Cronograma macro aprovado',
    'Riscos iniciais mapeados',
  ],
  'Design e UX': [
    'Wireframes aprovados',
    'Layout da home aprovado',
    'Layout de PLP e PDP aprovados',
    'Design system entregue',
  ],
  Desenvolvimento: [
    'Tema base implementado',
    'Componentes principais prontos',
    'Páginas institucionais',
    'Responsividade validada',
  ],
  'Catálogo e conteúdo': [
    'Importação de catálogo',
    'Categorização revisada',
    'Banners e conteúdos publicados',
  ],
  Pagamentos: [
    'Gateway configurado',
    'Bandeiras confirmadas pelo cliente',
    'Testes de checkout aprovados',
  ],
  'Frete e logística': [
    'Transportadoras integradas',
    'Regras de frete configuradas',
    'Cálculo de prazo validado',
  ],
  Integrações: ['ERP integrado', 'Estoque sincronizado', 'Webhooks validados'],
  'SEO e tracking': [
    'Tags de tracking instaladas',
    'Sitemap e robots',
    'Redirecionamentos 301',
  ],
  'QA interno': ['Smoke test completo', 'Checklist de QA aprovado', 'Bugs críticos resolvidos'],
  'Homologação cliente': ['Ambiente de homologação liberado', 'Aprovação do cliente registrada'],
  'Go live': ['DNS apontado', 'Publicação realizada', 'Monitoramento pós-publicação'],
  'Acompanhamento pós-go live': ['Acompanhamento 7 dias', 'Ajustes finos aplicados'],
  'Encerramento técnico': ['Documentação entregue', 'Aceite final assinado'],
}

interface PhaseSeed {
  status: PhaseStatus
  doneCount?: number
  ownerId?: string
  startDate?: string
  dueDate?: string
  finishedDate?: string
  clientApproved?: boolean
}

/**
 * Constrói as 14 fases de um projeto a partir de uma lista de "seeds".
 * Fora dos índices informados, as fases entram como não iniciadas.
 */
function buildPhases(projectId: string, seeds: Record<number, PhaseSeed>): Phase[] {
  return DEFAULT_PHASE_NAMES.map((name, idx) => {
    const seed = seeds[idx]
    const labels = PHASE_CHECKLISTS[name] ?? ['Item pendente']
    const status: PhaseStatus = seed?.status ?? 'nao_iniciada'
    const doneCount =
      seed?.doneCount ?? (status === 'concluida' ? labels.length : 0)
    return {
      id: uid('ph'),
      projectId,
      order: idx + 1,
      name,
      status,
      ownerId: seed?.ownerId,
      startDate: seed?.startDate,
      dueDate: seed?.dueDate,
      finishedDate: seed?.finishedDate,
      checklist: checklist(labels, doneCount),
      clientApproved: seed?.clientApproved ?? false,
      clientApprovedAt: seed?.clientApproved ? '2026-05-25T12:00:00.000Z' : undefined,
    }
  })
}

interface ProjectSeed {
  code: string
  clientName: string
  organizationId: string
  platform: Project['platform']
  type: Project['type']
  status: Project['status']
  startDate: string
  goLiveDate?: string
  nextAction?: string
  updatedAt: string
  owners: Project['owners']
  phaseSeeds: Record<number, PhaseSeed>
  /** E-mails de cliente já liberados no seed (demo). */
  clientEmails?: string[]
}

function buildProject(seed: ProjectSeed): Project {
  const id = uid('prj')
  const phases = buildPhases(id, seed.phaseSeeds)
  const base: Project = {
    id,
    code: seed.code,
    clientName: seed.clientName,
    organizationId: seed.organizationId,
    platform: seed.platform,
    type: seed.type,
    status: seed.status,
    startDate: seed.startDate,
    goLiveDate: seed.goLiveDate,
    nextAction: seed.nextAction,
    updatedAt: seed.updatedAt,
    owners: seed.owners,
    phases,
    progress: 0,
    risk: 'baixo',
    currentPhaseId: undefined,
    clientEmails: seed.clientEmails ?? [],
    product: 'ecommerce',
    history: [],
    supportHours: { ...DEFAULT_SUPPORT_HOURS },
    finalization: JSON.parse(JSON.stringify(DEFAULT_FINALIZATION)) as Project['finalization'],
  }
  base.progress = computeProgress(phases)
  base.risk = deriveRisk(base)
  base.currentPhaseId = currentPhase(phases)?.id
  return base
}

interface RainhaChecklistSeed {
  label: string
  travaLevel: TravaLevel
  boardStatus?: BoardStatus
  bloco?: string
  done?: boolean
  clientResponsibility?: boolean
}

function rainhaId(prefix: 'ph' | 'chk', phaseOrder: number, itemOrder?: number): string {
  const phase = String(phaseOrder).padStart(2, '0')
  const item = itemOrder === undefined ? '' : `-${String(itemOrder).padStart(2, '0')}`
  return `${prefix}-rainha-${phase}${item}`
}

function rainhaChecklist(items: RainhaChecklistSeed[], defaultBloco: string, phaseOrder: number): ChecklistItem[] {
  return items.map((item, index) => {
    const done = item.done ?? item.boardStatus === 'concluido'
    const clientResponsibility = item.clientResponsibility ?? (item.travaLevel === 'trava_inicio')
    return {
      id: rainhaId('chk', phaseOrder, index + 1),
      label: item.label,
      done,
      doneAt: done ? '2026-06-30T12:00:00.000Z' : undefined,
      travaLevel: item.travaLevel,
      boardStatus: item.boardStatus ?? (done ? 'concluido' : clientResponsibility ? 'responsabilidade_cliente' : 'a_fazer'),
      bloco: item.bloco ?? defaultBloco,
      clientResponsibility,
    }
  })
}

function buildRainhaPhase(projectId: string, order: number, name: string, items: RainhaChecklistSeed[]): Phase {
  const checklist = rainhaChecklist(items, name, order)
  const doneCount = checklist.filter((item) => item.done).length
  const hasActiveBoard = checklist.some((item) => item.boardStatus && item.boardStatus !== 'a_fazer')
  const status: PhaseStatus =
    checklist.length > 0 && doneCount === checklist.length
      ? 'concluida'
      : doneCount > 0 || hasActiveBoard
        ? 'em_andamento'
        : 'nao_iniciada'
  return {
    id: rainhaId('ph', order),
    projectId,
    order,
    name,
    status,
    checklist,
    clientApproved: false,
    clientVisible: true,
    requiresApproval: false,
    points: 0,
  }
}

function buildRainhaDosGabinetesProject(): Project {
  const id = 'prj-rainha-dos-gabinetes'
  const phases: Phase[] = [
    buildRainhaPhase(id, 1, 'Kickoff e acessos', [
      { label: 'Kick-off realizado e briefing validado', travaLevel: 'trava_inicio', bloco: 'Descoberta' },
      { label: 'Perfis e usuários VTEX liberados', travaLevel: 'trava_inicio', bloco: 'Acessos' },
      { label: 'AppKeys/appTokens VTEX criados', travaLevel: 'trava_inicio', bloco: 'Acessos' },
      { label: 'Acessos críticos compartilhados com a Nairuz', travaLevel: 'trava_inicio', bloco: 'Acessos' },
      { label: 'Trilha de treinamento VTEX habilitada', travaLevel: 'placeholder', bloco: 'Treinamento' },
    ]),
    buildRainhaPhase(id, 2, 'Descoberta - decisões de negócio', [
      { label: 'Adquirência contratada (cartão, PIX e antifraude)', travaLevel: 'trava_inicio', bloco: 'Pagamentos' },
      { label: 'ERP Bling confirmado como fonte de integração', travaLevel: 'trava_inicio', bloco: 'ERP Bling' },
      { label: 'Responsáveis de negócio e técnico definidos', travaLevel: 'trava_inicio', bloco: 'Governança' },
      { label: 'Aprovação de telas Home e demais páginas', travaLevel: 'trava_inicio', boardStatus: 'aguardando_cliente', bloco: 'Design' },
    ]),
    buildRainhaPhase(id, 3, 'Descoberta - catálogo e logística', [
      { label: 'Árvore de categorias validada', travaLevel: 'trava_inicio', boardStatus: 'aguardando_cliente', bloco: 'Catálogo' },
      { label: 'Atributos e especificações principais definidos', travaLevel: 'trava_inicio', boardStatus: 'aguardando_cliente', bloco: 'Catálogo' },
      { label: 'Transportadora definida', travaLevel: 'trava_inicio', bloco: 'Logística' },
      { label: 'Decisão sobre retirada em loja/pickup', travaLevel: 'trava_inicio', bloco: 'Retirada' },
      { label: 'Quantidade de pontos de retirada definida', travaLevel: 'trava_inicio', bloco: 'Retirada' },
    ]),
    buildRainhaPhase(id, 4, 'Design e front-end', [
      { label: 'Header, footer e home implementados', travaLevel: 'trava_golive', boardStatus: 'em_andamento', bloco: 'Front-end' },
      { label: 'Páginas de categoria, busca e produto implementadas', travaLevel: 'trava_golive', boardStatus: 'em_andamento', bloco: 'Front-end' },
      { label: 'Checkout, carrinho, login, minha conta e sucesso implementados', travaLevel: 'trava_golive', bloco: 'Front-end' },
      { label: 'Responsividade e estados principais validados', travaLevel: 'trava_golive', bloco: 'Front-end' },
    ]),
    buildRainhaPhase(id, 5, 'Conteúdo institucional e políticas', [
      { label: 'Políticas de privacidade, entrega, trocas e cancelamentos', travaLevel: 'trava_golive', bloco: 'Conteúdo legal', clientResponsibility: true },
      { label: 'Quem Somos com conteúdo provisório', travaLevel: 'placeholder', bloco: 'Conteúdo', clientResponsibility: true },
      { label: 'Fale Conosco e FAQ com conteúdo provisório', travaLevel: 'placeholder', bloco: 'Conteúdo', clientResponsibility: true },
      { label: 'Favoritos habilitado com experiência provisória', travaLevel: 'placeholder', bloco: 'Conteúdo', clientResponsibility: true },
    ]),
    buildRainhaPhase(id, 6, 'Catálogo e integrações', [
      { label: 'Marcas e coleções configuradas', travaLevel: 'trava_golive', bloco: 'Catálogo' },
      { label: 'Fluxo criar/atualizar produtos Bling → VTEX', travaLevel: 'trava_golive', boardStatus: 'em_andamento', bloco: 'ERP Bling' },
      { label: 'Integração de imagens de produto', travaLevel: 'trava_golive', bloco: 'ERP Bling' },
      { label: 'QA de catálogo e imagens', travaLevel: 'trava_golive', bloco: 'Catálogo' },
      { label: 'Integração de preço Bling → VTEX', travaLevel: 'trava_golive', bloco: 'ERP Bling' },
    ]),
    buildRainhaPhase(id, 7, 'Estoque, logística e retirada', [
      { label: 'Estoques, docas e inventário configurados', travaLevel: 'trava_golive', boardStatus: 'em_andamento', bloco: 'Logística' },
      { label: 'Políticas de envio e transportadoras configuradas na VTEX', travaLevel: 'trava_golive', boardStatus: 'em_andamento', bloco: 'Logística' },
      { label: 'Simulação de frete por CEP validada', travaLevel: 'trava_golive', boardStatus: 'pendente_golive', bloco: 'Entrega / Pickup' },
      { label: 'Pontos de retirada cadastrados', travaLevel: 'trava_golive', bloco: 'Retirada' },
      { label: 'QA de frete, estoque e pickup', travaLevel: 'trava_golive', bloco: 'Entrega / Pickup' },
    ]),
    buildRainhaPhase(id, 8, 'Pagamentos', [
      { label: 'Gateway de produção configurado', travaLevel: 'trava_golive', bloco: 'Pagamentos' },
      { label: 'Cartão, PIX e boleto validados', travaLevel: 'trava_golive', bloco: 'Pagamentos' },
      { label: 'Antifraude configurado e testado', travaLevel: 'trava_golive', bloco: 'Pagamentos' },
      { label: 'Testes de checkout e conciliação financeira', travaLevel: 'trava_golive', boardStatus: 'pendente_golive', bloco: 'Pagamentos' },
    ]),
    buildRainhaPhase(id, 9, 'SEO, busca e analytics', [
      { label: 'SEO técnico: 404, robots, sitemap, feed, meta/OG e favicon', travaLevel: 'trava_golive', bloco: 'SEO' },
      { label: 'Intelligent Search básico e filtros configurados', travaLevel: 'trava_golive', bloco: 'Busca' },
      { label: 'Merchandising, relevância e sinônimos em tuning contínuo', travaLevel: 'placeholder', bloco: 'Busca' },
      { label: 'GTM, GA e funil configurados', travaLevel: 'trava_golive', bloco: 'Analytics' },
      { label: 'Contas compartilhadas com SAs VTEX e Search Console', travaLevel: 'placeholder', bloco: 'Analytics' },
    ]),
    buildRainhaPhase(id, 10, 'E-mails, promoções e customizações', [
      { label: 'SMTP configurado', travaLevel: 'trava_golive', boardStatus: 'pendente_golive', bloco: 'E-mails' },
      { label: 'E-mails transacionais funcionando', travaLevel: 'trava_golive', bloco: 'E-mails' },
      { label: 'CSS/HTML dos templates de e-mail provisórios', travaLevel: 'placeholder', bloco: 'E-mails' },
      { label: 'Promoções e cupons preparados para uso pós-lançamento', travaLevel: 'placeholder', bloco: 'Promoções', clientResponsibility: true },
      { label: 'Quizz, kits e combos tratados como evolução pós-lançamento', travaLevel: 'placeholder', bloco: 'Customizações', clientResponsibility: true },
    ]),
    buildRainhaPhase(id, 11, 'QA interno', [
      { label: 'Smoke test do front-end core', travaLevel: 'trava_golive', bloco: 'QA' },
      { label: 'QA do fluxo de compra completo', travaLevel: 'trava_golive', bloco: 'QA' },
      { label: 'QA Bling: pedido, faturamento e tracking', travaLevel: 'trava_golive', bloco: 'ERP Bling' },
      { label: 'QA estoque, preço e logística', travaLevel: 'trava_golive', bloco: 'QA' },
    ]),
    buildRainhaPhase(id, 12, 'Homologação cliente', [
      { label: 'Ambiente de homologação liberado ao cliente', travaLevel: 'trava_golive', bloco: 'Homologação' },
      { label: 'Validação do cliente em catálogo, checkout e logística', travaLevel: 'trava_golive', boardStatus: 'aguardando_cliente', bloco: 'Homologação', clientResponsibility: true },
      { label: 'Bugs críticos de homologação resolvidos', travaLevel: 'trava_golive', bloco: 'Homologação' },
      { label: 'Aceite operacional para pré go-live', travaLevel: 'trava_golive', boardStatus: 'aguardando_cliente', bloco: 'Homologação', clientResponsibility: true },
    ]),
    buildRainhaPhase(id, 13, 'Pré go-live', [
      { label: 'Redirects 301 da migração Loja Integrada → VTEX', travaLevel: 'trava_golive', boardStatus: 'pendente_golive', bloco: 'SEO' },
      { label: 'Planilha de migração revisada', travaLevel: 'placeholder', boardStatus: 'aguardando_cliente', bloco: 'Migração', clientResponsibility: true },
      { label: 'Vídeos de treino e documentação de banners', travaLevel: 'placeholder', bloco: 'Treinamento' },
      { label: 'Checklist pré go-live consolidado', travaLevel: 'trava_golive', bloco: 'Go-live' },
    ]),
    buildRainhaPhase(id, 14, 'Go live', [
      { label: 'VTEX IO host configurado', travaLevel: 'trava_golive', bloco: 'Go-live' },
      { label: 'License Manager em domínio de produção', travaLevel: 'trava_golive', bloco: 'Go-live' },
      { label: 'DNS e SSL final', travaLevel: 'trava_golive', boardStatus: 'pendente_golive', bloco: 'Go-live' },
      { label: 'Publicação assistida e monitoramento inicial', travaLevel: 'trava_golive', bloco: 'Go-live' },
      { label: 'Revisão de banners, conteúdo e ajustes de marketing', travaLevel: 'placeholder', boardStatus: 'aguardando_cliente', bloco: 'Marketing', clientResponsibility: true },
    ]),
    buildRainhaPhase(id, 15, 'Acompanhamento pós-go live', [
      { label: 'Acompanhamento 7 dias', travaLevel: 'placeholder', bloco: 'Pós-live' },
      { label: 'Ajustes finos pós-publicação', travaLevel: 'placeholder', bloco: 'Pós-live' },
      { label: 'Fluxo de troca e devolução estabilizado pós-launch', travaLevel: 'placeholder', bloco: 'Operação' },
      { label: 'Tuning contínuo de busca e merchandising', travaLevel: 'placeholder', bloco: 'Busca' },
    ]),
    buildRainhaPhase(id, 16, 'Encerramento técnico', [
      { label: 'Documentação final entregue', travaLevel: 'placeholder', bloco: 'Encerramento' },
      { label: 'Aceite final assinado', travaLevel: 'placeholder', boardStatus: 'aguardando_cliente', bloco: 'Encerramento', clientResponsibility: true },
      { label: 'Recomendações de sustentação e evolução', travaLevel: 'placeholder', bloco: 'Encerramento' },
    ]),
  ]
  const base: Project = {
    id,
    code: 'PRJ-024',
    clientName: 'Rainha dos Gabinetes',
    organizationId: 'o8',
    platform: 'vtex',
    type: 'implantacao',
    status: 'em_andamento',
    startDate: '2026-06-30',
    goLiveDate: '2026-08-30',
    nextAction: 'Cobrar as travas vermelhas de Descoberta antes de entrar na esteira: acessos VTEX, adquirência, ERP Bling, categorias, logística e pickup.',
    updatedAt: '2026-06-30T12:00:00.000Z',
    owners: { csId: 'u2', techLeadId: 'u1', designerId: 'u3', clientContact: 'Camila (Rainha dos Gabinetes)' },
    phases,
    progress: 0,
    risk: 'baixo',
    currentPhaseId: undefined,
    clientEmails: ['implantacao@rainhadosgabinetes.com.br'],
    product: 'ecommerce',
    templateNotes: 'Migração Loja Integrada → VTEX com ERP Bling. Foco principal: Entrega + Retirada — gabinete é volumoso e logística define a viabilidade do checkout.',
    history: [{ id: uid('h'), type: 'projeto_criado', label: 'Projeto criado', at: '2026-06-30T12:00:00.000Z', actor: 'Nairuz' }],
    supportHours: { ...DEFAULT_SUPPORT_HOURS },
    finalization: JSON.parse(JSON.stringify(DEFAULT_FINALIZATION)) as Project['finalization'],
  }
  base.progress = computeProgress(phases)
  base.risk = deriveRisk(base)
  base.currentPhaseId = currentPhase(phases)?.id
  return base
}

// ───────────────────────── Projetos seed ─────────────────────────

export function seedProjects(): Project[] {
  _seq = 0
  return [
    buildRainhaDosGabinetesProject(),
    buildProject({
      code: 'PRJ-014',
      clientName: 'Loja Vivara',
      organizationId: 'o1',
      platform: 'vtex',
      type: 'implantacao',
      status: 'aguardando_cliente',
      startDate: '2026-03-10',
      goLiveDate: '2026-07-01',
      nextAction: 'Cliente confirmar bandeiras aceitas no gateway',
      updatedAt: '2026-06-09T14:30:00.000Z',
      owners: { csId: 'u2', techLeadId: 'u1', designerId: 'u3', clientContact: 'Renata (Vivara)' },
      clientEmails: ['renata@vivara.com'],
      phaseSeeds: {
        0: { status: 'concluida', clientApproved: true, ownerId: 'u2' },
        1: { status: 'concluida', clientApproved: true, ownerId: 'u5' },
        2: { status: 'concluida', clientApproved: true, ownerId: 'u3' },
        3: { status: 'concluida', ownerId: 'u4' },
        4: { status: 'em_andamento', doneCount: 1, ownerId: 'u4' },
        5: { status: 'aguardando_cliente', doneCount: 1, ownerId: 'u1', dueDate: '2026-06-15' },
      },
    }),
    buildProject({
      code: 'PRJ-009',
      clientName: 'Decathlon BR',
      organizationId: 'o2',
      platform: 'shopify',
      type: 'implantacao',
      status: 'qa',
      startDate: '2026-02-01',
      goLiveDate: '2026-06-18',
      nextAction: 'Fechar bugs críticos do QA interno',
      updatedAt: '2026-06-10T09:10:00.000Z',
      owners: { csId: 'u6', techLeadId: 'u1', designerId: 'u3', clientContact: 'Diego (Decathlon)' },
      clientEmails: ['diego@decathlon.com'],
      phaseSeeds: {
        0: { status: 'concluida', clientApproved: true },
        1: { status: 'concluida', clientApproved: true },
        2: { status: 'concluida', clientApproved: true },
        3: { status: 'concluida' },
        4: { status: 'concluida' },
        5: { status: 'concluida' },
        6: { status: 'concluida' },
        7: { status: 'concluida' },
        8: { status: 'concluida' },
        9: { status: 'em_andamento', doneCount: 1, ownerId: 'u4', dueDate: '2026-06-14' },
      },
    }),
    buildProject({
      code: 'PRJ-021',
      clientName: 'Farmácia SaúdeMais',
      organizationId: 'o3',
      platform: 'linx',
      type: 'implantacao',
      status: 'em_andamento',
      startDate: '2026-04-15',
      goLiveDate: '2026-08-20',
      nextAction: 'Aprovar layout de PDP',
      updatedAt: '2026-06-08T16:45:00.000Z',
      owners: { csId: 'u2', techLeadId: 'u1', designerId: 'u3', clientContact: 'Sandra (SaúdeMais)' },
      clientEmails: ['sandra@saudemais.com'],
      phaseSeeds: {
        0: { status: 'concluida', clientApproved: true },
        1: { status: 'concluida', clientApproved: true },
        2: { status: 'aguardando_cliente', doneCount: 2, ownerId: 'u3', dueDate: '2026-06-20' },
      },
    }),
    buildProject({
      code: 'PRJ-007',
      clientName: 'Móveis Castelo',
      organizationId: 'o4',
      platform: 'woocommerce',
      type: 'implantacao',
      status: 'aguardando_nairuz',
      startDate: '2026-01-20',
      goLiveDate: '2026-06-12',
      nextAction: 'Nairuz finalizar integração com ERP',
      updatedAt: '2026-06-10T11:00:00.000Z',
      owners: { csId: 'u6', techLeadId: 'u1', designerId: 'u3', clientContact: 'Antônio (Castelo)' },
      clientEmails: ['antonio@moveiscastelo.com'],
      phaseSeeds: {
        0: { status: 'concluida', clientApproved: true },
        1: { status: 'concluida', clientApproved: true },
        2: { status: 'concluida', clientApproved: true },
        3: { status: 'concluida' },
        4: { status: 'concluida' },
        5: { status: 'concluida' },
        6: { status: 'concluida' },
        7: { status: 'bloqueada', doneCount: 0, ownerId: 'u4', dueDate: '2026-06-05' },
      },
    }),
    buildProject({
      code: 'PRJ-018',
      clientName: 'PetClube',
      organizationId: 'o5',
      platform: 'tray',
      type: 'evolucao',
      status: 'homologacao',
      startDate: '2026-03-01',
      goLiveDate: '2026-06-25',
      nextAction: 'Cliente validar ambiente de homologação',
      updatedAt: '2026-06-09T10:20:00.000Z',
      owners: { csId: 'u2', techLeadId: 'u1', designerId: 'u3', clientContact: 'Luana (PetClube)' },
      clientEmails: ['luana@petclube.com'],
      phaseSeeds: {
        0: { status: 'concluida', clientApproved: true },
        1: { status: 'concluida', clientApproved: true },
        2: { status: 'concluida', clientApproved: true },
        3: { status: 'concluida' },
        4: { status: 'concluida' },
        5: { status: 'concluida' },
        6: { status: 'concluida' },
        7: { status: 'concluida' },
        8: { status: 'concluida' },
        9: { status: 'concluida' },
        10: { status: 'aguardando_cliente', doneCount: 1, ownerId: 'u6', dueDate: '2026-06-22' },
      },
    }),
    buildProject({
      code: 'PRJ-023',
      clientName: 'TechParts',
      organizationId: 'o6',
      platform: 'wake',
      type: 'implantacao',
      status: 'pronto_go_live',
      startDate: '2026-02-10',
      goLiveDate: '2026-06-14',
      nextAction: 'Agendar janela de go live com o cliente',
      updatedAt: '2026-06-10T08:00:00.000Z',
      owners: { csId: 'u6', techLeadId: 'u1', designerId: 'u3', clientContact: 'Marcos (TechParts)' },
      clientEmails: ['marcos@techparts.com'],
      phaseSeeds: {
        0: { status: 'concluida', clientApproved: true },
        1: { status: 'concluida', clientApproved: true },
        2: { status: 'concluida', clientApproved: true },
        3: { status: 'concluida' },
        4: { status: 'concluida' },
        5: { status: 'concluida' },
        6: { status: 'concluida' },
        7: { status: 'concluida' },
        8: { status: 'concluida' },
        9: { status: 'concluida' },
        10: { status: 'concluida', clientApproved: true },
        11: { status: 'em_andamento', doneCount: 0, ownerId: 'u1', dueDate: '2026-06-14' },
      },
    }),
    buildProject({
      code: 'PRJ-002',
      clientName: 'Moda Aurora',
      organizationId: 'o7',
      platform: 'shopify',
      type: 'sustentacao',
      status: 'publicado',
      startDate: '2025-11-01',
      goLiveDate: '2026-02-15',
      nextAction: 'Acompanhamento mensal de evolução',
      updatedAt: '2026-06-07T13:00:00.000Z',
      owners: { csId: 'u2', techLeadId: 'u1', designerId: 'u3', clientContact: 'Patrícia (Aurora)' },
      clientEmails: ['patricia@modaaurora.com'],
      phaseSeeds: Object.fromEntries(
        Array.from({ length: 13 }, (_, i) => [i, { status: 'concluida' as PhaseStatus, clientApproved: true }]),
      ),
    }),
  ]
}
