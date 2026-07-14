import type {
  BoardStatus,
  CategoriaLinkUtil,
  Platform,
  Product,
  Project,
  ProjectType,
  TravaLevel,
} from '@/types'

/** Estado persistido da automação de criação de projeto. */
export type StatusImportacaoProjeto =
  | 'aguardando_arquivo'
  | 'na_fila'
  | 'enviando_naira'
  | 'processando_naira'
  | 'aguardando_revisao'
  | 'criando_projeto'
  | 'concluida'
  | 'falhou'
  | 'cancelada'

export interface StatusIntegracaoNaira {
  modo: 'mock' | 'http' | 'disabled'
  habilitada: boolean
  configurada: boolean
  persistenciaPronta: boolean
  tamanhoMaximoPdfBytes: number
  tamanhoMaximoJsonBytes: number
  provedor: 'naira'
  motivo?: string
  versaoContrato: string
  contratoUpload?: {
    formato: 'multipart/form-data'
    partesDocumento: TipoDocumentoImportacao[]
    parteManifesto: string
    parteLegadaArquivoUnico: string
  }
}

export interface ArquivoImportacaoProjeto {
  nomeOriginal: string
  mimeType: string
  tamanhoBytes: number
  sha256?: string
  armazenado?: boolean
  expiraEm?: string
}

export type TipoDocumentoImportacao = 'briefing' | 'escopo'

export interface DocumentoImportacaoProjeto extends ArquivoImportacaoProjeto {
  tipo: TipoDocumentoImportacao
}

export interface ProvedorImportacaoProjeto {
  nome: string
  modo: 'mock' | 'http' | 'disabled' | 'm2m' | 'manual'
  tentativas: number
  requisicaoId?: string
  ultimaInteracaoEm?: string
}

export interface ItemChecklistSugerido {
  idTemporario: string
  titulo: string
  responsabilidadeCliente?: boolean
  nivelTrava?: TravaLevel
  colunaKanban?: BoardStatus
  bloco?: string
}

export interface FaseSugeridaImportacao {
  idTemporario: string
  ordem: number
  nome: string
  visivelCliente?: boolean
  exigeAprovacao?: boolean
  checklist: ItemChecklistSugerido[]
}

export interface LinkUtilSugeridoImportacao {
  idTemporario?: string
  titulo: string
  url: string
  categoria?: CategoriaLinkUtil
  descricao?: string
  /** Gate humano: links não são criados sem esta confirmação. */
  revisado?: boolean
  /** Nunca deve ser verdadeiro por inferência da automação. */
  visivelCliente?: boolean
}

export interface PendenciaSugeridaImportacao {
  idTemporario?: string
  titulo: string
  descricao?: string
  campo?: string
  obrigatoria?: boolean
  responsabilidadeCliente?: boolean
  prazo?: string
  /** Gate humano: pendências não são criadas sem esta confirmação. */
  revisado?: boolean
}

export interface RascunhoImportacaoProjeto {
  cliente: {
    nome?: string
    nomeOrganizacaoSugerida?: string
    segmento?: string
  }
  projeto: {
    plataforma?: Platform
    tipo?: ProjectType
    produto?: Product
    dataGoLive?: string
    horasEstimadas?: number
    proximaAcao?: string
    resumoEscopo?: string
  }
  fases: FaseSugeridaImportacao[]
  linksUteis?: LinkUtilSugeridoImportacao[]
  pendencias?: PendenciaSugeridaImportacao[]
}

export interface CampoExtraidoImportacao {
  campo: string
  rotulo?: string
  valor?: unknown
  confianca?: number
  fonteIds?: string[]
}

export interface FonteImportacaoProjeto {
  id: string
  /** Documento que originou a evidência. */
  tipoDocumento?: TipoDocumentoImportacao
  nomeDocumento?: string
  pagina?: number
  trecho?: string
  rotulo?: string
}

export interface ErroImportacaoProjeto {
  codigo?: string
  mensagem: string
  recuperavel?: boolean
}

export interface ImportacaoProjeto {
  id: string
  status: StatusImportacaoProjeto
  versao: number
  /** PDFs enviados no fluxo atual. Um único documento continua válido. */
  documentos?: DocumentoImportacaoProjeto[]
  /** Compatibilidade com importações JSON/M2M e registros anteriores. */
  arquivo?: ArquivoImportacaoProjeto | null
  provedor: ProvedorImportacaoProjeto
  rascunho?: RascunhoImportacaoProjeto
  campos?: CampoExtraidoImportacao[]
  fontes?: FonteImportacaoProjeto[]
  validacao?: {
    valido?: boolean
    bloqueios: string[]
    avisos: string[]
  }
  erro?: ErroImportacaoProjeto | string
  projetoId?: string
  criadoPor?: string
  origem?: 'painel' | 'naira_m2m' | 'json_manual'
  auditoria?: Array<{
    id: string
    tipo: string
    atorId: string
    em: string
    detalhes?: Record<string, unknown>
  }>
  criadoEm: string
  atualizadoEm: string
}

export interface ConfirmacaoImportacaoProjeto {
  importacao: ImportacaoProjeto
  projeto?: Project
}
