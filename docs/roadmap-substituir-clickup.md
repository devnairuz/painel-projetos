# Roadmap — Substituir o ClickUp pelo Painel Interno da Nairuz

> **Objetivo:** levar o painel a fazer internamente tudo que hoje justifica o custo do ClickUp,
> aproveitando os diferenciais que o ClickUp **não** tem (portal do cliente, gamificação, NPS gate, upsell).
> **Direção escolhida:** inspiração (trazer os superpoderes do ClickUp pra cima da arquitetura atual),
> não migração de stack nem produto multi-tenant — por enquanto.
>
> Data: junho/2026 · Stack real: React 19 + Vite + Tailwind 4 (frontend) · Express + MongoDB/Mongoose (backend)

---

## Princípios

1. **Não jogar fora o vertical.** Portal do cliente, gamificação, NPS e upsell são fosso competitivo — o ClickUp nunca terá isso. Tudo aqui é aditivo.
2. **Respeitar a arquitetura.** UI fala com `src/services/*`; regra de negócio mora em `server/src/domain/ops.js` (fonte única, reusada por memória e Mongo). Toda capacidade nova entra por essas duas portas.
3. **Substituir por uso real, não por paridade total.** O alvo não é clonar o ClickUp — é cobrir o que a equipe de fato usa lá. Cada fase abaixo mira um motivo concreto de ainda abrir o ClickUp.

> **Pendência de alinhamento:** os comentários do código falam em Supabase, mas a implementação é Mongo.
> Decidir e limpar antes de escalar (recomendação: seguir com Mongo, já está pronto).

---

## Fase 0 — Fundação (pré-requisito, ~1–2 semanas)

Sem isto, qualquer fase seguinte trava. São lacunas de produção, não features.

| Item | Estado hoje | Ação |
|---|---|---|
| Storage de anexos | `attachments`/`scopeFiles` têm `url`, mas sem storage real | Integrar S3/R2/Supabase Storage; upload assinado |
| E-mail real | Código de verificação aparece na tela (modo dev, ver `DEPLOY.md`) | Resend/SMTP para verificação + notificações |
| Audit log geral | Só `HistoryEntry` (eventos estruturais) | Log "quem mudou o quê e quando" em todas as entidades |
| Testes de domínio | Sem testes em `ops.js` | Cobrir `computeProgress`, `deriveRisk`, `currentPhase`, `syncPhaseStatus` |

**Substitui do ClickUp:** anexos em tasks, trilha de auditoria, e-mails de notificação.

---

## Fase 1 — Views (maior gap visual, ~3–4 semanas)

Hoje há Dashboard + lista de Projetos + `GanttModal`. O ClickUp vende a troca de visão sobre os mesmos dados. Tudo abaixo lê o mesmo `Project`/`Phase`/`ProjectTask` — só muda a renderização.

- **Board / Kanban** arrastável por `ProjectStatus` (e por status de task). Drag-and-drop entre colunas. *Reuso:* enum de status já existe.
- **Gantt / Timeline full-page** com dependências, evoluindo o `GanttModal` atual para página dedicada.
- **Calendar view** das `dueDate` de fases e `charges`.
- **Tabela editável** estilo planilha: bulk edit, ordenação, filtros salvos por usuário.
- **Filtros + buscas salvas** reaproveitáveis em qualquer view.

**Substitui do ClickUp:** as views List/Board/Gantt/Calendar/Table — o motivo nº1 de abrir o ClickUp.

---

## Fase 2 — Flexibilidade de dados (~3–4 semanas)

O que faz o ClickUp servir pra qualquer fluxo. Entrar com parcimônia — vocês têm um vertical, não precisam de tudo configurável.

- **Custom fields** por organização/projeto (texto, número, dropdown, data, money, URL, pessoa). Guardar como `customFields: Record<string,unknown>` no `Project`/`ProjectTask`.
- **Templates editáveis pela equipe.** Hoje `PRODUCT_TEMPLATES` é hardcoded em `server/src/domain/constants.js` — virar CRUD na UI.
- **Múltiplos responsáveis** por task (hoje `ownerId` único → `ownerIds: string[]`).
- **Tags/labels** livres para corte transversal (ex.: "urgente", "bug", "melhoria").

**Substitui do ClickUp:** custom fields, templates, multiple assignees, tags.

---

## Fase 3 — Dependências e automações (~3–4 semanas)

Onde o painel deixa de ser cadastro e vira motor.

- **Dependências entre fases/tasks** ("Go live" bloqueada até "Homologação cliente" aprovada). `deriveRisk` já olha fases bloqueadas — formalizar a relação.
- **Motor de automações** (gatilho → condição → ação) em `ops.js`:
  - fase vira `aguardando_cliente` → notifica e-mails do cliente
  - `dueDate` passou → risco sobe + ping no CS
  - charge aberta há N dias sem resposta → escalonar prioridade
- **SLA por charge** com lado responsável (cliente/Nairuz/terceiro — já modelado).

**Substitui do ClickUp:** Dependencies, Automations, recurring reminders.

---

## Fase 4 — Gestão e visibilidade (lado Gestor de Projetos, ~2–3 semanas)

O que diretoria e CS querem ver — e que normalmente exige dashboards manuais no ClickUp.

- **Dashboard de portfólio:** projetos em risco, planejado vs. realizado por cliente, **gargalo por fase** (qual etapa mais atrasa na média entre projetos — ouro pra melhorar o processo).
- **Capacity / workload:** somar horas estimadas por pessoa (`owners` + `timeEntries`) vs. disponível.
- **Health score** combinando prazo + risco + engajamento do cliente (XP da gamificação) + horas consumidas.
- **Margem por projeto:** horas realizadas × custo/hora vs. valor contratado.
- **Relatório semanal automático** (cliente e diretoria) — agendável.

**Substitui do ClickUp:** Dashboards, Workload, time-report widgets.

---

## Fase 5 — Colaboração e extensibilidade (~3–4 semanas)

- **Docs/wiki por projeto** (briefings, decisões técnicas) — hoje só há `notes` solto.
- **Inbox de menções** (já existe `useMentionableUsers`; falta a caixa e resolução de thread).
- **Notificações multicanal:** sino (existe) + e-mail + WhatsApp (vocês já vivem no WhatsApp pelo upsell).
- **API pública + webhooks** pra integrar com ERP/VTEX dos clientes.

**Substitui do ClickUp:** Docs, comment inbox, integrations, API.

---

## Fase 6 — IA (diferencial, contínuo)

- **Resumo do projeto em 1 parágrafo** pro CS antes da call.
- **Próxima ação sugerida** preenchendo o campo `nextAction` (já existe).
- **Detector de risco** lendo comentários ("cliente parece insatisfeito na thread X").
- **Geração de checklist** a partir do briefing.

**Substitui do ClickUp:** ClickUp Brain.

---

## O que NÃO copiar do ClickUp (escopo consciente)

- Multi-tenant / workspaces de terceiros — só faz sentido se virar produto (decisão futura).
- Statuses 100% configuráveis por espaço — o enum vertical de vocês é uma vantagem; manter.
- Mind maps, whiteboards, formulários genéricos — baixo uso, alto custo.

---

## Sequência recomendada e marco de corte

Fase 0 → 1 → 3 → 4 destravam ~80% dos motivos de abrir o ClickUp. Sugestão de **marco de corte**:
ao fim da Fase 4, rodar 2 semanas em paralelo (painel + ClickUp), medir o que ainda só existe no ClickUp,
e só então cancelar a assinatura. Fases 2, 5 e 6 seguem depois, já sem pagar ClickUp.

| Fase | Foco | Esforço | Destrava cancelamento? |
|---|---|---|---|
| 0 | Fundação (storage, e-mail, audit, testes) | 1–2 sem | Pré-requisito |
| 1 | Views (Kanban/Gantt/Calendar/Table) | 3–4 sem | **Sim** |
| 2 | Custom fields, templates, tags | 3–4 sem | Parcial |
| 3 | Dependências + automações | 3–4 sem | **Sim** |
| 4 | Dashboards, workload, margem | 2–3 sem | **Sim** |
| 5 | Docs, menções, API | 3–4 sem | Não |
| 6 | IA | Contínuo | Não |
