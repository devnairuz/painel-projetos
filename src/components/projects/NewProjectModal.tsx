import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Braces,
  Building2,
  Check,
  CheckCircle2,
  FileSearch,
  FileText,
  GitCompareArrows,
  Info,
  Layers3,
  Link2,
  ListChecks,
  LoaderCircle,
  Plus,
  Sparkles,
  Upload,
} from 'lucide-react'
import type {
  FonteImportacaoProjeto,
  ImportacaoProjeto,
  Platform,
  Product,
  Project,
  ProjectType,
  RascunhoImportacaoProjeto,
  StatusIntegracaoNaira,
} from '@/types'
import type { TipoDocumentoImportacao } from '@/types/importacaoProjeto'
import { PLATFORM_META, TYPE_META } from '@/constants'
import { PRODUCT_META, PRODUCT_TEMPLATES } from '@/constants/templates'
import { useOrganizations } from '@/hooks/useProjects'
import { useToast } from '@/components/ui/Toast'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { NairaImportPanel } from '@/components/projects/NairaImportPanel'
import { createOrganization, createProject } from '@/services/projectsService'
import {
  atualizarRascunhoImportacao,
  cancelarImportacao,
  confirmarImportacao,
  criarImportacaoJson,
  criarImportacaoProjeto,
  enviarPdfImportacao,
  gerarChaveIdempotencia,
  listarImportacoesProjeto,
  obterImportacaoProjeto,
  obterProjetoCriadoImportacao,
  obterStatusIntegracaoNaira,
  tentarNovamenteImportacao,
} from '@/services/importacoesProjetoService'

interface NewProjectModalProps {
  open: boolean
  onClose: () => void
  onCreated: (project: Project) => void
}

type EtapaFluxo = 1 | 2 | 3
type OrigemCadastro = 'guiado' | 'pdf' | 'json'

const TAMANHO_MAXIMO_PADRAO = 8 * 1024 * 1024
const TAMANHO_MAXIMO_JSON_PADRAO = 1024 * 1024
const STATUS_COM_POLLING = new Set<ImportacaoProjeto['status']>([
  'na_fila',
  'enviando_naira',
  'processando_naira',
  'criando_projeto',
])
const ETAPAS_FLUXO = [
  { numero: 1 as const, rotulo: 'Origem' },
  { numero: 2 as const, rotulo: 'Dados e validação' },
  { numero: 3 as const, rotulo: 'Revisão' },
]

const OPCOES_PLATAFORMA = Object.entries(PLATFORM_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}))
const OPCOES_TIPO = Object.entries(TYPE_META).map(([value, meta]) => ({ value, label: meta.label }))
const OPCOES_PRODUTO = Object.entries(PRODUCT_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}))

function Campo({ label, children, dica }: { label: string; children: ReactNode; dica?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-2 text-sm font-medium text-slate-700">
        {label}
        {dica && <span className="text-xs font-normal text-slate-400">{dica}</span>}
      </span>
      {children}
    </label>
  )
}

function mensagemDoErro(erro: unknown, alternativa: string) {
  return erro instanceof Error && erro.message ? erro.message : alternativa
}

function clonarRascunho(rascunho: RascunhoImportacaoProjeto): RascunhoImportacaoProjeto {
  return JSON.parse(JSON.stringify(rascunho)) as RascunhoImportacaoProjeto
}

function dataParaInput(valor?: string) {
  if (!valor) return ''
  const data = new Date(valor)
  if (Number.isNaN(data.valueOf())) return valor.slice(0, 10)
  return data.toISOString().slice(0, 10)
}

function confiancaComoPercentual(valor?: number) {
  if (valor === undefined || !Number.isFinite(valor)) return undefined
  return Math.round(valor <= 1 ? valor * 100 : valor)
}

function resumoValor(valor: unknown) {
  if (valor === null || valor === undefined || valor === '') return 'Não identificado'
  if (typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean') {
    return String(valor)
  }
  return 'Dado estruturado'
}

function interpretarConteudoJson(
  conteudo: string,
  tamanhoMaximo = TAMANHO_MAXIMO_JSON_PADRAO,
): Record<string, unknown> {
  const texto = conteudo.trim()
  if (!texto) throw new Error('Cole um JSON ou selecione um arquivo .json para continuar.')
  if (new Blob([texto]).size > tamanhoMaximo) {
    throw new Error(`O conteúdo JSON deve ter no máximo ${Math.ceil(tamanhoMaximo / 1024 / 1024)} MB.`)
  }

  let resultado: unknown
  try {
    resultado = JSON.parse(texto) as unknown
  } catch (erroDaLeitura) {
    const mensagem = erroDaLeitura instanceof Error ? erroDaLeitura.message : ''
    const posicao = Number(mensagem.match(/position\s+(\d+)/i)?.[1])
    if (Number.isInteger(posicao)) {
      const anterior = texto.slice(0, posicao)
      const linha = anterior.split('\n').length
      const coluna = posicao - anterior.lastIndexOf('\n')
      throw new Error(`JSON inválido próximo da linha ${linha}, coluna ${coluna}. Revise vírgulas, aspas e chaves.`)
    }
    throw new Error('JSON inválido. Revise vírgulas, aspas, chaves e valores antes de enviar.')
  }

  if (!resultado || typeof resultado !== 'object' || Array.isArray(resultado)) {
    throw new Error('O conteúdo precisa ter um objeto JSON na raiz, entre chaves { }.')
  }
  return resultado as Record<string, unknown>
}

export function NewProjectModal({ open, onClose, onCreated }: NewProjectModalProps) {
  const { data: organizacoes } = useOrganizations()
  const { notify } = useToast()

  const [etapa, setEtapa] = useState<EtapaFluxo>(1)
  const [origem, setOrigem] = useState<OrigemCadastro>('guiado')
  const [documentosPdf, setDocumentosPdf] = useState<
    Partial<Record<TipoDocumentoImportacao, File>>
  >({})
  const [errosDocumentosPdf, setErrosDocumentosPdf] = useState<
    Partial<Record<TipoDocumentoImportacao, string>>
  >({})
  const [erroPdf, setErroPdf] = useState<string>()
  const [conteudoJson, setConteudoJson] = useState('')
  const [erroJson, setErroJson] = useState<string>()
  const [nomeArquivoJson, setNomeArquivoJson] = useState<string>()
  const [integracao, setIntegracao] = useState<StatusIntegracaoNaira>()
  const [carregandoIntegracao, setCarregandoIntegracao] = useState(false)
  const [erroIntegracao, setErroIntegracao] = useState<string>()
  const [importacao, setImportacao] = useState<ImportacaoProjeto>()
  const [importacoesRecentes, setImportacoesRecentes] = useState<ImportacaoProjeto[]>([])
  const [carregandoRecentes, setCarregandoRecentes] = useState(false)
  const [executandoAutomacao, setExecutandoAutomacao] = useState(false)
  const [rascunhoNaira, setRascunhoNaira] = useState<RascunhoImportacaoProjeto>()
  const [usarFasesSugeridas, setUsarFasesSugeridas] = useState(true)
  const rascunhoAplicadoRef = useRef('')
  const aguardandoProjetoRef = useRef(false)
  const chaveCriacaoImportacaoRef = useRef('')
  const chaveImportacaoJsonRef = useRef('')
  const chaveConfirmacaoRef = useRef<{ importacaoId: string; chave: string } | undefined>(undefined)
  const importacoesCanceladasRef = useRef<Set<string>>(new Set())

  const [nomeCliente, setNomeCliente] = useState('')
  const [organizacaoId, setOrganizacaoId] = useState('')
  const [organizacaoCriada, setOrganizacaoCriada] = useState<{ id: string; name: string }>()
  const [plataforma, setPlataforma] = useState<Platform>('vtex')
  const [tipo, setTipo] = useState<ProjectType>('implantacao')
  const [produto, setProduto] = useState<Product>('ecommerce')
  const [dataGoLive, setDataGoLive] = useState('')
  const [horasEstimadas, setHorasEstimadas] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string>()

  const [criandoOrganizacao, setCriandoOrganizacao] = useState(false)
  const [nomeOrganizacao, setNomeOrganizacao] = useState('')
  const [segmentoOrganizacao, setSegmentoOrganizacao] = useState('')
  const [salvandoOrganizacao, setSalvandoOrganizacao] = useState(false)

  const opcoesOrganizacao = useMemo(() => {
    const opcoes = (organizacoes ?? []).map((organizacao) => ({
      value: organizacao.id,
      label: organizacao.name,
    }))
    if (organizacaoCriada && !opcoes.some((item) => item.value === organizacaoCriada.id)) {
      opcoes.push({ value: organizacaoCriada.id, label: organizacaoCriada.name })
    }
    return opcoes
  }, [organizacoes, organizacaoCriada])
  const nomeOrganizacaoSelecionada =
    opcoesOrganizacao.find((organizacao) => organizacao.value === organizacaoId)?.label ?? '—'
  const etapasDoTemplate = PRODUCT_TEMPLATES[produto]
  const fasesNaira = rascunhoNaira?.fases ?? []
  const quantidadeItensNaira = fasesNaira.reduce((total, fase) => total + fase.checklist.length, 0)
  const linksSugeridos = rascunhoNaira?.linksUteis ?? []
  const pendenciasSugeridas = rascunhoNaira?.pendencias ?? []
  const linksRevisados = linksSugeridos.filter((item) => item.revisado).length
  const pendenciasRevisadas = pendenciasSugeridas.filter((item) => item.revisado).length
  const bloqueios = importacao?.validacao?.bloqueios ?? []
  const avisos = importacao?.validacao?.avisos ?? []
  const origemAutomatizada = origem !== 'guiado'
  const temEscopoImportacao = Boolean(
    importacao?.documentos?.some((documento) => documento.tipo === 'escopo') ||
      importacao?.fontes?.some((fonte) => fonte.tipoDocumento === 'escopo'),
  )
  const tamanhoMaximoJson = integracao?.tamanhoMaximoJsonBytes ?? TAMANHO_MAXIMO_JSON_PADRAO

  useEffect(() => {
    if (!open) return
    let ativo = true
    setCarregandoIntegracao(true)
    setCarregandoRecentes(true)
    setErroIntegracao(undefined)
    void Promise.allSettled([obterStatusIntegracaoNaira(), listarImportacoesProjeto()]).then(
      ([resultadoIntegracao, resultadoImportacoes]) => {
        if (!ativo) return
        if (resultadoIntegracao.status === 'fulfilled') {
          setIntegracao(resultadoIntegracao.value)
        } else {
          setErroIntegracao(
            mensagemDoErro(resultadoIntegracao.reason, 'Não foi possível verificar a integração com a Naira.'),
          )
        }
        if (resultadoImportacoes.status === 'fulfilled') {
          setImportacoesRecentes(resultadoImportacoes.value)
        }
        setCarregandoIntegracao(false)
        setCarregandoRecentes(false)
      },
    )
    return () => {
      ativo = false
    }
  }, [open])

  useEffect(() => {
    if (!importacao || !STATUS_COM_POLLING.has(importacao.status)) return
    let ativo = true
    const consultar = async () => {
      try {
        const atualizada = await obterImportacaoProjeto(importacao.id)
        if (!ativo || importacoesCanceladasRef.current.has(atualizada.id)) return
        setImportacao(atualizada)
        setImportacoesRecentes((atuais) => [
          atualizada,
          ...atuais.filter((item) => item.id !== atualizada.id),
        ])
      } catch {
        // A próxima consulta tenta novamente; um erro transitório não muda o estado persistido.
      }
    }
    const intervalo = window.setInterval(consultar, 2500)
    return () => {
      ativo = false
      window.clearInterval(intervalo)
    }
  }, [importacao?.id, importacao?.status])

  useEffect(() => {
    if (!importacao?.rascunho || importacao.status !== 'aguardando_revisao') return
    const chaveAplicacao = `${importacao.id}:${importacao.versao}`
    if (rascunhoAplicadoRef.current === chaveAplicacao) return
    const proximoRascunho = clonarRascunho(importacao.rascunho)
    proximoRascunho.linksUteis = proximoRascunho.linksUteis?.map((link) => ({
      ...link,
      visivelCliente: false,
    }))
    setRascunhoNaira(proximoRascunho)
    setNomeCliente(proximoRascunho.cliente.nome ?? '')
    setNomeOrganizacao(proximoRascunho.cliente.nomeOrganizacaoSugerida ?? '')
    setSegmentoOrganizacao(proximoRascunho.cliente.segmento ?? '')
    if (proximoRascunho.projeto.plataforma && proximoRascunho.projeto.plataforma in PLATFORM_META) {
      setPlataforma(proximoRascunho.projeto.plataforma)
    }
    if (proximoRascunho.projeto.tipo && proximoRascunho.projeto.tipo in TYPE_META) {
      setTipo(proximoRascunho.projeto.tipo)
    }
    if (proximoRascunho.projeto.produto && proximoRascunho.projeto.produto in PRODUCT_META) {
      setProduto(proximoRascunho.projeto.produto)
    }
    setDataGoLive(
      temEscopoImportacao ? dataParaInput(proximoRascunho.projeto.dataGoLive) : '',
    )
    setHorasEstimadas(
      temEscopoImportacao && typeof proximoRascunho.projeto.horasEstimadas === 'number'
        ? String(proximoRascunho.projeto.horasEstimadas)
        : '',
    )
    setUsarFasesSugeridas(proximoRascunho.fases.length > 0)
    setEtapa(2)
    rascunhoAplicadoRef.current = chaveAplicacao
  }, [importacao, temEscopoImportacao])

  useEffect(() => {
    if (
      !importacao ||
      importacao.status !== 'concluida' ||
      !importacao.projetoId ||
      !aguardandoProjetoRef.current
    ) {
      return
    }
    aguardandoProjetoRef.current = false
    setEnviando(true)
    void obterProjetoCriadoImportacao(importacao.projetoId)
      .then((projeto) => concluirCriacao(projeto))
      .catch((erroDaBusca) => {
        setErro(mensagemDoErro(erroDaBusca, 'O projeto foi criado, mas não foi possível abri-lo.'))
      })
      .finally(() => setEnviando(false))
  }, [importacao])

  async function atualizarAutomacao() {
    setCarregandoRecentes(true)
    try {
      const [status, recentes] = await Promise.all([
        obterStatusIntegracaoNaira(),
        listarImportacoesProjeto(),
      ])
      setIntegracao(status)
      setImportacoesRecentes(recentes)
      if (importacao) {
        const atualizada = await obterImportacaoProjeto(importacao.id)
        if (!importacoesCanceladasRef.current.has(atualizada.id)) setImportacao(atualizada)
      }
      setErroIntegracao(undefined)
    } catch (erroDaAtualizacao) {
      setErroIntegracao(
        mensagemDoErro(erroDaAtualizacao, 'Não foi possível atualizar o estado da automação.'),
      )
    } finally {
      setCarregandoRecentes(false)
    }
  }

  async function cadastrarOrganizacao() {
    if (!nomeOrganizacao.trim()) return
    setSalvandoOrganizacao(true)
    setErro(undefined)
    try {
      const organizacao = await createOrganization({
        name: nomeOrganizacao.trim(),
        segment: segmentoOrganizacao.trim(),
      })
      setOrganizacaoCriada({ id: organizacao.id, name: organizacao.name })
      setOrganizacaoId(organizacao.id)
      setCriandoOrganizacao(false)
      notify(`Organização "${organizacao.name}" cadastrada.`)
    } catch (erroDaOrganizacao) {
      setErro(mensagemDoErro(erroDaOrganizacao, 'Não foi possível cadastrar a organização.'))
    } finally {
      setSalvandoOrganizacao(false)
    }
  }

  function selecionarPdf(
    tipoDocumento: TipoDocumentoImportacao,
    evento: ChangeEvent<HTMLInputElement>,
  ) {
    const arquivo = evento.target.files?.[0]
    setErroPdf(undefined)
    setErrosDocumentosPdf((atuais) => ({ ...atuais, [tipoDocumento]: undefined }))
    if (!arquivo) {
      return
    }
    const nomeValido = arquivo.name.toLocaleLowerCase('pt-BR').endsWith('.pdf')
    const tipoValido = !arquivo.type || arquivo.type === 'application/pdf'
    if (!nomeValido || !tipoValido) {
      chaveCriacaoImportacaoRef.current = ''
      setDocumentosPdf((atuais) => ({ ...atuais, [tipoDocumento]: undefined }))
      setErrosDocumentosPdf((atuais) => ({
        ...atuais,
        [tipoDocumento]: `Selecione o ${tipoDocumento === 'briefing' ? 'Briefing' : 'Escopo'} no formato PDF.`,
      }))
      evento.target.value = ''
      return
    }
    const limite = integracao?.tamanhoMaximoPdfBytes ?? TAMANHO_MAXIMO_PADRAO
    if (!arquivo.size) {
      chaveCriacaoImportacaoRef.current = ''
      setDocumentosPdf((atuais) => ({ ...atuais, [tipoDocumento]: undefined }))
      setErrosDocumentosPdf((atuais) => ({
        ...atuais,
        [tipoDocumento]: 'O PDF selecionado está vazio.',
      }))
      evento.target.value = ''
      return
    }
    if (arquivo.size > limite) {
      chaveCriacaoImportacaoRef.current = ''
      setDocumentosPdf((atuais) => ({ ...atuais, [tipoDocumento]: undefined }))
      setErrosDocumentosPdf((atuais) => ({
        ...atuais,
        [tipoDocumento]: `O PDF ultrapassa o limite de ${Math.round(limite / 1024 / 1024)} MB deste ambiente.`,
      }))
      evento.target.value = ''
      return
    }
    setDocumentosPdf((atuais) => ({ ...atuais, [tipoDocumento]: arquivo }))
    chaveCriacaoImportacaoRef.current = gerarChaveIdempotencia('criar-importacao')
  }

  function removerPdf(tipoDocumento: TipoDocumentoImportacao) {
    setDocumentosPdf((atuais) => ({ ...atuais, [tipoDocumento]: undefined }))
    setErrosDocumentosPdf((atuais) => ({ ...atuais, [tipoDocumento]: undefined }))
    setErroPdf(undefined)
    chaveCriacaoImportacaoRef.current = ''
  }

  function alterarConteudoJson(valor: string) {
    setConteudoJson(valor)
    setErroJson(undefined)
    setNomeArquivoJson(undefined)
    chaveImportacaoJsonRef.current = ''
  }

  async function selecionarArquivoJson(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    setErroJson(undefined)
    if (!arquivo) return

    if (!arquivo.name.toLocaleLowerCase('pt-BR').endsWith('.json')) {
      setErroJson('Selecione um arquivo com extensão .json.')
      evento.target.value = ''
      return
    }
    if (!arquivo.size) {
      setErroJson('O arquivo JSON está vazio.')
      evento.target.value = ''
      return
    }
    if (arquivo.size > tamanhoMaximoJson) {
      setErroJson(`O arquivo JSON deve ter no máximo ${Math.ceil(tamanhoMaximoJson / 1024 / 1024)} MB.`)
      evento.target.value = ''
      return
    }

    try {
      const conteudo = await arquivo.text()
      interpretarConteudoJson(conteudo, tamanhoMaximoJson)
      setConteudoJson(conteudo)
      setNomeArquivoJson(arquivo.name)
      chaveImportacaoJsonRef.current = gerarChaveIdempotencia('criar-importacao-json')
    } catch (erroDaLeitura) {
      setErroJson(mensagemDoErro(erroDaLeitura, 'Não foi possível ler o arquivo JSON.'))
      evento.target.value = ''
    }
  }

  function formatarConteudoJson() {
    try {
      const resultado = interpretarConteudoJson(conteudoJson, tamanhoMaximoJson)
      setConteudoJson(JSON.stringify(resultado, null, 2))
      setErroJson(undefined)
    } catch (erroDaFormatacao) {
      setErroJson(mensagemDoErro(erroDaFormatacao, 'Não foi possível formatar o JSON.'))
    }
  }

  async function iniciarImportacaoJson() {
    setExecutandoAutomacao(true)
    setErroJson(undefined)
    try {
      const resultado = interpretarConteudoJson(conteudoJson, tamanhoMaximoJson)
      const chave =
        chaveImportacaoJsonRef.current || gerarChaveIdempotencia('criar-importacao-json')
      chaveImportacaoJsonRef.current = chave
      const criada = await criarImportacaoJson(
        resultado,
        chave,
        nomeArquivoJson,
      )
      setImportacao(criada)
      setImportacoesRecentes((atuais) => [criada, ...atuais.filter((item) => item.id !== criada.id)])
      notify('JSON validado. Revise o rascunho antes de criar o projeto.')
    } catch (erroDaImportacao) {
      setErroJson(mensagemDoErro(erroDaImportacao, 'Não foi possível importar este JSON.'))
    } finally {
      setExecutandoAutomacao(false)
    }
  }

  async function iniciarAnalise() {
    const selecionados = (['briefing', 'escopo'] as const)
      .map((tipoDocumento) => ({ tipo: tipoDocumento, arquivo: documentosPdf[tipoDocumento] }))
      .filter(
        (item): item is { tipo: TipoDocumentoImportacao; arquivo: File } => Boolean(item.arquivo),
      )
    if (!selecionados.length) return
    if (!chaveCriacaoImportacaoRef.current) {
      chaveCriacaoImportacaoRef.current = gerarChaveIdempotencia('criar-importacao')
    }
    setExecutandoAutomacao(true)
    setErroPdf(undefined)
    try {
      let atualizada =
        importacao?.status === 'aguardando_arquivo'
          ? importacao
          : await criarImportacaoProjeto(
              selecionados,
              chaveCriacaoImportacaoRef.current,
            )
      setImportacao(atualizada)

      for (const documento of selecionados) {
        const jaArmazenado = atualizada.documentos?.some(
          (item) => item.tipo === documento.tipo && item.armazenado,
        )
        if (jaArmazenado) continue
        atualizada = await enviarPdfImportacao(
          atualizada.id,
          atualizada.versao,
          documento.tipo,
          documento.arquivo,
        )
        setImportacao(atualizada)
      }

      setImportacoesRecentes((atuais) => [
        atualizada,
        ...atuais.filter((item) => item.id !== atualizada.id),
      ])
      setDocumentosPdf({})
      setErrosDocumentosPdf({})
      chaveCriacaoImportacaoRef.current = ''
      notify(
        integracao?.modo === 'mock'
          ? 'Simulação iniciada.'
          : selecionados.length === 2
            ? 'Briefing e Escopo enviados para análise da Naira.'
            : `${selecionados[0].tipo === 'briefing' ? 'Briefing' : 'Escopo'} enviado para análise da Naira.`,
      )
    } catch (erroDoEnvio) {
      setErroPdf(mensagemDoErro(erroDoEnvio, 'Não foi possível enviar os documentos para análise.'))
    } finally {
      setExecutandoAutomacao(false)
    }
  }

  async function retomarImportacao(item: ImportacaoProjeto) {
    if (item.status === 'cancelada') {
      setErro('Uma análise cancelada não pode ser retomada. Inicie uma nova importação.')
      return
    }
    setExecutandoAutomacao(true)
    setErro(undefined)
    try {
      const completa = await obterImportacaoProjeto(item.id)
      if (completa.status === 'cancelada') {
        setErro('Esta análise foi cancelada e não pode ser retomada. Inicie uma nova importação.')
        return
      }
      if (importacao?.id !== completa.id) {
        setDocumentosPdf({})
        setErrosDocumentosPdf({})
        setErroPdf(undefined)
        chaveCriacaoImportacaoRef.current = ''
        chaveConfirmacaoRef.current = undefined
      }
      setOrigem(
        completa.origem === 'json_manual' || completa.arquivo?.mimeType === 'application/json'
          ? 'json'
          : 'pdf',
      )
      setImportacao(completa)
      if (completa.status === 'aguardando_revisao') {
        rascunhoAplicadoRef.current = ''
      }
    } catch (erroDaRetomada) {
      setErro(mensagemDoErro(erroDaRetomada, 'Não foi possível retomar esta análise.'))
    } finally {
      setExecutandoAutomacao(false)
    }
  }

  async function tentarNovamente() {
    if (!importacao) return
    setExecutandoAutomacao(true)
    try {
      const atualizada = await tentarNovamenteImportacao(
        importacao.id,
        importacao.versao,
        gerarChaveIdempotencia(`repetir-${importacao.id}`),
      )
      setImportacao(atualizada)
      setErro(undefined)
    } catch (erroDaTentativa) {
      setErro(mensagemDoErro(erroDaTentativa, 'Não foi possível reiniciar a análise.'))
    } finally {
      setExecutandoAutomacao(false)
    }
  }

  async function cancelarAnalise() {
    if (!importacao) return
    setExecutandoAutomacao(true)
    try {
      const cancelada = await cancelarImportacao(
        importacao.id,
        importacao.versao,
        gerarChaveIdempotencia(`cancelar-${importacao.id}`),
      )
      importacoesCanceladasRef.current.add(importacao.id)
      setImportacoesRecentes((atuais) => [cancelada, ...atuais.filter((item) => item.id !== cancelada.id)])
      setImportacao(undefined)
      setRascunhoNaira(undefined)
      setDocumentosPdf({})
      setErrosDocumentosPdf({})
      setErroPdf(undefined)
      setErro(undefined)
      chaveCriacaoImportacaoRef.current = ''
      chaveImportacaoJsonRef.current = ''
      chaveConfirmacaoRef.current = undefined
      rascunhoAplicadoRef.current = ''
      aguardandoProjetoRef.current = false
      setEtapa(1)
    } catch (erroDoCancelamento) {
      setErro(mensagemDoErro(erroDoCancelamento, 'Não foi possível cancelar esta análise.'))
    } finally {
      setExecutandoAutomacao(false)
    }
  }

  async function abrirProjetoCriado(item: ImportacaoProjeto) {
    if (!item.projetoId) return
    setExecutandoAutomacao(true)
    try {
      const projeto = await obterProjetoCriadoImportacao(item.projetoId)
      onCreated(projeto)
    } catch (erroDaAbertura) {
      setErro(mensagemDoErro(erroDaAbertura, 'Não foi possível abrir o projeto criado.'))
    } finally {
      setExecutandoAutomacao(false)
    }
  }

  function validarDados() {
    if (!nomeCliente.trim()) {
      setErro('Informe o nome do cliente.')
      return false
    }
    if (!organizacaoId) {
      setErro('Selecione ou cadastre explicitamente a organização deste projeto.')
      return false
    }
    if (origemAutomatizada && horasEstimadas) {
      const horas = Number(horasEstimadas)
      if (!Number.isFinite(horas) || horas <= 0 || horas > 10_000) {
        setErro('Informe uma estimativa entre 0,5 e 10.000 horas ou deixe o campo vazio.')
        return false
      }
    }
    setErro(undefined)
    return true
  }

  function montarRascunhoRevisado(): RascunhoImportacaoProjeto | undefined {
    if (!rascunhoNaira) return undefined
    return {
      ...rascunhoNaira,
      cliente: { ...rascunhoNaira.cliente, nome: nomeCliente.trim() },
      projeto: {
        ...rascunhoNaira.projeto,
        plataforma,
        tipo,
        produto,
        dataGoLive: dataGoLive || undefined,
        horasEstimadas: horasEstimadas ? Number(horasEstimadas) : undefined,
      },
      linksUteis: rascunhoNaira.linksUteis?.map((link) => ({
        ...link,
        visivelCliente: false,
      })),
    }
  }

  async function revisarProjeto() {
    if (!validarDados()) return
    if (origemAutomatizada) {
      if (!importacao || importacao.status !== 'aguardando_revisao') {
        setErro('A análise ainda não está pronta para revisão.')
        return
      }
      const rascunho = montarRascunhoRevisado()
      if (!rascunho) {
        setErro('A automação não devolveu um rascunho válido.')
        return
      }
      setEnviando(true)
      try {
        const atualizada = await atualizarRascunhoImportacao(
          importacao.id,
          importacao.versao,
          rascunho,
        )
        setImportacao(atualizada)
        setRascunhoNaira(atualizada.rascunho ?? rascunho)
        rascunhoAplicadoRef.current = `${atualizada.id}:${atualizada.versao}`
      } catch (erroDaRevisao) {
        setErro(mensagemDoErro(erroDaRevisao, 'Não foi possível salvar a revisão.'))
        setEnviando(false)
        return
      }
      setEnviando(false)
    }
    setEtapa(3)
  }

  async function enviarFormulario(evento: FormEvent) {
    evento.preventDefault()
    if (etapa === 2) {
      await revisarProjeto()
      return
    }
    if (etapa !== 3 || !validarDados()) return

    setEnviando(true)
    setErro(undefined)
    try {
      if (origem === 'guiado') {
        const projeto = await createProject({
          clientName: nomeCliente.trim(),
          organizationId: organizacaoId,
          platform: plataforma,
          type: tipo,
          product: produto,
          goLiveDate: dataGoLive ? new Date(`${dataGoLive}T12:00:00`).toISOString() : undefined,
        })
        concluirCriacao(projeto)
        return
      }

      if (!importacao || importacao.status !== 'aguardando_revisao') {
        throw new Error('Esta análise não está pronta para confirmação.')
      }
      const rascunho = montarRascunhoRevisado()
      const resultado = await confirmarImportacao(
        importacao,
        {
          organizationId: organizacaoId,
          usarFasesSugeridas,
          rascunho,
        },
        (() => {
          if (chaveConfirmacaoRef.current?.importacaoId === importacao.id) {
            return chaveConfirmacaoRef.current.chave
          }
          const chave = gerarChaveIdempotencia(`confirmar-${importacao.id}`)
          chaveConfirmacaoRef.current = { importacaoId: importacao.id, chave }
          return chave
        })(),
      )
      setImportacao(resultado.importacao)
      if (resultado.projeto) {
        concluirCriacao(resultado.projeto)
        return
      }
      if (resultado.importacao.status === 'concluida' && resultado.importacao.projetoId) {
        const projeto = await obterProjetoCriadoImportacao(resultado.importacao.projetoId)
        concluirCriacao(projeto)
        return
      }
      aguardandoProjetoRef.current = true
    } catch (erroDaCriacao) {
      setErro(mensagemDoErro(erroDaCriacao, 'Não foi possível criar o projeto. Tente novamente.'))
    } finally {
      setEnviando(false)
    }
  }

  function concluirCriacao(projeto: Project) {
    notify(`Projeto ${projeto.code} criado com ${projeto.phases.length} etapas.`)
    resetarFluxo()
    onCreated(projeto)
  }

  function voltar() {
    setErro(undefined)
    setEtapa((etapaAtual) => Math.max(1, etapaAtual - 1) as EtapaFluxo)
  }

  function resetarFluxo() {
    setEtapa(1)
    setOrigem('guiado')
    setDocumentosPdf({})
    setErrosDocumentosPdf({})
    setErroPdf(undefined)
    setConteudoJson('')
    setErroJson(undefined)
    setNomeArquivoJson(undefined)
    setImportacao(undefined)
    setRascunhoNaira(undefined)
    setNomeCliente('')
    setOrganizacaoId('')
    setOrganizacaoCriada(undefined)
    setPlataforma('vtex')
    setTipo('implantacao')
    setProduto('ecommerce')
    setDataGoLive('')
    setHorasEstimadas('')
    setErro(undefined)
    setCriandoOrganizacao(false)
    setNomeOrganizacao('')
    setSegmentoOrganizacao('')
    setUsarFasesSugeridas(true)
    rascunhoAplicadoRef.current = ''
    aguardandoProjetoRef.current = false
    chaveCriacaoImportacaoRef.current = ''
    chaveImportacaoJsonRef.current = ''
    chaveConfirmacaoRef.current = undefined
  }

  function alterarRevisaoLinks(revisado: boolean) {
    setRascunhoNaira((atual) =>
      atual
        ? {
            ...atual,
            linksUteis: atual.linksUteis?.map((item) => ({
              ...item,
              revisado,
              visivelCliente: false,
            })),
          }
        : atual,
    )
  }

  function alterarRevisaoPendencias(revisado: boolean) {
    setRascunhoNaira((atual) =>
      atual
        ? {
            ...atual,
            pendencias: atual.pendencias?.map((item) => ({ ...item, revisado })),
          }
        : atual,
    )
  }

  const processando = Boolean(importacao && STATUS_COM_POLLING.has(importacao.status))
  const rodape = (
    <>
      {etapa === 1 ? (
        <Button variant="secondary" type="button" onClick={onClose}>
          Fechar
        </Button>
      ) : (
        <Button variant="secondary" type="button" onClick={voltar} disabled={enviando}>
          <ArrowLeft className="size-4" /> Voltar
        </Button>
      )}

      {etapa === 1 && origem === 'guiado' && (
        <Button type="button" onClick={() => setEtapa(2)}>
          Começar cadastro <ArrowRight className="size-4" />
        </Button>
      )}
      {etapa === 1 && origemAutomatizada && importacao?.status === 'aguardando_revisao' && (
        <Button type="button" onClick={() => setEtapa(2)}>
          Revisar análise <ArrowRight className="size-4" />
        </Button>
      )}
      {etapa === 1 && origemAutomatizada && processando && (
        <Button type="button" variant="secondary" onClick={onClose}>
          Acompanhar depois
        </Button>
      )}
      {etapa === 2 && (
        <Button type="submit" form="new-project-form" disabled={enviando}>
          {enviando ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {enviando ? 'Salvando revisão…' : 'Revisar projeto'}
          {!enviando && <ArrowRight className="size-4" />}
        </Button>
      )}
      {etapa === 3 && (
        <Button type="submit" form="new-project-form" disabled={enviando || bloqueios.length > 0}>
          {enviando ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {enviando ? 'Criando projeto…' : origemAutomatizada ? 'Confirmar e criar' : 'Criar projeto'}
        </Button>
      )}
    </>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo projeto"
      subtitle="Cadastre manualmente ou transforme PDF e JSON em um rascunho revisável."
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
                <h3 id="titulo-origem" className="mt-1 text-xl font-semibold text-slate-900">Como este projeto deve começar?</h3>
                <p className="mt-1 text-sm text-slate-600">Escolha o fluxo. A automação sempre exige aprovação humana antes da criação.</p>
              </div>

              <div className="mb-5 grid gap-3 md:grid-cols-3">
                <BotaoOrigem
                  ativo={origem === 'guiado'}
                  onClick={() => setOrigem('guiado')}
                  icon={<ListChecks className="size-5" />}
                  titulo="Cadastro guiado"
                  descricao="Use o template do produto e informe os dados manualmente."
                  selo="Fluxo direto"
                />
                <BotaoOrigem
                  ativo={origem === 'pdf'}
                  onClick={() => setOrigem('pdf')}
                  icon={<Sparkles className="size-5" />}
                  titulo="PDFs com automação"
                  descricao="Envie Briefing, Escopo ou ambos e revise as sugestões da Naira."
                  selo="Naira + revisão humana"
                  destaque
                />
                <BotaoOrigem
                  ativo={origem === 'json'}
                  onClick={() => setOrigem('json')}
                  icon={<Braces className="size-5" />}
                  titulo="JSON estruturado"
                  descricao="Cole uma saída pronta da automação e siga pela mesma revisão humana."
                  selo="Importação manual"
                />
              </div>

              {origem === 'guiado' ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                  <div className="flex gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700"><Layers3 className="size-5" /></span>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">Estrutura baseada em template</h4>
                      <p className="mt-1 text-sm leading-5 text-slate-600">Você escolhe o produto e visualiza todas as etapas antes de criar. O checklist continua editável depois.</p>
                    </div>
                  </div>
                </div>
              ) : origem === 'pdf' ? (
                <NairaImportPanel
                  integracao={integracao}
                  carregandoIntegracao={carregandoIntegracao}
                  erroIntegracao={erroIntegracao}
                  documentos={documentosPdf}
                  errosDocumentos={errosDocumentosPdf}
                  erroEnvio={erroPdf}
                  importacao={importacao}
                  importacoesRecentes={importacoesRecentes}
                  carregandoRecentes={carregandoRecentes}
                  executando={executandoAutomacao}
                  onSelecionarArquivo={selecionarPdf}
                  onRemoverArquivo={removerPdf}
                  onIniciar={iniciarAnalise}
                  onRetomar={retomarImportacao}
                  onTentarNovamente={tentarNovamente}
                  onCancelar={cancelarAnalise}
                  onAbrirProjeto={abrirProjetoCriado}
                  onAtualizar={atualizarAutomacao}
                />
              ) : (
                <PainelImportacaoJson
                  conteudo={conteudoJson}
                  erro={erroJson}
                  nomeArquivo={nomeArquivoJson}
                  tamanhoMaximo={tamanhoMaximoJson}
                  enviando={executandoAutomacao}
                  onChange={alterarConteudoJson}
                  onSelecionarArquivo={selecionarArquivoJson}
                  onFormatar={formatarConteudoJson}
                  onImportar={iniciarImportacaoJson}
                />
              )}
            </section>
          )}

          {etapa === 2 && (
            <section aria-labelledby="titulo-dados">
              <div className="mb-5">
                <p className="text-xs font-semibold tracking-wider text-brand-600 uppercase">Dados e validação</p>
                <h3 id="titulo-dados" className="mt-1 text-xl font-semibold text-slate-900">Confirme o que será criado</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {origemAutomatizada
                    ? `Campos ${origem === 'pdf' ? 'sugeridos pela Naira' : 'recebidos no JSON'} podem ser alterados. A organização nunca é escolhida automaticamente.`
                    : 'Preencha os dados essenciais e selecione a organização responsável.'}
                </p>
              </div>

              <div className={`grid gap-5 ${origemAutomatizada ? 'lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]' : ''}`}>
                <div className="space-y-5">
                  <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Campo label="Nome do cliente">
                        <input value={nomeCliente} onChange={(evento) => setNomeCliente(evento.target.value)} placeholder="Ex.: Loja Horizonte" className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none" autoFocus />
                      </Campo>
                    </div>
                    <Campo label="Plataforma"><Select options={OPCOES_PLATAFORMA} value={plataforma} onChange={(evento) => setPlataforma(evento.target.value as Platform)} /></Campo>
                    <Campo label="Tipo de projeto"><Select options={OPCOES_TIPO} value={tipo} onChange={(evento) => setTipo(evento.target.value as ProjectType)} /></Campo>
                    <Campo label="Produto"><Select options={OPCOES_PRODUTO} value={produto} onChange={(evento) => setProduto(evento.target.value as Product)} /></Campo>
                    <Campo
                      label="Previsão de go live"
                      dica={
                        origemAutomatizada && !temEscopoImportacao
                          ? 'exige Escopo identificado'
                          : 'opcional'
                      }
                    >
                      <input
                        type="date"
                        value={dataGoLive}
                        onChange={(evento) => setDataGoLive(evento.target.value)}
                        disabled={origemAutomatizada && !temEscopoImportacao}
                        className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </Campo>
                    {origemAutomatizada && (
                      <Campo
                        label="Horas estimadas"
                        dica={temEscopoImportacao ? 'opcional' : 'exige Escopo identificado'}
                      >
                        <input
                          type="number"
                          min="0.5"
                          max="10000"
                          step="0.5"
                          inputMode="decimal"
                          value={horasEstimadas}
                          onChange={(evento) => setHorasEstimadas(evento.target.value)}
                          disabled={!temEscopoImportacao}
                          placeholder="Ex.: 120"
                          className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                        />
                      </Campo>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2"><Building2 className="size-4 text-brand-600" /><h4 className="text-sm font-semibold text-slate-900">Organização</h4></div>
                        <p className="mt-1 text-xs text-slate-500">Seleção obrigatória para evitar vínculo incorreto.</p>
                      </div>
                      {rascunhoNaira?.cliente.nomeOrganizacaoSugerida && (
                        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-200">Sugestão: {rascunhoNaira.cliente.nomeOrganizacaoSugerida}</span>
                      )}
                    </div>
                    {!criandoOrganizacao ? (
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <Select className="flex-1" options={opcoesOrganizacao} placeholder="Selecione uma organização" value={organizacaoId} onChange={(evento) => setOrganizacaoId(evento.target.value)} aria-label="Organização" />
                        <Button variant="secondary" onClick={() => setCriandoOrganizacao(true)}><Plus className="size-4" /> Nova organização</Button>
                      </div>
                    ) : (
                      <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
                        <Campo label="Nome da organização"><input value={nomeOrganizacao} onChange={(evento) => setNomeOrganizacao(evento.target.value)} placeholder="Razão ou nome fantasia" className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none" /></Campo>
                        <Campo label="Segmento" dica="opcional"><input value={segmentoOrganizacao} onChange={(evento) => setSegmentoOrganizacao(evento.target.value)} placeholder="Ex.: Varejo" className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none" /></Campo>
                        <div className="flex gap-2 sm:col-span-2"><Button size="sm" onClick={cadastrarOrganizacao} disabled={!nomeOrganizacao.trim() || salvandoOrganizacao}>{salvandoOrganizacao ? 'Cadastrando…' : 'Cadastrar e selecionar'}</Button><Button size="sm" variant="ghost" onClick={() => setCriandoOrganizacao(false)}>Cancelar</Button></div>
                      </div>
                    )}
                  </div>

                  {origemAutomatizada && rascunhoNaira?.projeto.resumoEscopo && (
                    <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-violet-900"><FileSearch className="size-4" /> Resumo do escopo</div>
                      <p className="mt-2 text-sm leading-6 text-violet-900/80">{rascunhoNaira.projeto.resumoEscopo}</p>
                    </div>
                  )}

                  {origemAutomatizada && (linksSugeridos.length > 0 || pendenciasSugeridas.length > 0) && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                      <h4 className="text-sm font-semibold text-slate-900">Sugestões operacionais</h4>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Revise os grupos. Itens não confirmados serão descartados na criação.</p>
                      <div className="mt-4 space-y-3">
                        {linksSugeridos.length > 0 && (
                          <GrupoRevisao
                            icon={<Link2 className="size-4" />}
                            titulo={`${linksSugeridos.length} ${linksSugeridos.length === 1 ? 'link útil sugerido' : 'links úteis sugeridos'}`}
                            itens={linksSugeridos.map((item) => `${item.titulo} · ${item.url}`)}
                            marcado={linksSugeridos.every((item) => item.revisado)}
                            onChange={alterarRevisaoLinks}
                            textoConfirmacao="Revisei e quero incluir estes links"
                            observacao="Os links serão internos e não ficarão visíveis ao cliente automaticamente."
                          />
                        )}
                        {pendenciasSugeridas.length > 0 && (
                          <GrupoRevisao
                            icon={<AlertTriangle className="size-4" />}
                            titulo={`${pendenciasSugeridas.length} ${pendenciasSugeridas.length === 1 ? 'pendência sugerida' : 'pendências sugeridas'}`}
                            itens={pendenciasSugeridas.map((item) => item.titulo)}
                            marcado={pendenciasSugeridas.every((item) => item.revisado)}
                            onChange={alterarRevisaoPendencias}
                            textoConfirmacao="Revisei e quero incluir estas pendências"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {origemAutomatizada && importacao && <PainelEvidencias importacao={importacao} />}
              </div>

              {erro && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{erro}</p>}
            </section>
          )}

          {etapa === 3 && (
            <section aria-labelledby="titulo-revisao">
              <div className="mb-5">
                <p className="text-xs font-semibold tracking-wider text-brand-600 uppercase">Confirmação humana</p>
                <h3 id="titulo-revisao" className="mt-1 text-xl font-semibold text-slate-900">Revise a estrutura final</h3>
                <p className="mt-1 text-sm text-slate-600">Depois da confirmação, o projeto entra no Rastreio de Projetos e pode ser refinado normalmente.</p>
              </div>

              {bloqueios.length > 0 && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4" role="alert">
                  <div className="flex gap-3"><AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-700" /><div><p className="text-sm font-semibold text-red-900">Resolva antes de confirmar</p><ul className="mt-2 space-y-1 text-sm text-red-800">{bloqueios.map((item) => <li key={item}>• {item}</li>)}</ul></div></div>
                </div>
              )}

              <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h4 className="text-sm font-semibold text-slate-900">Resumo do projeto</h4>
                    <dl className="mt-4 space-y-3 text-sm">
                      <ResumoLinha label="Cliente" value={nomeCliente} />
                      <ResumoLinha label="Organização" value={nomeOrganizacaoSelecionada} />
                      <ResumoLinha label="Plataforma" value={PLATFORM_META[plataforma].label} />
                      <ResumoLinha label="Tipo" value={TYPE_META[tipo].label} />
                      <ResumoLinha label="Produto" value={PRODUCT_META[produto].label} />
                      <ResumoLinha label="Go live" value={dataGoLive ? new Date(`${dataGoLive}T12:00:00`).toLocaleDateString('pt-BR') : 'Não definido'} />
                      {origemAutomatizada && (
                        <ResumoLinha label="Horas estimadas" value={horasEstimadas ? `${Number(horasEstimadas).toLocaleString('pt-BR')} h` : 'Não definido'} />
                      )}
                    </dl>
                  </div>
                  {origemAutomatizada && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-600">
                      <div className="flex items-center gap-2 font-semibold text-slate-800"><CheckCircle2 className="size-4 text-emerald-600" /> Gate de revisão</div>
                      <p className="mt-2 leading-5">{linksRevisados} de {linksSugeridos.length} links e {pendenciasRevisadas} de {pendenciasSugeridas.length} pendências foram aprovados.</p>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-2"><Layers3 className="size-4 text-brand-600" /><h4 className="text-sm font-semibold text-slate-900">Estrutura de etapas</h4></div>
                  {origemAutomatizada && fasesNaira.length > 0 && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <EscolhaFases ativo={usarFasesSugeridas} onClick={() => setUsarFasesSugeridas(true)} titulo="Usar etapas sugeridas" descricao={`${fasesNaira.length} etapas · ${quantidadeItensNaira} itens recebidos pela automação`} destaque />
                      <EscolhaFases ativo={!usarFasesSugeridas} onClick={() => setUsarFasesSugeridas(false)} titulo="Usar template padrão" descricao={`${etapasDoTemplate.length} etapas do template ${PRODUCT_META[produto].label}`} />
                    </div>
                  )}
                  <ol className="mt-5 max-h-80 space-y-2 overflow-y-auto pr-1">
                    {(origemAutomatizada && usarFasesSugeridas ? fasesNaira : etapasDoTemplate).map((fase, indice) => {
                      const nome = 'name' in fase ? fase.name : fase.nome
                      const checklist = fase.checklist
                      return (
                        <li key={'idTemporario' in fase ? fase.idTemporario : `${nome}-${indice}`} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{indice + 1}</span>
                          <div className="min-w-0"><p className="text-sm font-medium text-slate-800">{nome}</p><p className="mt-0.5 text-xs text-slate-500">{checklist.length} {checklist.length === 1 ? 'item' : 'itens'}</p></div>
                        </li>
                      )
                    })}
                  </ol>
                </div>
              </div>

              {avisos.length > 0 && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><p className="font-semibold">Avisos da análise</p><ul className="mt-2 space-y-1">{avisos.map((aviso) => <li key={aviso}>• {aviso}</li>)}</ul></div>
              )}
              {erro && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{erro}</p>}
            </section>
          )}
        </form>
      </div>
    </Modal>
  )
}

function BotaoOrigem({ ativo, onClick, icon, titulo, descricao, selo, destaque = false }: { ativo: boolean; onClick: () => void; icon: ReactNode; titulo: string; descricao: string; selo: string; destaque?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={ativo} className={`rounded-2xl border p-4 text-left transition-all focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none ${ativo ? 'border-brand-300 bg-brand-50/60 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
      <div className="flex items-start justify-between gap-3"><span className={`flex size-10 items-center justify-center rounded-xl ${destaque ? 'bg-violet-100 text-violet-700' : 'bg-brand-100 text-brand-700'}`}>{icon}</span><span className={`flex size-5 items-center justify-center rounded-full border ${ativo ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-transparent'}`}><Check className="size-3" /></span></div>
      <h4 className="mt-3 text-sm font-semibold text-slate-900">{titulo}</h4><p className="mt-1 text-xs leading-5 text-slate-600">{descricao}</p><span className="mt-3 inline-flex rounded-lg bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">{selo}</span>
    </button>
  )
}

function PainelImportacaoJson({
  conteudo,
  erro,
  nomeArquivo,
  tamanhoMaximo,
  enviando,
  onChange,
  onSelecionarArquivo,
  onFormatar,
  onImportar,
}: {
  conteudo: string
  erro?: string
  nomeArquivo?: string
  tamanhoMaximo: number
  enviando: boolean
  onChange: (valor: string) => void
  onSelecionarArquivo: (evento: ChangeEvent<HTMLInputElement>) => void
  onFormatar: () => void
  onImportar: () => void
}) {
  let jsonValido = false
  let quantidadeChaves = 0
  if (conteudo.trim()) {
    try {
      const resultado = interpretarConteudoJson(conteudo, tamanhoMaximo)
      jsonValido = true
      quantidadeChaves = Object.keys(resultado).length
    } catch {
      jsonValido = false
    }
  }

  return (
    <div className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wider text-violet-600 uppercase">Entrada estruturada</p>
            <h4 className="mt-1 flex items-center gap-2 text-base font-semibold text-slate-900">
              <Braces className="size-4 text-violet-600" /> Colar resultado JSON
            </h4>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-600">
              Cole o objeto devolvido pela automação. O painel enviará exatamente esse objeto no campo{' '}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-700">resultado</code>.
            </p>
          </div>
          {conteudo.trim() && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                jsonValido
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-amber-50 text-amber-800 ring-amber-200'
              }`}
              aria-live="polite"
            >
              {jsonValido ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
              {jsonValido ? `JSON válido · ${quantidadeChaves} chaves na raiz` : 'JSON ainda incompleto'}
            </span>
          )}
        </div>

        <label htmlFor="conteudo-importacao-json" className="mt-5 block text-sm font-medium text-slate-700">
          Conteúdo JSON
        </label>
        <textarea
          id="conteudo-importacao-json"
          value={conteudo}
          onChange={(evento) => onChange(evento.target.value)}
          rows={15}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder={'{\n  "rascunho": {\n    "cliente": { "nome": "Cliente" },\n    "projeto": { "produto": "ecommerce" },\n    "fases": []\n  }\n}'}
          className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100 shadow-inner focus:border-violet-400 focus:ring-2 focus:ring-violet-100 focus:outline-none"
          aria-invalid={Boolean(erro)}
          aria-describedby={erro ? 'erro-importacao-json' : 'ajuda-importacao-json'}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-brand-500 focus-within:ring-offset-2">
            <Upload className="size-3.5" />
            {nomeArquivo ?? 'Selecionar arquivo .json'}
            <input
              key={nomeArquivo ?? 'sem-arquivo-json'}
              type="file"
              accept="application/json,.json"
              onChange={onSelecionarArquivo}
              className="sr-only"
            />
          </label>
          <Button type="button" variant="secondary" size="sm" onClick={onFormatar} disabled={!jsonValido || enviando}>
            <Braces className="size-3.5" /> Formatar JSON
          </Button>
          <Button type="button" size="sm" className="sm:ml-auto" onClick={onImportar} disabled={!jsonValido || enviando}>
            {enviando ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            {enviando ? 'Validando…' : 'Importar para revisão'}
          </Button>
        </div>
        {erro ? (
          <p id="erro-importacao-json" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            {erro}
          </p>
        ) : (
          <p id="ajuda-importacao-json" className="mt-3 text-xs text-slate-500">
            Aceita texto colado ou arquivo .json de até {Math.ceil(tamanhoMaximo / 1024 / 1024)} MB. Nenhum projeto é criado nesta etapa.
          </p>
        )}
      </div>

      <aside className="rounded-xl border border-violet-200 bg-violet-50/50 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-violet-900">
          <FileSearch className="size-4" /> Contrato esperado
        </div>
        <p className="mt-2 text-xs leading-5 text-violet-900/80">
          O objeto pode trazer <strong>rascunho</strong>, <strong>campos</strong>, <strong>fontes</strong> e{' '}
          <strong>validação</strong>. Também aceitamos a estrutura direta com cliente, projeto e fases.
        </p>
        <ol className="mt-4 space-y-3 text-xs text-violet-900/80">
          <li className="flex gap-2"><span className="font-semibold text-violet-700">1.</span><span>O backend normaliza nomes, enums e limites permitidos.</span></li>
          <li className="flex gap-2"><span className="font-semibold text-violet-700">2.</span><span>O resultado abre na mesma revisão usada pelo PDF.</span></li>
          <li className="flex gap-2"><span className="font-semibold text-violet-700">3.</span><span>Links, pendências, organização e fases continuam sujeitos à confirmação humana.</span></li>
        </ol>
        <div className="mt-4 rounded-lg border border-violet-200 bg-white/80 p-3 text-[11px] leading-4 text-violet-800">
          O prompt completo para configurar o agente está em <strong>docs/prompt-agente-projetos-naira.md</strong>.
        </div>
      </aside>
    </div>
  )
}

function GrupoRevisao({ icon, titulo, itens, marcado, onChange, textoConfirmacao, observacao }: { icon: ReactNode; titulo: string; itens: string[]; marcado: boolean; onChange: (marcado: boolean) => void; textoConfirmacao: string; observacao?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">{icon}{titulo}</div>
      <ul className="mt-2 space-y-1 text-xs text-slate-600">{itens.slice(0, 4).map((item) => <li key={item} className="truncate">• {item}</li>)}{itens.length > 4 && <li>+ {itens.length - 4} outros itens</li>}</ul>
      <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white p-3"><input type="checkbox" checked={marcado} onChange={(evento) => onChange(evento.target.checked)} className="mt-0.5 size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" /><span><span className="block text-xs font-semibold text-slate-800">{textoConfirmacao}</span>{observacao && <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{observacao}</span>}</span></label>
    </div>
  )
}

const META_COMPARACAO = {
  contratado_confirmado: {
    label: 'Contratado e alinhado',
    classe: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  contratado_sem_detalhamento: {
    label: 'Contratado, falta detalhar',
    classe: 'bg-sky-50 text-sky-700 ring-sky-200',
  },
  excluido_confirmado: {
    label: 'Excluído do contrato',
    classe: 'bg-slate-100 text-slate-600 ring-slate-200',
  },
  conflito: {
    label: 'Conflito',
    classe: 'bg-red-50 text-red-700 ring-red-200',
  },
  potencial_extra: {
    label: 'Possível extra',
    classe: 'bg-amber-50 text-amber-800 ring-amber-200',
  },
} as const

function EvidenciasVinculadas({
  fonteIds,
  fontes,
}: {
  fonteIds?: string[]
  fontes: FonteImportacaoProjeto[]
}) {
  const idsUnicos = [...new Set(fonteIds ?? [])]
  if (!idsUnicos.length) return null

  const fontesPorId = new Map(fontes.map((fonte) => [fonte.id, fonte]))
  const vinculadas = idsUnicos
    .map((id) => fontesPorId.get(id))
    .filter((fonte): fonte is FonteImportacaoProjeto => Boolean(fonte))
  const referenciasAusentes = idsUnicos.length - vinculadas.length

  if (!vinculadas.length) {
    return (
      <p className="mt-2 text-[11px] leading-4 text-amber-700">
        As referências informadas para este item não estão disponíveis na resposta atual.
      </p>
    )
  }

  return (
    <details className="mt-2 rounded-lg border border-violet-100 bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-2.5 py-2 text-[11px] font-semibold text-violet-700 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <Link2 className="size-3.5" />
        {vinculadas.length} {vinculadas.length === 1 ? 'evidência vinculada' : 'evidências vinculadas'}
      </summary>
      <ul className="space-y-2 border-t border-violet-100 p-2.5">
        {vinculadas.map((fonte) => {
          const papel = fonte.tipoDocumento === 'briefing'
            ? 'Briefing'
            : fonte.tipoDocumento === 'escopo'
              ? 'Escopo'
              : 'Documento'
          return (
            <li key={fonte.id} className="rounded-lg bg-slate-50 p-2 text-[11px] leading-4 text-slate-600">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-200">
                  {papel}
                </span>
                <span className="font-semibold text-slate-700">
                  {fonte.nomeDocumento ?? fonte.rotulo ?? 'Fonte identificada'}
                </span>
                {fonte.pagina && <span>· página {fonte.pagina}</span>}
              </div>
              {fonte.trecho && <blockquote className="mt-1 border-l-2 border-violet-200 pl-2 text-slate-600">{fonte.trecho}</blockquote>}
            </li>
          )
        })}
        {referenciasAusentes > 0 && (
          <li className="text-[11px] leading-4 text-amber-700">
            {referenciasAusentes} {referenciasAusentes === 1 ? 'referência não foi encontrada' : 'referências não foram encontradas'} na resposta atual.
          </li>
        )}
      </ul>
    </details>
  )
}

function PainelEvidencias({ importacao }: { importacao: ImportacaoProjeto }) {
  const campos = importacao.campos ?? []
  const comparacoes = campos.filter((campo) => campo.campo.startsWith('comparacao.'))
  const camposGerais = campos.filter((campo) => !campo.campo.startsWith('comparacao.'))
  const fontes = importacao.fontes ?? []
  const confiancas = campos.map((campo) => confiancaComoPercentual(campo.confianca)).filter((valor): valor is number => valor !== undefined)
  const media = confiancas.length ? Math.round(confiancas.reduce((total, valor) => total + valor, 0) / confiancas.length) : undefined
  return (
    <aside className="space-y-4">
      {comparacoes.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <GitCompareArrows className="size-4 text-violet-600" /> Matriz Escopo × Briefing
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                O Escopo define o contrato; divergências e pedidos adicionais exigem revisão.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {comparacoes.length} {comparacoes.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
          <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
            {comparacoes.map((campo, indice) => {
              const status =
                typeof campo.valor === 'string' && campo.valor in META_COMPARACAO
                  ? META_COMPARACAO[campo.valor as keyof typeof META_COMPARACAO]
                  : undefined
              return (
                <li
                  key={`${campo.campo}-${indice}`}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="text-xs font-semibold leading-5 text-slate-800">
                      {campo.rotulo ?? campo.campo}
                    </span>
                    {status ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${status.classe}`}
                      >
                        {status.label}
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-600">
                        {resumoValor(campo.valor)}
                      </span>
                    )}
                  </div>
                  <EvidenciasVinculadas fonteIds={campo.fonteIds} fontes={fontes} />
                </li>
              )
            })}
          </ul>
        </div>
      )}
      <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5">
        <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-semibold text-violet-900"><Sparkles className="size-4" /> Evidências da automação</div>{media !== undefined && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-200">Confiança média {media}%</span>}</div>
        {camposGerais.length > 0 ? <dl className="mt-4 space-y-3">{camposGerais.slice(0, 8).map((campo) => { const confianca = confiancaComoPercentual(campo.confianca); return <div key={campo.campo} className="border-b border-violet-100 pb-3 last:border-0 last:pb-0"><dt className="flex items-center justify-between gap-3 text-xs font-medium text-violet-700"><span>{campo.rotulo ?? campo.campo}</span>{confianca !== undefined && <span>{confianca}%</span>}</dt><dd className="mt-1 truncate text-sm text-slate-800">{resumoValor(campo.valor)}</dd></div>})}</dl> : <p className="mt-3 text-xs leading-5 text-violet-800">O provedor não informou confiança para os dados cadastrais. Confirme-os diretamente no formulário.</p>}
      </div>
      {(importacao.validacao?.bloqueios.length || importacao.validacao?.avisos.length) ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-amber-900"><AlertTriangle className="size-4" /> Pontos de atenção</div><ul className="mt-2 space-y-1.5 text-xs leading-5 text-amber-800">{importacao.validacao.bloqueios.map((item) => <li key={item}>• {item}</li>)}{importacao.validacao.avisos.map((item) => <li key={item}>• {item}</li>)}</ul></div> : null}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><FileText className="size-4 text-slate-500" /> Fontes nos documentos</div>
        {fontes.length ? (
          <ul className="mt-3 space-y-2">
            {fontes.slice(0, 8).map((fonte) => {
              const papel = fonte.tipoDocumento === 'briefing'
                ? 'Briefing'
                : fonte.tipoDocumento === 'escopo'
                  ? 'Escopo'
                  : undefined
              return (
                <li key={fonte.id} className="rounded-lg bg-slate-50 p-2.5 text-xs leading-5 text-slate-600">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {papel && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-200">{papel}</span>}
                    <span className="font-semibold text-slate-700">{fonte.nomeDocumento ?? fonte.rotulo ?? 'Trecho identificado'}</span>
                    {fonte.pagina && <span className="text-slate-500">· página {fonte.pagina}</span>}
                  </div>
                  {fonte.rotulo && fonte.rotulo !== fonte.nomeDocumento && <span className="mt-0.5 block text-slate-500">{fonte.rotulo}</span>}
                  {fonte.trecho && <span className="mt-0.5 block line-clamp-3">{fonte.trecho}</span>}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-2 text-xs leading-5 text-slate-500">Nenhum trecho de origem foi devolvido pelo provedor.</p>
        )}
      </div>
      <div className="flex gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs leading-5 text-sky-800"><Info className="mt-0.5 size-4 shrink-0" />A confiança ajuda na revisão, mas não substitui a validação do escopo e da organização.</div>
    </aside>
  )
}

function EscolhaFases({ ativo, onClick, titulo, descricao, destaque = false }: { ativo: boolean; onClick: () => void; titulo: string; descricao: string; destaque?: boolean }) {
  return <button type="button" onClick={onClick} aria-pressed={ativo} className={`rounded-xl border p-4 text-left focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none ${ativo ? 'border-brand-400 bg-brand-50/60' : 'border-slate-200 bg-white hover:bg-slate-50'}`}><div className="flex items-center justify-between gap-3"><span className={`flex size-8 items-center justify-center rounded-lg ${destaque ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>{destaque ? <Sparkles className="size-4" /> : <ListChecks className="size-4" />}</span><span className={`flex size-5 items-center justify-center rounded-full border ${ativo ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-transparent'}`}><Check className="size-3" /></span></div><p className="mt-3 text-sm font-semibold text-slate-900">{titulo}</p><p className="mt-1 text-xs leading-5 text-slate-500">{descricao}</p></button>
}

function ResumoLinha({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0"><dt className="text-slate-500">{label}</dt><dd className="text-right font-medium text-slate-800">{value}</dd></div>
}
