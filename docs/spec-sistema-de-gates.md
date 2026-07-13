# Spec (teoria + amostra) — Evolução do Sistema de Gates

> Documento **conceitual**. Não é ordem de implementação — é o modelo teórico do
> que o gate pode virar, com uma amostra trabalhada (Rainha dos Gabinetes) pra
> discutir escopo antes de codar. Segue o vocabulário do domínio atual
> (`TravaLevel`, `BoardStatus`, `evaluateGate`).

---

## 1. Onde estamos (baseline)

Hoje o gate é um **duplo semáforo derivado do checklist** (`src/utils/gate.ts`):

- Cada `ChecklistItem` tem um `travaLevel`:
  - 🔴 `trava_inicio` — bloqueia a entrada na esteira (precisa estar 100% antes de desenvolver).
  - 🟡 `trava_golive` — permite desenvolver, mas segura a publicação.
  - 🟢 `placeholder` — não bloqueia; segue com conteúdo provisório.
- `evaluateGate(phases)` varre todos os itens `!done` e devolve:
  - `liberadoParaEsteira` = não há 🔴 pendente.
  - `liberadoParaPublicar` = não há 🔴 nem 🟡 pendente.

**Limitações do modelo atual** (o que a evolução ataca):

1. São só **2 portões implícitos** (esteira, publicação) para uma jornada de 5+ estágios.
2. O gate é **puramente mecânico**: "todos os itens marcados = liberado". Não existe um **aprovador humano** que dá o "Go" — quem marca o checkbox libera.
3. Não há **evidência** exigida (link do layout aprovado, print, aceite do cliente).
4. Não distingue **de quem é o bloqueio** (cliente / Nairuz / terceiro), embora o board já tenha a coluna `responsabilidade_cliente`.
5. Sem **prazo por trava** → não dá pra dizer "esse gate está atrasado".

---

## 2. A ideia central: de 2 semáforos para um Stage-Gate explícito

Transformar os 2 booleanos em uma **sequência de portões formais** (modelo
clássico *phase-gate*), um por bloco de jornada. O semáforo 🔴🟡🟢 deixa de ser
"o gate" e passa a ser a **severidade de cada critério dentro de um gate**.

Fluxo proposto para uma implantação de e-commerce:

| Gate | Nome | Pergunta que responde | Aprovador (gatekeeper) |
|------|------|----------------------|------------------------|
| **G0** | Definition of Ready | "Temos tudo pra começar a desenvolver?" | Tech Lead |
| **G1** | Design aprovado | "O cliente aprovou o layout/escopo?" | Cliente |
| **G2** | Dev concluído | "Está pronto pra homologar/QA?" | Tech Lead |
| **G3** | Go-live | "Pode publicar?" | CS + Cliente |
| **G4** | Encerramento | "Fechamos e medimos satisfação?" | CS |

Cada gate tem: **critérios de entrada** (o que libera começar o estágio),
**critérios de saída** (os itens de checklist, cada um com seu `travaLevel`),
um **aprovador**, e uma **decisão**.

Princípio mantido: **não duplicar dados**. O gate continua sendo uma *visão*
sobre os `ChecklistItem`s — igual ao Kanban já faz. O que muda é agrupar por
gate e adicionar a camada de decisão/aprovação por cima.

---

## 3. Camadas novas do modelo (teoria)

### 3.1 Decisão do gate (Go / Hold / Recycle / Kill)

Hoje o gate é um booleano. Proposto: cada gate tem um **status próprio**, que
soma a parte mecânica (itens) com a parte humana (aprovação):

- `bloqueado` — gate anterior ainda aberto (não é nem avaliável).
- `pendente` — há itens 🔴/🟡 em aberto.
- `pronto_p_decisao` — todos os itens concluídos, aguardando o aprovador.
- `aprovado` (**Go**) — aprovador liberou; próximo gate abre.
- `retido` (**Hold**) — itens ok, mas o aprovador segurou (ex.: cliente quer revisar).
- `retrabalho` (**Recycle**) — reprovado; volta pro estágio anterior.

Isso introduz o passo que falta hoje: **"tudo marcado" ≠ "aprovado"**. Um humano
responsável dá o Go.

### 3.2 Dono do bloqueio (cliente / Nairuz / terceiro)

Cada item de trava herda um **lado responsável** (reaproveita o enum
`ProjectChargeSide` que já existe). O gate passa a dizer não só *quantos*
bloqueios, mas *de quem*: "G0 bloqueado — 3 itens 🔴, todos do **cliente**".
Isso alimenta direto a Pendências e o Portal do Cliente.

### 3.3 Evidência por critério

Itens 🔴 (e opcionalmente 🟡) podem exigir uma **evidência** para serem dados
como concluídos: um link, anexo ou aceite registrado. Sem evidência, o item não
conta como `done` para efeito de gate. Isso endurece o Definition of Ready.

### 3.4 Prazo e SLA do gate

Cada trava pode ter `dueDate`. O gate deriva um `DeadlineConfidence`
(`no_prazo` / `atencao` / `atrasado`) — enum que **já existe** no domínio — pra
o Dashboard destacar gates em risco.

### 3.5 Como isso mapeia no domínio atual (sem quebrar nada)

Campos **opcionais** — dados/seed atuais continuam válidos:

```ts
// ChecklistItem (conceitual — não implementar ainda)
travaLevel?: TravaLevel      // já existe
lado?: ProjectChargeSide     // cliente | nairuz | terceiro  (já existe o enum)
gateId?: string              // a que gate pertence; se ausente, deriva da fase
evidencia?: { tipo: 'link' | 'anexo' | 'aceite'; url?: string; em?: string }
dueDate?: string             // ISO; alimenta DeadlineConfidence

// Novo: decisão humana por gate
interface GateDecision {
  gateId: string
  status: 'bloqueado' | 'pendente' | 'pronto_p_decisao' | 'aprovado' | 'retido' | 'retrabalho'
  aprovadorId?: string
  decididoEm?: string
  observacao?: string
}
```

`evaluateGate` evolui de "2 booleanos globais" para "**status por gate**",
somando itens pendentes + a `GateDecision` do aprovador.

---

## 4. Amostra trabalhada — Rainha dos Gabinetes (G0: Definition of Ready)

Exemplo de como um gate ficaria descrito. Foco no G0 (o portão de entrada na
esteira), que é o mais crítico.

**Critério de entrada do G0:** contrato assinado + projeto criado no painel.
**Aprovador:** Tech Lead. **Critério de saída:** nenhum item 🔴 pendente.

| Item (critério de saída) | Trava | Lado | Evidência exigida | Status |
|--------------------------|-------|------|-------------------|--------|
| Acesso à plataforma VTEX liberado | 🔴 | cliente | Login validado | ✅ done |
| Meio de pagamento homologado (gateway) | 🔴 | cliente | Print transação teste | ⏳ aberto |
| Domínio + DNS sob controle | 🔴 | cliente | Acesso ao registrador | ⏳ aberto |
| Identidade visual / manual de marca | 🟡 | cliente | Link do arquivo | ✅ done |
| Catálogo de produtos (planilha) | 🟡 | cliente | Planilha recebida | ⏳ aberto |
| Textos institucionais (Sobre, Trocas) | 🟢 | nairuz | — (placeholder ok) | ⏳ aberto |

**Avaliação resultante do gate:**

- 🔴 pendentes: **2** (pagamento, domínio) → `liberadoParaEsteira = false`.
- Dono do bloqueio: **100% cliente** → cai em Pendências do cliente.
- 🟡 pendentes: 1 (catálogo) → seguraria o go-live, mas não a esteira.
- 🟢 pendente: não bloqueia.
- **Decisão do gate:** `pendente` — nem chega a `pronto_p_decisao`, porque há 🔴 abertos.

Leitura pro time: *"Rainha dos Gabinetes está travada no G0 por 2 itens vermelhos,
ambos do cliente (pagamento e domínio). Assim que resolverem, o Tech Lead dá o Go
e o projeto entra na esteira. O catálogo (amarelo) pode correr em paralelo, mas
trava a publicação lá no G3."*

---

## 5. Escopo sugerido em fases (se/quando for implementar)

**P0 — Gates explícitos + decisão humana.** Agrupar itens por gate e adicionar o
status por gate com aprovação (`Go`/`Hold`). É o salto de valor: "marcado" deixa
de significar "liberado".

**P1 — Dono do bloqueio + Pendências.** Herdar `lado` nos itens de trava e
cruzar com a página de Pendências / Portal do Cliente.

**P2 — Evidência e SLA.** Exigir evidência em itens 🔴 e prazo por gate com
sinal de atraso no Dashboard.

**Não-escopo (por ora):** automação de transição entre gates, notificação
automática ao aprovador, histórico/auditoria de decisões. Ficam no "parking lot".

---

## 6. Perguntas em aberto (pra você direcionar)

1. **Quantos gates** fazem sentido pra realidade da Nairuz — os 5 acima, ou um
   corte mais enxuto (só G0 e G3, formalizando o que já existe)?
2. **Aprovação humana** é desejável, ou o gate mecânico atual já resolve e o que
   falta é só evidência/prazo?
3. Os gates devem aparecer **no Portal do Cliente** (ele vê "a bola está com
   você"), ou é visão só interna?
4. Vale um **gate por tipo de produto** (`ecommerce` vs `landing_page` têm gates
   diferentes), reaproveitando o conceito de template de etapas?
