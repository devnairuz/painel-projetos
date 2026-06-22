# Apontamento de horas no painel (estilo ClickUp) — Design

**Data:** 2026-06-22
**Status:** Aprovado para virar plano de implementação
**Abordagem escolhida:** A — MVP fiel, cronômetro persistido no servidor

## Contexto

Hoje o time loga horas dentro do ClickUp. A ideia é registrar essas horas no
próprio painel. O código já tem a base: o tipo `TimeEntry`, a lista
`Project.timeEntries`, persistência no Mongo e a rota `POST /:id/time-entries`
(com recálculo de `tracking.usedHours`). Falta a interface, o vínculo com
tarefa/subtarefa, o cronômetro e poder editar/excluir.

Este design **estende** o que existe — não reescreve.

## Objetivo

Permitir que o usuário interno aponte horas trabalhadas, por
**tarefa/subtarefa**, somando no **projeto**, atribuído **por usuário**, com
**cronômetro + lançamento manual** e **histórico editável** — tudo **dentro da
página do projeto**.

## Não-objetivos (fora de escopo deste teste)

- Timesheet pessoal ("minhas horas em todos os projetos").
- Relatório gerencial / export CSV de horas.
- Widget de cronômetro global fixo no topo.
- Campo "faturável" (billable), aprovação de horas, integração de volta ao ClickUp.
- Endurecimento de auth das rotas de mutação (segue o padrão atual do projeto).

Todos foram conscientemente adiados; o modelo de dados não impede adicioná-los depois.

## Decisões de produto (confirmadas)

| Tema | Decisão |
|------|---------|
| Granularidade | Por tarefa/subtarefa; soma rola pro projeto |
| Atribuição | Por usuário (usuário interno logado) |
| Registro | Cronômetro **e** manual |
| Cronômetro | 1 timer ativo por usuário, persistido no servidor (sobrevive a reload) |
| Onde ver | Só dentro do projeto (total, previsto×realizado, por usuário, por tarefa, histórico) |
| UI de apontar | Card central "Horas" **+** play/stop inline em cada subtarefa e tarefa |
| Permissão | Cada um aponta/edita/exclui o **seu** tempo; todos **veem** o de todos |
| Duração | Aceita `1h30` ou decimal `1.5`; guarda em decimal de horas |

## Mapeamento "tarefa / subtarefa" no domínio atual

- **Subtarefa** = `ChecklistItem` dentro de uma `Phase` (a UI já chama de
  "subtarefa" no `PhaseCard`). Vínculo: `phaseId` + `checklistItemId`.
- **Tarefa geral** = `ProjectTask` com `source !== 'checklist'`
  (`ProjectTasksCard`). Vínculo: `taskId`.
- **Avulso** = apontamento direto no projeto, sem vínculo.

A "tarefa = fase inteira" não recebe apontamento direto; o total da fase é a
soma dos apontamentos das suas subtarefas.

## Modelo de dados

### `TimeEntry` (estendido — campos novos são opcionais, sem migração)

```ts
interface TimeEntry {
  id: string
  label: string             // descrição/nota do apontamento (reaproveitado)
  hours: number             // duração em horas (decimal) — fonte de verdade
  kind: 'planejado' | 'realizado'
  ownerId?: string          // usuário que apontou (id do CompanyUser/MentionableUser)
  loggedAt: string          // ISO; quando o apontamento foi criado
  // novos (opcionais):
  phaseId?: string          // fase do vínculo (quando subtarefa)
  checklistItemId?: string  // subtarefa
  taskId?: string           // tarefa geral
  startedAt?: string        // ISO; início (quando veio do cronômetro)
  endedAt?: string          // ISO; fim (quando veio do cronômetro)
  source?: 'manual' | 'timer'
}
```

Invariante: no máximo **um** vínculo preenchido — (`phaseId`+`checklistItemId`)
**ou** `taskId` **ou** nenhum. `ownerId` e `id` do usuário logado compartilham o
mesmo espaço (mesma coleção de usuários), então a quebra por usuário resolve o
nome via lista de mentionable users.

Só apontamentos `kind === 'realizado'` entram nas somas (mantém o comportamento
atual de `usedHours`).

### `RunningTimer` (novo — 1 por usuário)

```ts
interface RunningTimer {
  userId: string            // chave única
  projectId: string
  phaseId?: string
  checklistItemId?: string
  taskId?: string
  label?: string            // nota digitada ao iniciar (opcional)
  startedAt: string         // ISO
}
```

Persistido no servidor. Iniciar = upsert por `userId`. Se já houver timer
rodando para aquele usuário, **para o anterior** (cria o `TimeEntry`) antes de
abrir o novo — comportamento "trocar de tarefa" do ClickUp.

## Backend

### Modelos / persistência
- Novo model Mongoose `RunningTimer` (`server/src/models/RunningTimer.js`),
  `userId` único e indexado.
- `repos` (memory + mongo) ganham: `getRunningTimer(userId)`,
  `setRunningTimer(timer)`, `clearRunningTimer(userId)`. No `memoryRepo`, um
  `Map` por `userId`.

### Domínio (`server/src/domain/ops.js`)
- `addTimeEntry(project, input)` — estender para aceitar
  `phaseId/checklistItemId/taskId/label/hours/kind/ownerId/startedAt/endedAt/source`;
  gerar `id` e `loggedAt`; recalcular `tracking.usedHours`.
- `updateTimeEntry(project, entryId, patch)` — editar campos editáveis
  (`hours`, `label`, `loggedAt`, vínculo); recalcular `usedHours`.
- `removeTimeEntry(project, entryId)` — remover; recalcular `usedHours`.

São funções puras (recebem o projeto, devolvem o projeto novo) — seguem o
padrão de `domain/ops.js`.

### Serviço (`server/src/services/projectService.js`)
- `addTimeEntry`, `updateTimeEntry`, `removeTimeEntry` — carregam o projeto,
  aplicam a op pura, salvam.
- Timer: `startTimer(input)`, `stopTimer(userId)`, `getCurrentTimer(userId)`.
  - `startTimer`: se houver timer atual do usuário, faz `stopTimer` primeiro;
    grava o novo `RunningTimer`.
  - `stopTimer`: lê o `RunningTimer`; `hours = (agora - startedAt)`; chama
    `addTimeEntry` no `projectId` com `source: 'timer'`, `startedAt`, `endedAt`;
    limpa o timer; devolve `{ project, clearedTimer }`.

### Rotas
- `server/src/routes/projects.js`:
  - `POST /:id/time-entries` — **estender** o body aceito (campos novos).
  - `PATCH /:id/time-entries/:entryId` — editar.
  - `DELETE /:id/time-entries/:entryId` — excluir.
- `server/src/routes/timers.js` (novo), montado em `app.js`:
  - `POST /api/timers/start` — body `{ userId, projectId, phaseId?, checklistItemId?, taskId?, label? }`.
  - `POST /api/timers/stop` — body `{ userId }`.
  - `GET /api/timers/current?userId=...`.
- O `userId` vem do front (`useCompanyAuth().user.id`), coerente com as demais
  mutações de projeto (que hoje também não exigem auth por rota). Anotado como
  simplificação de teste.

## Frontend

### Tipos
- `src/types/index.ts`: estender `TimeEntry`; adicionar `RunningTimer`.

### Serviços
- `src/services/projectsService.ts`: estender `addTimeEntry`; adicionar
  `updateTimeEntry(id, entryId, patch)` e `removeTimeEntry(id, entryId)`
  (cada um com caminho API + fallback local, como os existentes).
- `src/services/timersService.ts` (novo): `startTimer`, `stopTimer`,
  `getCurrentTimer`.

### Utils
- `src/utils/hours.ts` (novo):
  - `parseDuration(input: string): number | null` — aceita `1h30`, `1:30`,
    `1.5`, `90m`; devolve horas decimais.
  - `formatDuration(hours: number): string` — `HH:MM` para exibição.
  - `aggregateByUser(entries)`, `aggregateByTask(entries)` — somas para a UI.
- `src/utils/projects.ts`: o recálculo de `usedHours` já existe; reusar.

### Hook
- `src/hooks/useTimer.ts` (novo): carrega o timer atual do usuário
  (`getCurrentTimer`), expõe `{ current, start, stop, elapsedLabel }`, faz o
  "tick" do contador na tela (1s) e devolve o projeto atualizado ao parar.

### Componentes
- `src/components/projects/ProjectHoursCard.tsx` (novo) — card central:
  - Resumo: total realizado, previsto×realizado (barra), quebra por usuário.
  - Apontar: seletor fase→subtarefa / tarefa geral + cronômetro (play/stop) e
    formulário manual (duração + data + nota).
  - Histórico: lista de apontamentos com editar (✏) e excluir (🗑); só o dono
    edita/exclui o seu.
- `src/components/projects/PhaseCard.tsx` — no `ChecklistItemRow`, botão
  play/stop inline + total de horas da subtarefa.
- `src/components/projects/ProjectTasksCard.tsx` — em cada tarefa, play/stop
  inline + total de horas da tarefa.
- `src/pages/ProjetoDetalhePage.tsx` — montar `ProjectHoursCard` na coluna
  lateral (perto do `ProjectTrackingCard`).

## Regras de negócio e edge cases

- **1 timer por usuário:** iniciar outro fecha o anterior (vira apontamento).
- **Parada sem início:** `stopTimer` sem `RunningTimer` → no-op idempotente.
- **Duração mínima:** apontamento de timer com `< 1 min` é descartado (evita
  cliques acidentais).
- **Edição/Exclusão:** permitidas só para `ownerId === usuário logado`. A UI
  esconde ✏/🗑 dos apontamentos de terceiros; o backend também valida.
- **Entrada manual inválida:** `parseDuration` retorna `null` → erro inline, não
  envia.
- **Recálculo:** qualquer add/update/remove recalcula `tracking.usedHours`.

## Testes (TDD)

- `parseDuration` / `formatDuration` — tabela de casos (`1h30`, `1:30`, `1.5`,
  `90m`, inválidos).
- `aggregateByUser` / `aggregateByTask` — somas e agrupamento corretos; ignora
  `planejado`.
- `domain/ops`: `addTimeEntry` (com vínculo), `updateTimeEntry`,
  `removeTimeEntry` — recálculo de `usedHours`.
- `stopTimer` — calcula horas a partir de `startedAt`/`endedAt`; descarta `<1min`.

## Arquivos a criar / alterar (resumo)

**Criar:** `server/src/models/RunningTimer.js`, `server/src/routes/timers.js`,
`src/services/timersService.ts`, `src/hooks/useTimer.ts`, `src/utils/hours.ts`,
`src/components/projects/ProjectHoursCard.tsx`.

**Alterar:** `server/src/domain/ops.js`, `server/src/services/projectService.js`,
`server/src/routes/projects.js`, `server/src/app.js`, `server/src/repos/*`,
`src/types/index.ts`, `src/services/projectsService.ts`,
`src/components/projects/PhaseCard.tsx`,
`src/components/projects/ProjectTasksCard.tsx`,
`src/pages/ProjetoDetalhePage.tsx`.
