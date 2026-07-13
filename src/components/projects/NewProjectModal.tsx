import { useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  FileText,
  ListChecks,
  Plus,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'
import type { Platform, Product, Project, ProjectType } from '@/types'
import { PLATFORM_META, TYPE_META } from '@/constants'
import { PRODUCT_META, PRODUCT_TEMPLATES } from '@/constants/templates'
import { useOrganizations } from '@/hooks/useProjects'
import { useToast } from '@/components/ui/Toast'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { createOrganization, createProject } from '@/services/projectsService'

interface NewProjectModalProps {
  open: boolean
  onClose: () => void
  onCreated: (project: Project) => void
}

type EtapaFluxo = 1 | 2 | 3
type OrigemCadastro = 'guiado' | 'pdf'

const TAMANHO_MAXIMO_PDF = 8 * 1024 * 1024
const ETAPAS_FLUXO = [
  { numero: 1 as const, rotulo: 'Origem' },
  { numero: 2 as const, rotulo: 'Dados do projeto' },
  { numero: 3 as const, rotulo: 'Revisão' },
]

const OPCOES_PLATAFORMA = Object.entries(PLATFORM_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}))
const OPCOES_TIPO = Object.entries(TYPE_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}))
const OPCOES_PRODUTO = Object.entries(PRODUCT_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}))

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

function formatarTamanho(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

function mensagemDoErro(erro: unknown, alternativa: string) {
  return erro instanceof Error && erro.message ? erro.message : alternativa
}

export function NewProjectModal({ open, onClose, onCreated }: NewProjectModalProps) {
  const { data: organizacoes } = useOrganizations()
  const { notify } = useToast()

  const [etapa, setEtapa] = useState<EtapaFluxo>(1)
  const [origem, setOrigem] = useState<OrigemCadastro>('guiado')
  const [arquivoPdf, setArquivoPdf] = useState<File>()
  const [erroPdf, setErroPdf] = useState<string>()

  const [nomeCliente, setNomeCliente] = useState('')
  const [organizacaoId, setOrganizacaoId] = useState('')
  const [plataforma, setPlataforma] = useState<Platform>('vtex')
  const [tipo, setTipo] = useState<ProjectType>('implantacao')
  const [produto, setProduto] = useState<Product>('ecommerce')
  const [dataGoLive, setDataGoLive] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string>()

  // Cadastro inline de organização
  const [criandoOrganizacao, setCriandoOrganizacao] = useState(false)
  const [nomeOrganizacao, setNomeOrganizacao] = useState('')
  const [segmentoOrganizacao, setSegmentoOrganizacao] = useState('')
  const [salvandoOrganizacao, setSalvandoOrganizacao] = useState(false)

  const opcoesOrganizacao = useMemo(
    () => (organizacoes ?? []).map((organizacao) => ({ value: organizacao.id, label: organizacao.name })),
    [organizacoes],
  )
  const nomeOrganizacaoSelecionada =
    opcoesOrganizacao.find((organizacao) => organizacao.value === organizacaoId)?.label ?? '—'
  const etapasDoTemplate = PRODUCT_TEMPLATES[produto]

  async function cadastrarOrganizacao() {
    if (!nomeOrganizacao.trim()) return

    setSalvandoOrganizacao(true)
    setErro(undefined)
    try {
      const organizacao = await createOrganization({
        name: nomeOrganizacao.trim(),
        segment: segmentoOrganizacao.trim(),
      })
      setOrganizacaoId(organizacao.id)
      setNomeOrganizacao('')
      setSegmentoOrganizacao('')
      setCriandoOrganizacao(false)
      notify(`Organização "${organizacao.name}" cadastrada.`)
    } catch (erroDaOrganizacao) {
      setErro(mensagemDoErro(erroDaOrganizacao, 'Não foi possível cadastrar a organização.'))
    } finally {
      setSalvandoOrganizacao(false)
    }
  }

  function selecionarPdf(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    setErroPdf(undefined)

    if (!arquivo) {
      setArquivoPdf(undefined)
      return
    }

    const nomeValido = arquivo.name.toLocaleLowerCase('pt-BR').endsWith('.pdf')
    const tipoValido = !arquivo.type || arquivo.type === 'application/pdf'
    if (!nomeValido || !tipoValido) {
      setArquivoPdf(undefined)
      setErroPdf('Selecione um arquivo no formato PDF.')
      evento.target.value = ''
      return
    }

    if (arquivo.size > TAMANHO_MAXIMO_PDF) {
      setArquivoPdf(undefined)
      setErroPdf('O PDF deve ter no máximo 8 MB.')
      evento.target.value = ''
      return
    }

    setArquivoPdf(arquivo)
  }

  function validarDados() {
    if (!nomeCliente.trim()) {
      setErro('Informe o nome do cliente.')
      return false
    }
    if (!organizacaoId) {
      setErro('Selecione a organização.')
      return false
    }
    setErro(undefined)
    return true
  }

  function revisarProjeto() {
    if (!validarDados()) return
    setEtapa(3)
  }

  async function enviarFormulario(evento: FormEvent) {
    evento.preventDefault()
    if (etapa === 2) {
      revisarProjeto()
      return
    }
    if (etapa !== 3 || !validarDados()) return

    setEnviando(true)
    try {
      const projeto = await createProject({
        clientName: nomeCliente.trim(),
        organizationId: organizacaoId,
        platform: plataforma,
        type: tipo,
        product: produto,
        goLiveDate: dataGoLive ? new Date(dataGoLive).toISOString() : undefined,
      })
      notify(`Projeto ${projeto.code} criado com ${projeto.phases.length} etapas.`)
      resetarFluxo()
      onCreated(projeto)
    } catch (erroDaCriacao) {
      setErro(mensagemDoErro(erroDaCriacao, 'Não foi possível criar o projeto. Tente novamente.'))
    } finally {
      setEnviando(false)
    }
  }

  function voltar() {
    setErro(undefined)
    setEtapa((etapaAtual) => Math.max(1, etapaAtual - 1) as EtapaFluxo)
  }

  function resetarFluxo() {
    setEtapa(1)
    setOrigem('guiado')
    setArquivoPdf(undefined)
    setErroPdf(undefined)
    setNomeCliente('')
    setOrganizacaoId('')
    setPlataforma('vtex')
    setTipo('implantacao')
    setProduto('ecommerce')
    setDataGoLive('')
    setErro(undefined)
    setCriandoOrganizacao(false)
    setNomeOrganizacao('')
    setSegmentoOrganizacao('')
  }

  function fecharFluxo() {
    resetarFluxo()
    onClose()
  }

  const rodape = (
    <>
      {etapa === 1 ? (
        <Button variant="secondary" type="button" onClick={fecharFluxo}>
          Cancelar
        </Button>
      ) : (
        <Button variant="secondary" type="button" onClick={voltar} disabled={enviando}>
          <ArrowLeft className="size-4" />
          Voltar
        </Button>
      )}

      {etapa === 1 && (
        <Button
          type="button"
          onClick={() => setEtapa(2)}
          disabled={origem === 'pdf' && !arquivoPdf}
        >
          {origem === 'pdf' ? 'Continuar preenchendo' : 'Começar cadastro'}
          <ArrowRight className="size-4" />
        </Button>
      )}
      {etapa === 2 && (
        <Button type="submit" form="new-project-form">
          Revisar projeto
          <ArrowRight className="size-4" />
        </Button>
      )}
      {etapa === 3 && (
        <Button type="submit" form="new-project-form" disabled={enviando}>
          {enviando ? 'Criando projeto…' : 'Criar projeto'}
        </Button>
      )}
    </>
  )

  return (
    <Modal
      open={open}
      onClose={fecharFluxo}
      title="Novo projeto"
      subtitle="Defina a origem, confirme os dados e revise as etapas antes de criar."
      size="xl"
      footer={rodape}
    >
      <div className="mx-auto max-w-5xl">
        <nav aria-label="Etapas da criação do projeto" className="mb-7">
          <ol className="grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {ETAPAS_FLUXO.map((item) => {
              const concluida = item.numero < etapa
              const atual = item.numero === etapa
              return (
                <li
                  key={item.numero}
                  aria-current={atual ? 'step' : undefined}
                  className={`flex min-w-0 items-center gap-2 border-r border-slate-200 px-3 py-3 last:border-r-0 sm:px-4 ${
                    atual ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      concluida
                        ? 'bg-emerald-100 text-emerald-700'
                        : atual
                          ? 'bg-brand-100 text-brand-700'
                          : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {concluida ? <Check className="size-3.5" /> : item.numero}
                  </span>
                  <span className="truncate text-xs font-medium sm:text-sm">{item.rotulo}</span>
                </li>
              )
            })}
          </ol>
        </nav>

        <form id="new-project-form" onSubmit={enviarFormulario}>
          {etapa === 1 && (
            <section aria-labelledby="titulo-origem">
              <div className="mb-5">
                <p className="text-xs font-semibold tracking-wider text-brand-600 uppercase">Primeiro passo</p>
                <h3 id="titulo-origem" className="mt-1 text-xl font-semibold text-slate-900">
                  Como este projeto deve começar?
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Você pode preencher os dados agora ou preparar um briefing para a futura automação.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setOrigem('guiado')}
                  aria-pressed={origem === 'guiado'}
                  className={`group rounded-2xl border p-5 text-left transition-all focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none ${
                    origem === 'guiado'
                      ? 'border-brand-300 bg-brand-50/60 shadow-sm shadow-brand-900/5'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                      <ListChecks className="size-5" />
                    </span>
                    <span
                      className={`flex size-5 items-center justify-center rounded-full border ${
                        origem === 'guiado'
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-slate-300 text-transparent'
                      }`}
                    >
                      <Check className="size-3" />
                    </span>
                  </div>
                  <h4 className="mt-4 font-semibold text-slate-900">Cadastro guiado</h4>
                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    Informe cliente, organização e produto. O sistema monta as etapas a partir do template escolhido.
                  </p>
                  <span className="mt-4 inline-flex rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                    Disponível agora
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setOrigem('pdf')}
                  aria-pressed={origem === 'pdf'}
                  className={`group rounded-2xl border p-5 text-left transition-all focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none ${
                    origem === 'pdf'
                      ? 'border-brand-300 bg-brand-50/60 shadow-sm shadow-brand-900/5'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                      <Sparkles className="size-5" />
                    </span>
                    <span
                      className={`flex size-5 items-center justify-center rounded-full border ${
                        origem === 'pdf'
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-slate-300 text-transparent'
                      }`}
                    >
                      <Check className="size-3" />
                    </span>
                  </div>
                  <h4 className="mt-4 font-semibold text-slate-900">Importar briefing em PDF</h4>
                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    Prepare o documento que futuramente será lido pela IA para sugerir dados, escopo e etapas.
                  </p>
                  <span className="mt-4 inline-flex rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                    Automação em preparação
                  </span>
                </button>
              </div>

              {origem === 'pdf' && (
                <div className="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.85fr)] lg:p-5">
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">Briefing do projeto</h4>
                        <p className="mt-0.5 text-xs text-slate-500">Somente PDF, com até 8 MB.</p>
                      </div>
                      {arquivoPdf && (
                        <button
                          type="button"
                          onClick={() => {
                            setArquivoPdf(undefined)
                            setErroPdf(undefined)
                          }}
                          className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
                          aria-label="Remover PDF selecionado"
                        >
                          <X className="size-4" />
                        </button>
                      )}
                    </div>

                    <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/30 focus-within:ring-2 focus-within:ring-brand-500">
                      <input
                        key={arquivoPdf ? `${arquivoPdf.name}-${arquivoPdf.lastModified}` : 'sem-pdf'}
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={selecionarPdf}
                        className="sr-only"
                      />
                      {arquivoPdf ? (
                        <>
                          <FileText className="size-7 text-brand-600" />
                          <span className="mt-2 max-w-full truncate text-sm font-medium text-slate-800">
                            {arquivoPdf.name}
                          </span>
                          <span className="mt-1 text-xs text-slate-500">
                            {formatarTamanho(arquivoPdf.size)} · Clique para substituir
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload className="size-7 text-slate-400" />
                          <span className="mt-2 text-sm font-medium text-slate-700">Selecionar briefing em PDF</span>
                          <span className="mt-1 text-xs text-slate-500">O arquivo permanece somente neste navegador.</span>
                        </>
                      )}
                    </label>
                    {erroPdf && <p className="mt-2 text-sm text-red-600">{erroPdf}</p>}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Sparkles className="size-4 text-violet-600" />
                      Como funcionará a automação
                    </div>
                    <ol className="mt-3 space-y-2.5">
                      {[
                        ['1', 'Extração', 'Leitura segura do texto do briefing.'],
                        ['2', 'Análise com IA', 'Sugestão de dados, produto e etapas.'],
                        ['3', 'Revisão humana', 'Confirmação antes de criar o projeto.'],
                      ].map(([numero, titulo, descricao]) => (
                        <li key={numero} className="flex gap-3">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                            {numero}
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-slate-800">{titulo}</p>
                            <p className="mt-0.5 text-xs leading-4 text-slate-500">{descricao}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <Button type="button" size="sm" className="w-full" disabled>
                        <Sparkles className="size-3.5" />
                        Analisar e preencher com IA
                      </Button>
                      <p className="mt-2 text-center text-[11px] leading-4 text-slate-500">
                        A integração de IA ainda precisa ser conectada. O PDF fica selecionado apenas durante este cadastro.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {etapa === 2 && (
            <section aria-labelledby="titulo-dados">
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-semibold tracking-wider text-brand-600 uppercase">Configuração</p>
                  <h3 id="titulo-dados" className="mt-1 text-xl font-semibold text-slate-900">
                    Dados essenciais do projeto
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Essas informações definem o template inicial e podem ser ajustadas depois.
                  </p>
                </div>
                {origem === 'pdf' && arquivoPdf && (
                  <span className="inline-flex max-w-full items-center gap-2 self-start rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 ring-1 ring-violet-200">
                    <FileText className="size-3.5" />
                    <span className="truncate">{arquivoPdf.name}</span>
                  </span>
                )}
              </div>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="grid content-start grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Campo label="Nome do cliente">
                      <input
                        value={nomeCliente}
                        onChange={(evento) => setNomeCliente(evento.target.value)}
                        placeholder="Ex.: Loja Vivara"
                        autoFocus
                        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                      />
                    </Campo>
                  </div>

                  <div className="sm:col-span-2">
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-700">Organização</span>
                      <button
                        type="button"
                        onClick={() => setCriandoOrganizacao((valor) => !valor)}
                        className="inline-flex min-h-8 items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
                      >
                        {criandoOrganizacao ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
                        {criandoOrganizacao ? 'Cancelar cadastro' : 'Nova organização'}
                      </button>
                    </div>
                    {criandoOrganizacao ? (
                      <div className="grid gap-2 rounded-xl border border-brand-200 bg-brand-50/40 p-3 sm:grid-cols-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-brand-700 sm:col-span-2">
                          <Building2 className="size-4" /> Cadastrar organização sem sair do projeto
                        </div>
                        <input
                          value={nomeOrganizacao}
                          onChange={(evento) => setNomeOrganizacao(evento.target.value)}
                          placeholder="Nome da organização"
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                        />
                        <input
                          value={segmentoOrganizacao}
                          onChange={(evento) => setSegmentoOrganizacao(evento.target.value)}
                          placeholder="Segmento (opcional)"
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                        />
                        <div className="sm:col-span-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={cadastrarOrganizacao}
                            disabled={salvandoOrganizacao || !nomeOrganizacao.trim()}
                          >
                            {salvandoOrganizacao ? 'Cadastrando…' : 'Cadastrar e selecionar'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Select
                        options={opcoesOrganizacao}
                        placeholder="Selecione a organização…"
                        value={organizacaoId}
                        onChange={(evento) => setOrganizacaoId(evento.target.value)}
                      />
                    )}
                  </div>

                  <Campo label="Produto">
                    <Select
                      options={OPCOES_PRODUTO}
                      value={produto}
                      onChange={(evento) => setProduto(evento.target.value as Product)}
                    />
                  </Campo>
                  <Campo label="Plataforma">
                    <Select
                      options={OPCOES_PLATAFORMA}
                      value={plataforma}
                      onChange={(evento) => setPlataforma(evento.target.value as Platform)}
                    />
                  </Campo>
                  <Campo label="Tipo de engajamento">
                    <Select
                      options={OPCOES_TIPO}
                      value={tipo}
                      onChange={(evento) => setTipo(evento.target.value as ProjectType)}
                    />
                  </Campo>
                  <Campo label="Go live previsto">
                    <input
                      type="date"
                      value={dataGoLive}
                      onChange={(evento) => setDataGoLive(evento.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                    />
                  </Campo>

                  <p className="text-xs leading-5 text-slate-500 sm:col-span-2">
                    <span className="font-medium text-slate-700">{PRODUCT_META[produto].label}:</span>{' '}
                    {PRODUCT_META[produto].description}
                  </p>
                </div>

                <aside className="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:sticky lg:top-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <ListChecks className="size-4 text-brand-600" />
                        Template inicial
                      </div>
                      <p className="mt-1 text-xs leading-4 text-slate-500">
                        {etapasDoTemplate.length} etapas serão geradas automaticamente.
                      </p>
                    </div>
                    <span className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-brand-700 ring-1 ring-slate-200">
                      {etapasDoTemplate.length}
                    </span>
                  </div>
                  <ol className="mt-4 max-h-72 space-y-1.5 overflow-y-auto pr-1">
                    {etapasDoTemplate.map((fase, indice) => (
                      <li
                        key={fase.name}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600"
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-semibold text-slate-500">
                          {indice + 1}
                        </span>
                        <span className="min-w-0 truncate">{fase.name}</span>
                      </li>
                    ))}
                  </ol>
                </aside>
              </div>
            </section>
          )}

          {etapa === 3 && (
            <section aria-labelledby="titulo-revisao">
              <div className="mb-5">
                <p className="text-xs font-semibold tracking-wider text-brand-600 uppercase">Antes de criar</p>
                <h3 id="titulo-revisao" className="mt-1 text-xl font-semibold text-slate-900">
                  Revise a configuração inicial
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  O projeto será criado somente depois da sua confirmação.
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                    <h4 className="text-sm font-semibold text-slate-900">Resumo do projeto</h4>
                  </div>
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-5 p-5 sm:grid-cols-2">
                    {[
                      ['Cliente', nomeCliente],
                      ['Organização', nomeOrganizacaoSelecionada],
                      ['Produto', PRODUCT_META[produto].label],
                      ['Plataforma', PLATFORM_META[plataforma].label],
                      ['Engajamento', TYPE_META[tipo].label],
                      [
                        'Go live previsto',
                        dataGoLive
                          ? new Intl.DateTimeFormat('pt-BR').format(new Date(`${dataGoLive}T12:00:00`))
                          : 'Não informado',
                      ],
                    ].map(([rotulo, valor]) => (
                      <div key={rotulo}>
                        <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{rotulo}</dt>
                        <dd className="mt-1 text-sm font-medium text-slate-900">{valor}</dd>
                      </div>
                    ))}
                  </dl>

                  {origem === 'pdf' && arquivoPdf && (
                    <div className="mx-5 mb-5 rounded-xl border border-violet-200 bg-violet-50 p-3">
                      <div className="flex items-start gap-3">
                        <FileText className="mt-0.5 size-4 shrink-0 text-violet-700" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-violet-900">{arquivoPdf.name}</p>
                          <p className="mt-0.5 text-xs leading-4 text-violet-700">
                            PDF selecionado como referência. Ele não será enviado nem analisado nesta versão.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <aside className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <ListChecks className="size-5" />
                  </div>
                  <h4 className="mt-4 font-semibold text-slate-900">O que será criado</h4>
                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    Um projeto de {PRODUCT_META[produto].label.toLocaleLowerCase('pt-BR')} com{' '}
                    <strong className="font-semibold text-slate-900">{etapasDoTemplate.length} etapas</strong> e seus
                    checklists iniciais.
                  </p>
                  <div className="mt-4 rounded-xl bg-white/80 p-3 ring-1 ring-emerald-200">
                    <p className="text-xs font-medium text-emerald-800">
                      Depois da criação, a equipe pode editar nomes, responsáveis e itens sem alterar o template
                      original.
                    </p>
                  </div>
                </aside>
              </div>

              {erro && (
                <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {erro}
                </div>
              )}
            </section>
          )}

          {etapa === 2 && erro && (
            <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {erro}
            </div>
          )}
        </form>
      </div>
    </Modal>
  )
}
