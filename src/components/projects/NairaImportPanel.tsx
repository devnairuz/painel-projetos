import type { ChangeEvent } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  Files,
  FlaskConical,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'
import type { ImportacaoProjeto, StatusImportacaoProjeto, StatusIntegracaoNaira } from '@/types'
import type {
  DocumentoImportacaoProjeto,
  TipoDocumentoImportacao,
} from '@/types/importacaoProjeto'
import { Button } from '@/components/ui/Button'

interface NairaImportPanelProps {
  integracao?: StatusIntegracaoNaira
  carregandoIntegracao: boolean
  erroIntegracao?: string
  documentos: Partial<Record<TipoDocumentoImportacao, File>>
  errosDocumentos: Partial<Record<TipoDocumentoImportacao, string>>
  erroEnvio?: string
  importacao?: ImportacaoProjeto
  importacoesRecentes: ImportacaoProjeto[]
  carregandoRecentes: boolean
  executando: boolean
  onSelecionarArquivo: (
    tipo: TipoDocumentoImportacao,
    evento: ChangeEvent<HTMLInputElement>,
  ) => void
  onRemoverArquivo: (tipo: TipoDocumentoImportacao) => void
  onIniciar: () => void
  onRetomar: (importacao: ImportacaoProjeto) => void
  onTentarNovamente: () => void
  onCancelar: () => void
  onAbrirProjeto: (importacao: ImportacaoProjeto) => void
  onAtualizar: () => void
}

const META_DOCUMENTO: Record<
  TipoDocumentoImportacao,
  { label: string; descricao: string }
> = {
  briefing: {
    label: 'Briefing',
    descricao: 'Contexto operacional, objetivos, referências, insumos e regras de negócio.',
  },
  escopo: {
    label: 'Escopo',
    descricao: 'Fonte contratual de entregas, exclusões, horas, limites e prazos vendidos.',
  },
}

const META_STATUS: Record<
  StatusImportacaoProjeto,
  { label: string; detalhe: string; classe: string }
> = {
  aguardando_arquivo: {
    label: 'Preparando envio',
    detalhe: 'A importação foi registrada e aguarda os documentos selecionados.',
    classe: 'bg-sky-50 text-sky-700 ring-sky-200',
  },
  na_fila: {
    label: 'Na fila',
    detalhe: 'Os documentos foram recebidos e aguardam processamento.',
    classe: 'bg-sky-50 text-sky-700 ring-sky-200',
  },
  enviando_naira: {
    label: 'Enviando para a Naira',
    detalhe: 'Briefing e escopo disponíveis estão sendo encaminhados ao provedor.',
    classe: 'bg-violet-50 text-violet-700 ring-violet-200',
  },
  processando_naira: {
    label: 'Naira analisando',
    detalhe: 'A extração está em andamento. Você pode fechar esta janela.',
    classe: 'bg-violet-50 text-violet-700 ring-violet-200',
  },
  aguardando_revisao: {
    label: 'Pronta para revisão',
    detalhe: 'A análise terminou. Confirme os dados antes de criar o projeto.',
    classe: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  criando_projeto: {
    label: 'Criando projeto',
    detalhe: 'Os dados revisados estão sendo aplicados.',
    classe: 'bg-brand-50 text-brand-700 ring-brand-200',
  },
  concluida: {
    label: 'Projeto criado',
    detalhe: 'A automação foi concluída com sucesso.',
    classe: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  falhou: {
    label: 'Falha na análise',
    detalhe: 'A integração devolveu um erro. Revise a mensagem e tente novamente.',
    classe: 'bg-red-50 text-red-700 ring-red-200',
  },
  cancelada: {
    label: 'Cancelada',
    detalhe: 'Esta análise não será processada.',
    classe: 'bg-slate-100 text-slate-600 ring-slate-200',
  },
}

const STATUS_EM_PROCESSAMENTO = new Set<StatusImportacaoProjeto>([
  'na_fila',
  'enviando_naira',
  'processando_naira',
  'criando_projeto',
])

function formatarTamanho(bytes: number) {
  if (!bytes) return 'sem PDF anexado'
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

function documentosDaImportacao(importacao: ImportacaoProjeto): DocumentoImportacaoProjeto[] {
  if (importacao.documentos?.length) return importacao.documentos
  if (importacao.arquivo?.mimeType === 'application/pdf') {
    return [{ ...importacao.arquivo, tipo: 'briefing' }]
  }
  return []
}

function nomeImportacao(importacao: ImportacaoProjeto) {
  const documentos = documentosDaImportacao(importacao)
  if (documentos.length === 2) return 'Briefing + Escopo'
  if (documentos.length === 1) {
    return `${META_DOCUMENTO[documentos[0].tipo].label} · ${documentos[0].nomeOriginal}`
  }
  if (importacao.arquivo?.nomeOriginal) return importacao.arquivo.nomeOriginal
  return importacao.provedor?.modo === 'm2m'
    ? 'Solicitação recebida por automação'
    : 'Documentos do projeto'
}

function tamanhoImportacao(importacao: ImportacaoProjeto) {
  const documentos = documentosDaImportacao(importacao)
  if (documentos.length) {
    return documentos.reduce((total, documento) => total + documento.tamanhoBytes, 0)
  }
  return importacao.arquivo?.tamanhoBytes ?? 0
}

function formatarData(valor: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(valor))
}

function mensagemErro(importacao: ImportacaoProjeto) {
  if (!importacao.erro) return undefined
  return typeof importacao.erro === 'string' ? importacao.erro : importacao.erro.mensagem
}

function RotuloIntegracao({ integracao }: { integracao: StatusIntegracaoNaira }) {
  if (integracao.modo === 'mock') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
        <FlaskConical className="size-3.5" /> Simulador de integração
      </span>
    )
  }
  if (
    integracao.modo === 'http' &&
    integracao.habilitada &&
    integracao.configurada &&
    integracao.persistenciaPronta
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-200">
        <Sparkles className="size-3.5" /> Naira conectada
      </span>
    )
  }
  if (integracao.modo === 'http') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
        <AlertCircle className="size-3.5" /> Conexão Naira incompleta
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
      <AlertCircle className="size-3.5" /> Integração desativada
    </span>
  )
}

function SlotDocumento({
  tipo,
  arquivo,
  erro,
  limite,
  desabilitado,
  onSelecionar,
  onRemover,
}: {
  tipo: TipoDocumentoImportacao
  arquivo?: File
  erro?: string
  limite: number
  desabilitado: boolean
  onSelecionar: (evento: ChangeEvent<HTMLInputElement>) => void
  onRemover: () => void
}) {
  const meta = META_DOCUMENTO[tipo]
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        arquivo ? 'border-violet-300 bg-violet-50/40' : 'border-slate-200 bg-slate-50/60'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`flex size-8 items-center justify-center rounded-lg ${arquivo ? 'bg-violet-100 text-violet-700' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>
              <FileText className="size-4" />
            </span>
            <div>
              <h5 className="text-sm font-semibold text-slate-900">{meta.label}</h5>
              <p className="text-[11px] text-slate-500">PDF · até {formatarTamanho(limite)}</p>
            </div>
          </div>
        </div>
        {arquivo && (
          <button
            type="button"
            onClick={onRemover}
            disabled={desabilitado}
            className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none disabled:opacity-50"
            aria-label={`Remover ${meta.label}`}
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <p className="mt-3 min-h-8 text-xs leading-4 text-slate-600">{meta.descricao}</p>
      <label className="mt-3 flex min-h-20 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-center transition-colors hover:border-violet-400 hover:bg-violet-50/30 focus-within:ring-2 focus-within:ring-violet-400">
        <input
          key={arquivo ? `${tipo}-${arquivo.name}-${arquivo.lastModified}` : `${tipo}-sem-pdf`}
          type="file"
          accept="application/pdf,.pdf"
          onChange={onSelecionar}
          disabled={desabilitado}
          className="sr-only"
        />
        {arquivo ? (
          <>
            <span className="max-w-full truncate text-xs font-semibold text-slate-800">{arquivo.name}</span>
            <span className="mt-1 text-[11px] text-slate-500">{formatarTamanho(arquivo.size)} · clique para substituir</span>
          </>
        ) : (
          <>
            <Upload className="size-5 text-slate-400" />
            <span className="mt-1.5 text-xs font-medium text-slate-700">Selecionar {meta.label.toLowerCase()}</span>
          </>
        )}
      </label>
      {erro && <p className="mt-2 text-xs leading-4 text-red-600">{erro}</p>}
    </div>
  )
}

export function NairaImportPanel({
  integracao,
  carregandoIntegracao,
  erroIntegracao,
  documentos,
  errosDocumentos,
  erroEnvio,
  importacao,
  importacoesRecentes,
  carregandoRecentes,
  executando,
  onSelecionarArquivo,
  onRemoverArquivo,
  onIniciar,
  onRetomar,
  onTentarNovamente,
  onCancelar,
  onAbrirProjeto,
  onAtualizar,
}: NairaImportPanelProps) {
  const disponivel = Boolean(
    integracao?.habilitada && integracao.configurada && integracao.persistenciaPronta,
  )
  const processando = importacao ? STATUS_EM_PROCESSAMENTO.has(importacao.status) : false
  const metaAtual = importacao ? META_STATUS[importacao.status] : undefined
  const limite = integracao?.tamanhoMaximoPdfBytes ?? 8 * 1024 * 1024
  const quantidadeSelecionada = Number(Boolean(documentos.briefing)) + Number(Boolean(documentos.escopo))
  const somenteBriefing = quantidadeSelecionada === 1 && Boolean(documentos.briefing)
  const documentosAtuais = importacao ? documentosDaImportacao(importacao) : []
  const documentosPendentes = documentosAtuais.filter((documento) => !documento.armazenado)
  const temArquivoPendenteNoNavegador = documentosPendentes.some(
    (documento) => documentos[documento.tipo],
  )

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wider text-violet-600 uppercase">Automação</p>
              <h4 className="mt-1 text-base font-semibold text-slate-900">Documentos do projeto</h4>
              <p className="mt-1 max-w-xl text-sm leading-5 text-slate-600">
                Envie Briefing, Escopo ou ambos. A Naira cruza as fontes e você revisa tudo antes da criação.
              </p>
            </div>
            {carregandoIntegracao ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <LoaderCircle className="size-3.5 animate-spin" /> Verificando integração
              </span>
            ) : integracao ? <RotuloIntegracao integracao={integracao} /> : null}
          </div>

          {erroIntegracao && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erroIntegracao}</div>
          )}

          {integracao && !disponivel && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-700" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">Automação indisponível neste ambiente</p>
                  <p className="mt-1 text-sm leading-5 text-amber-800">
                    {integracao.motivo ?? 'Configure a conexão da Naira e uma persistência compartilhada no backend antes de enviar documentos.'}
                  </p>
                  <p className="mt-2 text-xs text-amber-700">
                    Contrato {integracao.versaoContrato} · persistência {integracao.persistenciaPronta ? 'pronta' : 'não configurada'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {integracao?.modo === 'mock' && disponivel && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
              Este ambiente usa respostas simuladas para validar o fluxo integrado. Nenhum documento é enviado à Naira.
            </div>
          )}

          {!importacao && (
            <div className="mt-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {(['briefing', 'escopo'] as const).map((tipo) => (
                  <SlotDocumento
                    key={tipo}
                    tipo={tipo}
                    arquivo={documentos[tipo]}
                    erro={errosDocumentos[tipo]}
                    limite={limite}
                    desabilitado={!disponivel || executando}
                    onSelecionar={(evento) => onSelecionarArquivo(tipo, evento)}
                    onRemover={() => onRemoverArquivo(tipo)}
                  />
                ))}
              </div>

              {quantidadeSelecionada > 0 && (
                <div className={`mt-3 flex items-start gap-2 rounded-xl border p-3 text-xs leading-5 ${
                  quantidadeSelecionada === 2
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-sky-200 bg-sky-50 text-sky-800'
                }`}>
                  {quantidadeSelecionada === 2 ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <Files className="mt-0.5 size-4 shrink-0" />}
                  <span>
                    <strong>{quantidadeSelecionada === 2 ? 'Análise completa.' : 'Análise com um documento.'}</strong>{' '}
                    {quantidadeSelecionada === 2
                      ? 'Briefing e Escopo serão cruzados para gerar sugestões mais contextualizadas.'
                      : somenteBriefing
                        ? 'Falta o Escopo: o contexto será extraído, mas entregas, horas e gates precisam continuar pendentes de validação contratual.'
                        : 'Falta o Briefing: o contrato será preservado e os detalhes operacionais ausentes virarão pontos de revisão.'}
                  </span>
                </div>
              )}

              {erroEnvio && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erroEnvio}</p>}
              <div className="mt-3 flex justify-end">
                <Button type="button" size="sm" onClick={onIniciar} disabled={!quantidadeSelecionada || !disponivel || executando}>
                  {executando ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  {integracao?.modo === 'mock' ? 'Executar simulação' : quantidadeSelecionada === 2 ? 'Analisar os dois documentos' : 'Analisar documento'}
                </Button>
              </div>
            </div>
          )}

          {importacao && metaAtual && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 ring-1 ring-slate-200">
                    {processando ? <LoaderCircle className="size-5 animate-spin" /> : <Files className="size-5" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{nomeImportacao(importacao)}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatarTamanho(tamanhoImportacao(importacao))} · atualizado {formatarData(importacao.atualizadoEm)}
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${metaAtual.classe}`}>{metaAtual.label}</span>
              </div>

              {documentosAtuais.length > 0 && (
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {documentosAtuais.map((documento) => (
                    <li key={documento.tipo} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                      {documento.armazenado ? <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" /> : <Clock3 className="size-3.5 shrink-0 text-amber-600" />}
                      <span className="min-w-0 flex-1 truncate"><strong>{META_DOCUMENTO[documento.tipo].label}:</strong> {documento.nomeOriginal}</span>
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-4 text-sm leading-5 text-slate-600" aria-live="polite">{metaAtual.detalhe}</p>
              {mensagemErro(importacao) && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{mensagemErro(importacao)}</div>}
              {erroEnvio && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erroEnvio}</div>}
              {importacao.status === 'aguardando_arquivo' && !temArquivoPendenteNoNavegador && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                  O navegador não mantém PDFs ao fechar ou recarregar. Cancele esta análise e inicie outra para selecionar os documentos pendentes novamente.
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                {importacao.status === 'aguardando_arquivo' && temArquivoPendenteNoNavegador && (
                  <Button type="button" size="sm" onClick={onIniciar} disabled={executando}>
                    <Upload className="size-3.5" /> Enviar documentos restantes
                  </Button>
                )}
                {importacao.status === 'falhou' &&
                  (typeof importacao.erro === 'string' || importacao.erro?.recuperavel !== false) && (
                    <Button type="button" size="sm" onClick={onTentarNovamente} disabled={executando}>
                      <RotateCcw className="size-3.5" /> Tentar novamente
                    </Button>
                  )}
                {importacao.status === 'concluida' && importacao.projetoId && (
                  <Button type="button" size="sm" onClick={() => onAbrirProjeto(importacao)} disabled={executando}>
                    <CheckCircle2 className="size-3.5" /> Abrir projeto
                  </Button>
                )}
                {!['criando_projeto', 'concluida', 'cancelada'].includes(importacao.status) && (
                  <Button type="button" variant="secondary" size="sm" onClick={onCancelar} disabled={executando}>Cancelar análise</Button>
                )}
                <Button type="button" variant="ghost" size="sm" onClick={onAtualizar} disabled={executando}>
                  <RefreshCw className="size-3.5" /> Atualizar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <aside className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 lg:p-5" aria-labelledby="titulo-importacoes-recentes">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 id="titulo-importacoes-recentes" className="text-sm font-semibold text-slate-900">Análises recentes</h4>
            <p className="mt-0.5 text-xs text-slate-500">Feche a janela e retome quando precisar.</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onAtualizar} aria-label="Atualizar análises recentes">
            <RefreshCw className={`size-3.5 ${carregandoRecentes ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {carregandoRecentes && importacoesRecentes.length === 0 ? (
          <div className="mt-4 space-y-2" aria-label="Carregando análises recentes">
            {Array.from({ length: 3 }).map((_, indice) => <div key={indice} className="h-20 animate-pulse rounded-xl bg-slate-200/70" />)}
          </div>
        ) : importacoesRecentes.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center">
            <Clock3 className="mx-auto size-6 text-slate-400" />
            <p className="mt-2 text-xs leading-5 text-slate-500">As análises iniciadas neste ambiente aparecerão aqui.</p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {importacoesRecentes.slice(0, 5).map((item) => {
              const meta = META_STATUS[item.status]
              const selecionada = item.id === importacao?.id
              const cancelada = item.status === 'cancelada'
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => item.status === 'concluida' ? onAbrirProjeto(item) : onRetomar(item)}
                    disabled={cancelada}
                    title={cancelada ? 'Análises canceladas não podem ser retomadas.' : undefined}
                    className={`w-full rounded-xl border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-65 ${selecionada ? 'border-brand-300 bg-brand-50/60' : 'border-slate-200 bg-white hover:border-slate-300 disabled:hover:border-slate-200 disabled:hover:bg-white'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 truncate text-xs font-semibold text-slate-800">{nomeImportacao(item)}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${meta.classe}`}>{meta.label}</span>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">{formatarData(item.atualizadoEm)}</p>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </aside>
    </div>
  )
}
