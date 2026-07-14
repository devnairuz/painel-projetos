import type {
  ConfirmacaoImportacaoProjeto,
  ImportacaoProjeto,
  Project,
  RascunhoImportacaoProjeto,
  StatusIntegracaoNaira,
} from '@/types'
import type { TipoDocumentoImportacao } from '@/types/importacaoProjeto'

const URL_API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'
const CHAVE_TOKEN_EMPRESA = 'nairuz-portal:company-token'

export class ErroHttpImportacao extends Error {
  readonly status: number
  readonly codigo?: string
  readonly detalhes?: unknown

  constructor(mensagem: string, status: number, codigo?: string, detalhes?: unknown) {
    super(mensagem)
    this.name = 'ErroHttpImportacao'
    this.status = status
    this.codigo = codigo
    this.detalhes = detalhes
  }
}

function cabecalhoAutenticacao(): Record<string, string> {
  try {
    const token = localStorage.getItem(CHAVE_TOKEN_EMPRESA)
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

function mensagemErro(corpo: unknown, status: number): { mensagem: string; codigo?: string } {
  if (!corpo || typeof corpo !== 'object') return { mensagem: `Erro ${status} ao acessar a automação.` }
  const registro = corpo as Record<string, unknown>
  const erro = registro.erro ?? registro.error
  if (typeof erro === 'string') {
    return {
      mensagem:
        (typeof registro.mensagem === 'string' && registro.mensagem) ||
        (typeof registro.message === 'string' && registro.message) ||
        erro,
      codigo: erro,
    }
  }
  if (erro && typeof erro === 'object') {
    const detalhe = erro as Record<string, unknown>
    return {
      mensagem:
        (typeof detalhe.mensagem === 'string' && detalhe.mensagem) ||
        (typeof detalhe.message === 'string' && detalhe.message) ||
        `Erro ${status} ao acessar a automação.`,
      codigo: typeof detalhe.codigo === 'string' ? detalhe.codigo : undefined,
    }
  }
  return {
    mensagem:
      (typeof registro.mensagem === 'string' && registro.mensagem) ||
      (typeof registro.message === 'string' && registro.message) ||
      `Erro ${status} ao acessar a automação.`,
    codigo: typeof registro.codigo === 'string' ? registro.codigo : undefined,
  }
}

async function requisitar<T>(
  metodo: string,
  caminho: string,
  opcoes?: {
    corpo?: unknown
    binario?: ArrayBuffer
    headers?: Record<string, string>
  },
): Promise<T> {
  const binario = opcoes?.binario !== undefined
  let resposta: Response
  try {
    resposta = await fetch(`${URL_API}${caminho}`, {
      method: metodo,
      headers: {
        ...cabecalhoAutenticacao(),
        ...(binario ? { 'Content-Type': 'application/pdf' } : { 'Content-Type': 'application/json' }),
        ...opcoes?.headers,
      },
      body: binario
        ? opcoes.binario
        : opcoes?.corpo !== undefined
          ? JSON.stringify(opcoes.corpo)
          : undefined,
    })
  } catch (erro) {
    throw new ErroHttpImportacao(
      'Não foi possível conectar à automação. Verifique se a API está disponível.',
      0,
      'sem_conexao',
      erro,
    )
  }

  if (!resposta.ok) {
    let corpo: unknown
    try {
      corpo = await resposta.json()
    } catch {
      corpo = undefined
    }
    const { mensagem, codigo } = mensagemErro(corpo, resposta.status)
    throw new ErroHttpImportacao(mensagem, resposta.status, codigo, corpo)
  }

  if (resposta.status === 204) return undefined as T
  return (await resposta.json()) as T
}

export function gerarChaveIdempotencia(prefixo: string): string {
  const sufixo =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `${prefixo}-${sufixo}`
}

export function obterStatusIntegracaoNaira(): Promise<StatusIntegracaoNaira> {
  return requisitar('GET', '/api/integrations/naira/status')
}

export async function listarImportacoesProjeto(): Promise<ImportacaoProjeto[]> {
  const resposta = await requisitar<
    ImportacaoProjeto[] | { itens?: ImportacaoProjeto[]; importacoes?: ImportacaoProjeto[] }
  >('GET', '/api/project-imports')
  if (Array.isArray(resposta)) return resposta
  return resposta.itens ?? resposta.importacoes ?? []
}

export function obterImportacaoProjeto(id: string): Promise<ImportacaoProjeto> {
  return requisitar('GET', `/api/project-imports/${encodeURIComponent(id)}`)
}

export function criarImportacaoProjeto(
  documentos: Array<{ tipo: TipoDocumentoImportacao; arquivo: Pick<File, 'name' | 'type' | 'size'> }>,
  chaveIdempotencia: string,
): Promise<ImportacaoProjeto> {
  return requisitar('POST', '/api/project-imports', {
    corpo: {
      documentos: documentos.map(({ tipo, arquivo }) => ({
        tipo,
        nomeArquivo: arquivo.name,
        mimeType: arquivo.type || 'application/pdf',
        tamanhoBytes: arquivo.size,
      })),
    },
    headers: { 'Idempotency-Key': chaveIdempotencia },
  })
}

/** Cria uma importação revisável a partir de uma saída JSON já estruturada. */
export function criarImportacaoJson(
  resultado: Record<string, unknown>,
  chaveIdempotencia: string,
  nomeArquivo?: string,
): Promise<ImportacaoProjeto> {
  return requisitar('POST', '/api/project-imports/json', {
    corpo: { resultado },
    headers: {
      'Idempotency-Key': chaveIdempotencia,
      ...(nomeArquivo ? { 'X-File-Name': nomeArquivo } : {}),
    },
  })
}

export async function enviarPdfImportacao(
  id: string,
  versao: number,
  tipo: TipoDocumentoImportacao,
  arquivo: File,
): Promise<ImportacaoProjeto> {
  const bytes = await arquivo.arrayBuffer()
  return requisitar(
    'PUT',
    `/api/project-imports/${encodeURIComponent(id)}/files/${encodeURIComponent(tipo)}`,
    {
      binario: bytes,
      headers: { 'If-Match': String(versao) },
    },
  )
}

export function atualizarRascunhoImportacao(
  id: string,
  versao: number,
  rascunho: RascunhoImportacaoProjeto,
): Promise<ImportacaoProjeto> {
  return requisitar('PATCH', `/api/project-imports/${encodeURIComponent(id)}/draft`, {
    corpo: { versao, rascunho },
    headers: { 'If-Match': String(versao) },
  })
}

export function tentarNovamenteImportacao(
  id: string,
  versao: number,
  chaveIdempotencia: string,
): Promise<ImportacaoProjeto> {
  return requisitar('POST', `/api/project-imports/${encodeURIComponent(id)}/retry`, {
    corpo: { versao },
    headers: {
      'Idempotency-Key': chaveIdempotencia,
      'If-Match': String(versao),
    },
  })
}

export function cancelarImportacao(
  id: string,
  versao: number,
  chaveIdempotencia: string,
): Promise<ImportacaoProjeto> {
  return requisitar('POST', `/api/project-imports/${encodeURIComponent(id)}/cancel`, {
    corpo: { versao },
    headers: {
      'Idempotency-Key': chaveIdempotencia,
      'If-Match': String(versao),
    },
  })
}

export async function confirmarImportacao(
  importacao: ImportacaoProjeto,
  entrada: {
    organizationId: string
    usarFasesSugeridas: boolean
    rascunho?: RascunhoImportacaoProjeto
  },
  chaveIdempotencia: string,
): Promise<ConfirmacaoImportacaoProjeto> {
  const resposta = await requisitar<
    ImportacaoProjeto | ConfirmacaoImportacaoProjeto | { importacao: ImportacaoProjeto; projeto?: Project }
  >('POST', `/api/project-imports/${encodeURIComponent(importacao.id)}/confirm`, {
    corpo: {
      versao: importacao.versao,
      organizationId: entrada.organizationId,
      usarFasesSugeridas: entrada.usarFasesSugeridas,
      rascunho: entrada.rascunho,
    },
    headers: {
      'Idempotency-Key': chaveIdempotencia,
      'If-Match': String(importacao.versao),
    },
  })
  return 'importacao' in resposta ? resposta : { importacao: resposta }
}

/** Busca sem fallback local: uma confirmação só é sucesso quando a API devolve o projeto. */
export function obterProjetoCriadoImportacao(projetoId: string): Promise<Project> {
  return requisitar('GET', `/api/projects/${encodeURIComponent(projetoId)}`)
}
