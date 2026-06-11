# Design — Templates, Edição de Etapas, NPS, Finalização e Acesso do Cliente

Data: 2026-06-11 · Status: aprovado (rodagem de testes)

## Contexto

Portal Nairuz já tem: fundação (TS+Tailwind+router), visão Nairuz (Dashboard, Projetos, detalhe com fases), portal do cliente (login mock, lista, detalhe filtrado). Camada **mock-first** em `src/services` (localStorage), pronta para trocar por Supabase.

Este design adiciona 4 capacidades + reformula o acesso do cliente.

## Decisões tomadas

- **Produto** (novo) = o que está sendo construído: Blog institucional, E-commerce, Desenvolvimento próprio (editável depois). Campo `product` no projeto.
- **Blocos reusam o `Tipo` atual** (Implantação, Evolução, Sustentação, CRO, Pontual). Estrutura: `Project.blocks[] → Block{kind,name,order,phases[]}`. Refactor das fases planas atuais.
- Cada **Produto** tem template com blocos+fases padrão, gerados na criação.
- **Histórico só estrutural** (bloco/fase adicionada/removida/renomeada), visível ao cliente.
- **NPS** libera o projeto (`released`); **upsell** só aparece depois que a Nairuz marca `encerrado`.
- **Acesso do cliente é por e-mail liberado pela Nairuz, por projeto** (substitui o acesso por organização). Cada cliente tem login; vê só os projetos cujos `clientEmails` contêm o e-mail dele.

## Modelo de dados

- `Product`: lista seed editável (label + blocos padrão).
- `Project`: novos campos `product`, `blocks: Block[]` (substitui `phases`), `clientEmails: string[]`, `history: HistoryEntry[]`, `nps?`, `released: boolean`, `supportHours:{antes,depois}`, `finalization:{sustentacao,evolucao,mensagem}`.
- `Block`: `{ id, projectId, kind: BlockKind, name, order, phases: Phase[] }`.
- `HistoryEntry`: `{ id, type, label, detail?, actor:'Nairuz', at }` — estruturais, client-visible.
- `ClientUser`: `{ id, name, email, organizationId? }` — registro de nomes; acesso real vem dos grants por projeto.

## Fatias de implementação

### Fatia 0 — Acesso do cliente por e-mail (conectividade) ← FAZER PRIMEIRO
- `Project.clientEmails: string[]`; seed com o e-mail do contato de cada projeto.
- `authService`: login por e-mail válido se constar em algum `clientEmails` ou no registro.
- `projectsService`: `listProjectsForClient(email)`, `grantClientAccess(projectId,email,name?)`, `revokeClientAccess(projectId,email)`.
- Portal cliente: lista e detalhe escopados por e-mail (autorização = e-mail consta no projeto).
- Visão Nairuz (detalhe do projeto): card "Acesso do cliente" para liberar/remover e-mails.

### Fatia 1 — Produtos/Templates + Criação de projeto + Blocos
- `Product` seed + templates (blocos+fases padrão).
- Botão "Novo projeto": cliente/org, plataforma, produto → preview dos blocos, escolher quais incluir → gera `blocks→phases`.
- Refactor: detalhe agrupa fases por bloco; utils de progresso/fase atual percorrem blocos; portal cliente e lista ajustados.

### Fatia 2 — Edição de etapas + Histórico
- Nairuz: adicionar/remover/renomear fase; adicionar/remover bloco. Cada ação grava `HistoryEntry`.
- Cliente: seção "Histórico do projeto".

### Fatia 3 — NPS + Finalização + Upsell + Config
- Cliente: NPS obrigatório (0–10 + comentário) antes de liberar; ao responder, `released=true` e horas sobem.
- Cliente: ao `encerrado`, tela de conclusão com botões Sustentação/Evolução (apresentação → WhatsApp comercial).
- Nairuz: painel de config por projeto (WhatsApp, apresentação, horas antes/depois, mensagem).

## Permissões
- Nairuz edita tudo (estrutura, acesso, config, status). Cliente: responde NPS, vê histórico, vê upsell. Não edita estrutura.
