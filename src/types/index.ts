/**
 * Modelo de domínio do Portal de Implantação.
 *
 * Estes tipos espelham o futuro schema do Supabase. A camada de serviços
 * (src/services) hoje resolve tudo com mock + localStorage; quando o banco
 * existir, só as funções de serviço mudam — a UI continua igual.
 */

// ───────────────────────── Enums de domínio ─────────────────────────

export type Platform =
  | 'vtex'
  | 'linx'
  | 'wake'
  | 'tray'
  | 'woocommerce'
  | 'shopify'
  | 'kobe'
  | 'outro'

export type ProjectType =
  | 'implantacao'
  | 'sustentacao'
  | 'evolucao'
  | 'cro'
  | 'pontual'

/** Produto/serviço sendo construído — define o template de etapas inicial. */
export type Product = 'blog_institucional' | 'ecommerce' | 'dev_proprio' | 'landing_page'

export type ProjectStatus =
  | 'nao_iniciado'
  | 'em_andamento'
  | 'aguardando_cliente'
  | 'aguardando_nairuz'
  | 'aguardando_terceiro'
  | 'homologacao'
  | 'qa'
  | 'pronto_go_live'
  | 'publicado'
  | 'pausado'
  | 'cancelado'
  | 'encerrado'

export type RiskLevel = 'baixo' | 'medio' | 'alto' | 'critico'

export type PhaseStatus =
  | 'nao_iniciada'
  | 'em_andamento'
  | 'aguardando_cliente'
  | 'bloqueada'
  | 'concluida'

export type MemberRole =
  | 'cs'
  | 'tech_lead'
  | 'designer'
  | 'dev'
  | 'pm'
  | 'cliente'

export type ProjectTaskStatus = 'aberta' | 'em_andamento' | 'concluida' | 'bloqueada'
export type ProjectTaskSource = 'checklist' | 'manual' | 'cliente'
export type ProjectChargeStatus = 'aberta' | 'respondida' | 'resolvida' | 'cancelada'
export type ProjectChargeSide = 'cliente' | 'nairuz' | 'terceiro'
export type TrackingScopeStatus = 'pendente' | 'recebido' | 'validado'
export type DeadlineConfidence = 'no_prazo' | 'atencao' | 'atrasado'

// ───────────────────────── Entidades ─────────────────────────

export interface Organization {
  id: string
  name: string
  segment?: string
}

export interface TeamMember {
  id: string
  name: string
  role: MemberRole
  /** Cor do avatar (iniciais), no espírito do painel de referência. */
  avatarColor: string
}

/**
 * Usuário cliente. O acesso real aos projetos é concedido por e-mail, projeto
 * a projeto (ver `Project.clientEmails`) — a Nairuz libera de quais projetos
 * cada e-mail participa. `organizationId` é só referência opcional.
 */
export interface ClientUser {
  id: string
  name: string
  email: string
  organizationId?: string
}

/** Comentário numa subtarefa — canal de tratativa entre Nairuz e cliente. */
export interface ChecklistComment {
  id: string
  /** ID do autor quando disponível (usuário interno ou e-mail do cliente). */
  authorId?: string
  authorType: 'nairuz' | 'cliente'
  authorName: string
  body: string
  /** Imagens anexadas ao comentário. */
  attachments?: CommentAttachment[]
  /** IDs de usuários mencionados (@) neste comentário. */
  mentionedUserIds?: string[]
  createdAt: string
}

export interface CommentAttachment {
  id: string
  name: string
  mimeType: string
  size?: number
  url: string
}

export interface ChecklistItem {
  id: string
  label: string
  done: boolean
  doneAt?: string
  /** Responsável interno direto pela subtarefa. Se vazio, herda a etapa. */
  ownerId?: string
  /** Marca a subtarefa como responsabilidade do cliente (aparece no portal dele). */
  clientResponsibility?: boolean
  /** Thread de comentários da subtarefa. */
  comments?: ChecklistComment[]
}

export interface Phase {
  id: string
  projectId: string
  /** Ordem na linha do tempo (1..N). */
  order: number
  name: string
  status: PhaseStatus
  ownerId?: string
  startDate?: string
  dueDate?: string
  finishedDate?: string
  checklist: ChecklistItem[]
  /** Aprovação formal do cliente para esta fase. */
  clientApproved: boolean
  clientApprovedAt?: string
  notes?: string
  /** Visível para o cliente no portal (default: true). */
  clientVisible?: boolean
  /** Exige aprovação do cliente para concluir (default: false). */
  requiresApproval?: boolean
  /** Pontos de gamificação ganhos ao concluir a etapa (default: 0). */
  points?: number
}

/** Eventos estruturais visíveis ao cliente (etapa adicionada/removida etc.). */
export type HistoryEntryType =
  | 'projeto_criado'
  | 'fase_adicionada'
  | 'fase_removida'
  | 'fase_renomeada'

export interface HistoryEntry {
  id: string
  type: HistoryEntryType
  /** Texto pronto para exibição, ex.: 'Etapa "Pagamentos" adicionada'. */
  label: string
  at: string
  /** Quem fez a alteração (sempre Nairuz nesta fase). */
  actor: string
}

export interface ProjectOwners {
  csId?: string
  techLeadId?: string
  designerId?: string
  clientContact?: string
  /** Nomes livres (digitados). A busca por usuário fica para depois. */
  csName?: string
  techLeadName?: string
  designerName?: string
}

/** Tarefa normalizada. Checklists continuam existindo, mas viram itens consultáveis. */
export interface ProjectTask {
  id: string
  projectId: string
  phaseId?: string
  checklistItemId?: string
  title: string
  status: ProjectTaskStatus
  source: ProjectTaskSource
  ownerId?: string
  dueDate?: string
  clientResponsibility?: boolean
  createdAt: string
  updatedAt?: string
  completedAt?: string
}

/** Cobrança/pendência formal, com lado responsável e prazo. */
export interface ProjectCharge {
  id: string
  projectId: string
  title: string
  description?: string
  ownerSide: ProjectChargeSide
  ownerId?: string
  status: ProjectChargeStatus
  priority: RiskLevel
  dueDate?: string
  createdAt: string
  updatedAt?: string
  resolvedAt?: string
}

export interface ScopeFile {
  id: string
  name: string
  size?: number
  mimeType?: string
  url?: string
  notes?: string
  uploadedAt: string
  uploadedBy?: string
}

export interface TimeEntry {
  id: string
  label: string
  hours: number
  kind: 'planejado' | 'realizado'
  ownerId?: string
  loggedAt: string
}

export interface ProjectAttachment {
  id: string
  name: string
  url?: string
  type?: string
  createdAt: string
}

export interface ProjectTracking {
  scopeStatus: TrackingScopeStatus
  estimatedHours: number
  usedHours: number
  deadlineConfidence: DeadlineConfidence
  notes?: string
  updatedAt?: string
}

export interface SecurityCheck {
  id: string
  label: string
  done: boolean
  updatedAt?: string
}

export interface ProjectSecurity {
  lastReviewAt?: string
  checklist: SecurityCheck[]
}

export interface Project {
  id: string
  /** Código curto e legível, ex: "PRJ-014". */
  code: string
  clientName: string
  organizationId: string
  platform: Platform
  type: ProjectType
  status: ProjectStatus
  /** Id da fase atual (a primeira não concluída, normalmente). */
  currentPhaseId?: string
  startDate: string
  goLiveDate?: string
  /** 0..100 — derivado dos checklists, mantido em sync pelo serviço. */
  progress: number
  risk: RiskLevel
  nextAction?: string
  updatedAt: string
  owners: ProjectOwners
  phases: Phase[]
  /**
   * E-mails de clientes com acesso liberado a este projeto. A Nairuz controla
   * esta lista; o portal do cliente só mostra projetos cujo e-mail consta aqui.
   */
  clientEmails: string[]
  /** IDs de usuários que recebem notificações deste projeto. */
  collaborators?: string[]
  /** Coleções normalizadas para visões operacionais. */
  tasks?: ProjectTask[]
  charges?: ProjectCharge[]
  scopeFiles?: ScopeFile[]
  timeEntries?: TimeEntry[]
  attachments?: ProjectAttachment[]
  tracking?: ProjectTracking
  security?: ProjectSecurity
  templateNotes?: string
  /** Produto/serviço — define o template de etapas usado na criação. */
  product?: Product
  /** Histórico estrutural visível ao cliente. */
  history: HistoryEntry[]
  /** NPS respondido pelo cliente (libera o encerramento). */
  nps?: Nps
  /** Horas de suporte antes/depois de responder o NPS. */
  supportHours: { antes: number; depois: number }
  /** Configuração de finalização/upsell (editável pela Nairuz). */
  finalization: FinalizationConfig
}

/** Resposta de NPS do cliente. */
export interface Nps {
  score: number // 0..10
  comment?: string
  answeredAt: string
}

/** CTA de finalização (Sustentação ou Evolução). */
export interface UpsellCta {
  /** Texto/apresentação curta exibida antes do WhatsApp. */
  apresentacao: string
  /** Link do WhatsApp do comercial. */
  whatsappUrl: string
}

export interface FinalizationConfig {
  mensagem: string
  sustentacao: UpsellCta
  evolucao: UpsellCta
}
