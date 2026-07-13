import { useState, type FormEvent } from 'react'
import {
  ExternalLink,
  Eye,
  FolderKanban,
  Link2,
  LockKeyhole,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import type { CategoriaLinkUtil, Project } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { adicionarLinkUtil, removerLinkUtil } from '@/services/projectsService'
import { cn } from '@/utils/cn'

interface LinksUteisCardProps {
  project: Project
  onProjectChange: (project: Project) => void
}

const CATEGORIAS: Array<{
  value: CategoriaLinkUtil
  label: string
  descricao: string
  dot: string
  badge: string
}> = [
  {
    value: 'geral',
    label: 'Geral',
    descricao: 'Referências compartilhadas pelo time',
    dot: 'bg-slate-400',
    badge: 'border-slate-200 bg-slate-50 text-slate-700',
  },
  {
    value: 'planejamento',
    label: 'Planejamento',
    descricao: 'Cronogramas, briefings e organização',
    dot: 'bg-sky-500',
    badge: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  {
    value: 'design',
    label: 'Design',
    descricao: 'Protótipos, layouts e bibliotecas',
    dot: 'bg-violet-500',
    badge: 'border-violet-200 bg-violet-50 text-violet-700',
  },
  {
    value: 'conteudo',
    label: 'Conteúdo',
    descricao: 'Textos, mídias e materiais do cliente',
    dot: 'bg-amber-500',
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  {
    value: 'tecnico',
    label: 'Técnico',
    descricao: 'Ambientes, documentação e ferramentas',
    dot: 'bg-emerald-500',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
]

const campoClass =
  'h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 shadow-sm shadow-slate-950/5 transition-colors placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none'

function mensagemErro(error: unknown): string {
  return error instanceof Error ? error.message : 'Não foi possível concluir a ação.'
}

/** Atalhos operacionais agrupados por contexto, com publicação ao cliente por opt-in. */
export function LinksUteisCard({ project, onProjectChange }: LinksUteisCardProps) {
  const { notify } = useToast()
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [url, setUrl] = useState('')
  const [categoria, setCategoria] = useState<CategoriaLinkUtil>('geral')
  const [descricao, setDescricao] = useState('')
  const [visivelCliente, setVisivelCliente] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [confirmandoRemocao, setConfirmandoRemocao] = useState<string>()
  const [removendo, setRemovendo] = useState<string>()
  const links = project.linksUteis ?? []

  function limparFormulario() {
    setTitulo('')
    setUrl('')
    setCategoria('geral')
    setDescricao('')
    setVisivelCliente(false)
  }

  async function handleAdicionar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSalvando(true)
    try {
      const atualizado = await adicionarLinkUtil(project.id, {
        titulo,
        url,
        categoria,
        descricao,
        visivelCliente,
      })
      onProjectChange(atualizado)
      limparFormulario()
      setMostrarFormulario(false)
      notify('Link útil adicionado.')
    } catch (error) {
      notify(mensagemErro(error), 'error')
    } finally {
      setSalvando(false)
    }
  }

  async function handleRemover(linkId: string) {
    setRemovendo(linkId)
    try {
      const atualizado = await removerLinkUtil(project.id, linkId)
      onProjectChange(atualizado)
      setConfirmandoRemocao(undefined)
      notify('Link útil removido.', 'info')
    } catch (error) {
      notify(mensagemErro(error), 'error')
    } finally {
      setRemovendo(undefined)
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Link2 aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">Links úteis</h2>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                {links.length}
              </span>
            </div>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              Centralize documentos, ambientes e ferramentas usados pelo time.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant={mostrarFormulario ? 'ghost' : 'secondary'}
          onClick={() => setMostrarFormulario((atual) => !atual)}
          aria-expanded={mostrarFormulario}
        >
          {mostrarFormulario ? <X className="size-4" /> : <Plus className="size-4" />}
          {mostrarFormulario ? 'Fechar' : 'Adicionar link'}
        </Button>
      </div>

      {mostrarFormulario && (
        <form onSubmit={handleAdicionar} className="border-b border-slate-200 bg-slate-50/70 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">Título *</span>
              <input
                value={titulo}
                onChange={(event) => setTitulo(event.target.value)}
                className={campoClass}
                placeholder="Ex.: Protótipo aprovado"
                maxLength={140}
                required
                autoFocus
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">Categoria</span>
              <select
                value={categoria}
                onChange={(event) => setCategoria(event.target.value as CategoriaLinkUtil)}
                className={campoClass}
              >
                {CATEGORIAS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">URL *</span>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              className={campoClass}
              placeholder="https://..."
              type="url"
              inputMode="url"
              required
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">Descrição</span>
            <input
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              className={campoClass}
              placeholder="Contexto rápido para quem for abrir o link"
              maxLength={280}
            />
          </label>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
            <input
              type="checkbox"
              checked={visivelCliente}
              onChange={(event) => setVisivelCliente(event.target.checked)}
              className="mt-0.5 size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span>
              <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                <Eye aria-hidden="true" className="size-4 text-slate-500" />
                Exibir também no portal do cliente
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                Desativado por padrão. Não publique links com credenciais ou conteúdo interno.
              </span>
            </span>
          </label>

          <div className="mt-5 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                limparFormulario()
                setMostrarFormulario(false)
              }}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={salvando}>
              <Plus className="size-4" />
              {salvando ? 'Adicionando...' : 'Adicionar link'}
            </Button>
          </div>
        </form>
      )}

      <div className="p-5">
        {links.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="Nenhum link cadastrado"
            description="Adicione os atalhos que o time mais consulta para evitar buscas e mensagens espalhadas."
            action={
              !mostrarFormulario ? (
                <Button size="sm" variant="secondary" onClick={() => setMostrarFormulario(true)}>
                  <Plus className="size-4" />
                  Adicionar primeiro link
                </Button>
              ) : undefined
            }
            className="py-8 sm:py-10"
          />
        ) : (
          <div className="space-y-6">
            {CATEGORIAS.map((meta) => {
              const linksDaCategoria = links.filter((link) => link.categoria === meta.value)
              if (linksDaCategoria.length === 0) return null
              return (
                <section key={meta.value} aria-labelledby={`links-${meta.value}`}>
                  <div className="mb-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 id={`links-${meta.value}`} className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <span aria-hidden="true" className={cn('size-2 rounded-full', meta.dot)} />
                        {meta.label}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">{meta.descricao}</p>
                    </div>
                    <span className="text-xs font-medium text-slate-400">{linksDaCategoria.length}</span>
                  </div>

                  <div className="grid gap-2.5 lg:grid-cols-2">
                    {linksDaCategoria.map((link) => (
                      <article
                        key={link.id}
                        className="group rounded-xl border border-slate-200 bg-white p-3.5 transition-colors hover:border-slate-300 hover:bg-slate-50/50"
                      >
                        <div className="flex items-start gap-3">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="min-w-0 flex-1 rounded-lg focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none"
                          >
                            <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                              <span className="truncate">{link.titulo}</span>
                              <ExternalLink aria-hidden="true" className="size-3.5 shrink-0 text-slate-400" />
                            </span>
                            {link.descricao && (
                              <span className="mt-1 block text-xs leading-5 text-slate-500">{link.descricao}</span>
                            )}
                          </a>
                          <button
                            type="button"
                            onClick={() => setConfirmandoRemocao(link.id)}
                            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 opacity-100 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
                            aria-label={`Remover ${link.titulo}`}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', meta.badge)}>
                            {meta.label}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            {link.visivelCliente ? (
                              <><Eye className="size-3" /> Visível ao cliente</>
                            ) : (
                              <><LockKeyhole className="size-3" /> Somente interno</>
                            )}
                          </span>
                        </div>

                        {confirmandoRemocao === link.id && (
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2">
                            <span className="text-xs font-medium text-red-700">Remover este link?</span>
                            <span className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => setConfirmandoRemocao(undefined)}
                                className="h-8 cursor-pointer rounded-lg px-2.5 text-xs font-medium text-slate-600 hover:bg-white focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemover(link.id)}
                                disabled={removendo === link.id}
                                className="h-8 cursor-pointer rounded-lg bg-red-600 px-2.5 text-xs font-medium text-white hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {removendo === link.id ? 'Removendo...' : 'Remover'}
                              </button>
                            </span>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )
}
