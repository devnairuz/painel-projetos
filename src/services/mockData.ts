import type {
  ChecklistItem,
  ClientUser,
  Organization,
  Phase,
  PhaseStatus,
  Project,
  TeamMember,
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
]

export const ORGANIZATIONS: Organization[] = [
  { id: 'o1', name: 'Loja Vivara', segment: 'Joalheria' },
  { id: 'o2', name: 'Decathlon BR', segment: 'Esportes' },
  { id: 'o3', name: 'Farmácia SaúdeMais', segment: 'Saúde' },
  { id: 'o4', name: 'Móveis Castelo', segment: 'Casa & Decoração' },
  { id: 'o5', name: 'PetClube', segment: 'Pet' },
  { id: 'o6', name: 'TechParts', segment: 'Eletrônicos' },
  { id: 'o7', name: 'Moda Aurora', segment: 'Vestuário' },
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

// ───────────────────────── Projetos seed ─────────────────────────

export function seedProjects(): Project[] {
  _seq = 0
  return [
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
