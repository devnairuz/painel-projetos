# Spec — Definition of Ready + Triagem das dores do time

> Escopo **implementável e enxuto** (cabe em ~6h/semana). Substitui o rumo do
> Stage-Gate completo (ver `spec-sistema-de-gates.md`, pano de fundo). Foco na
> dor real e recorrente: **projetos entram na esteira sem os insumos do
> cliente**, e isso só aparece no QA/go-live.
>
> Atualizado com as dores do time (5 fontes). **Ideia-chave:** nem toda dor é
> item de checklist — ver a triagem na §8.

---

## 1. Problema

Hoje a checklist de e-commerce (`src/constants/templates.ts`) coloca frete e
pagamento como fases do **meio** do projeto, e cada item é só um texto — **sem
nível de trava, sem dono, sem evidência**. Não há uma **Etapa 0 (Definition of
Ready)** que cobre os insumos do cliente na largada. O time levantou ~30 dores;
a maior parte das que travam a esteira é **insumo do cliente que chega tarde**.

**Custo:** retrabalho no QA, go-live empurrado, design refeito com LOREM, e a
Nairuz absorvendo atraso que é responsabilidade do cliente.

---

## 2. Objetivos

1. Toda implantação de e-commerce nasce com uma **Etapa 0 — Pré-requisitos do
   cliente**, no topo do template, com os insumos críticos agrupados.
2. Cada item carrega **trava** (🔴 bloqueia esteira / 🟡 segura go-live / 🟢
   provisório), **dono** (cliente/Nairuz/terceiro) e, quando aplicável,
   **evidência** exigida para concluir.
3. O gate atual (`evaluateGate`) reflete esses itens sem mudança de regra.
4. Itens críticos ganham **sinal de follow-up** para o CS cobrar cedo.

**Sucesso:** projetos deixam de entrar em Design/Dev com item 🔴 pendente; a
planilha de frete chega antes do design; nada de texto institucional / domínio
definido pela primeira vez no QA.

---

## 3. Não-objetivos (por ora)

- Aprovação humana formal (Go/Hold/Recycle/Kill) — pesado demais agora.
- Automação de follow-up / e-mail ao cliente — o CS cobra manual; o painel sinaliza.
- Gate multi-estágio (G1..G4) — fica no `spec-sistema-de-gates.md`.
- Resolver dores de engenharia (temas base, Design System) — **não é checklist**, ver §8.

---

## 4. Etapa 0 — Pré-requisitos do cliente (o coração da entrega)

Nova fase no topo do template `ecommerce`. Itens agrupados por tema. Trava
sugerida entre parênteses — os 🔴 impedem entrar em Design/Dev.

**A. Comercial e prazo**
| Item | Trava | Dono | Evidência |
|------|-------|------|-----------|
| Escopo vendido documentado | 🔴 | nairuz | — |
| Horas de Dev e prazo vendidos (para projetar entrega) | 🔴 | nairuz | — |

**B. Domínio e acessos**
| Item | Trava | Dono | Evidência |
|------|-------|------|-----------|
| Domínio **decidido e disponível** (não trocar perto da entrega) | 🔴 | cliente | — |
| Acesso ao painel de host/DNS (Registro.br, Cloudflare, GoDaddy, Locaweb…) | 🔴 | cliente | Login validado |
| Acesso ao painel admin da plataforma + hospedagem | 🔴 | cliente | Login validado |
| URL oficial do site | 🟡 | cliente | — |

**C. Pagamento**
| Item | Trava | Dono | Evidência |
|------|-------|------|-----------|
| Gateway contratado + regras (parcelamento, juros, antifraude) | 🔴 | cliente | — |
| Gateway **validado pela Nairuz** (adequação à plataforma) | 🔴 | nairuz | Registro do teste |

**D. Logística e frete**
| Item | Trava | Dono | Evidência |
|------|-------|------|-----------|
| **Planilha de frete no modelo VTEX** (completa) — ⭐ 1º pedido | 🔴 | cliente | Planilha recebida |
| Contrato(s) de transportadora fechados ou em vias finais *(ver Q2)* | 🔴/🟡 | cliente | Confirmação escrita |
| Logística: doca e instruções dos pontos de retirada | 🟡 | cliente | — |

**E. Integração**
| Item | Trava | Dono | Evidência |
|------|-------|------|-----------|
| ERP definido **antes do desenvolvimento** | 🔴 | cliente | — |

**F. Conteúdo (o design depende — cobrar cedo mesmo sendo 🟡)**
| Item | Trava | Dono | Evidência |
|------|-------|------|-----------|
| Textos institucionais definidos (**não LOREM** — LOREM não gera revisão de layout) | 🟡 | cliente | Link/arquivo |
| Links oficiais das redes sociais | 🟡 | cliente | — |
| Dados do rodapé: CNPJ, e-mail, horário de atendimento, telefones | 🟡 | cliente | — |

**G. Marketing**
| Item | Trava | Dono | Evidência |
|------|-------|------|-----------|
| Scripts GTM e GA4 | 🟡 | cliente | — |

Os itens de frete/pagamento que hoje vivem nas fases "Pagamentos"/"Frete e
logística" **continuam** para a execução técnica; a Etapa 0 é sobre **receber o
insumo do cliente**, não executar.

---

## 5. Requisitos

### P0 — Must have

**R1. Item de template deixa de ser `string` e vira objeto.**
`checklist: string[]` → `checklist: TemplateItem[]`, com
`TemplateItem = { label; travaLevel?; lado?; evidencia?; followUp?; grupo? }`.
Campos opcionais → itens antigos seguem válidos.
- *Critério:* ao semear, o `ChecklistItem` herda `travaLevel`, `lado` e flags.
- *Dependência:* semeadura em `src/services/projectsService.ts` **e** seed do
  backend leem o novo formato. UI (PhaseCard/Kanban) não muda — já lê `travaLevel`.

**R2. Etapa 0 semeada no template `ecommerce`** com os itens da §4.
- *Critério:* novo projeto e-commerce nasce com "Pré-requisitos do cliente" em 1º.
- *Critério (gate):* com 🔴 pendentes, `evaluateGate` retorna
  `liberadoParaEsteira = false` e o `GateBanner` os lista.

**R3. Evidência trava a conclusão** de itens `evidencia:true` (reaproveita
anexo/comentário existente no `ChecklistItem`; não criar upload novo).

### P1 — Should have

**R4. Follow-up.** Itens `followUp:true` recebem selo "Cobrar cliente"; a planilha
de frete (⭐) aparece como 1º pedido.
**R5. Dono visível.** Badge do `lado` no item, cruzando com Pendências.
**R6. Checklist de go-live (G3).** Mini-lista na fase Go-live: troca
Sandbox→Produção 🔴, aprovação final do layout 🔴, estoque preenchido 🟡.

### P2 — Future

**R7.** Prazo/SLA por item (usa `DeadlineConfidence`, já no domínio).
**R8.** Etapa 0 para outros produtos (landing, dev próprio).
**R9.** Definition of Ready **interno** (Handoff UX→Dev) — ver §8, balde 3.

---

## 6. Métricas de sucesso

- **Cedo (semanas):** % de projetos que entram em Design/Dev sem 🔴 pendente
  (meta: 100%); dias entre liberação do projeto e recebimento da planilha de frete.
- **Tarde (meses):** redução de retrabalho de layout por texto/LOREM; menos
  go-lives empurrados por credencial/gateway.

---

## 7. Perguntas em aberto

1. **[time]** Falta algo na §4? Cada dor nova entra como linha com trava/dono.
2. **[produto]** Transportadora "em vias finais": 🔴 (rigoroso) ou 🟡 (permite
   correr)? "Em vias finais" ≠ 100% — definir o rigor.
3. **[eng]** Semeadura roda em memória **e** Mongo — confirmar que os dois repos
   leem o novo `TemplateItem` (`src/types` + services juntos).
4. **[produto]** Migração vs. projeto novo: a Etapa 0 é igual, ou a migração pula
   itens herdados (textos institucionais, domínio já existente)?

---

## 8. Triagem completa das dores do time (o que É e o que NÃO É checklist)

As ~30 dores levantadas caem em 5 baldes. Só os baldes 1 e 2 são esta spec.

**Balde 1 — Insumos do cliente → Etapa 0 (§4).** ✅ nesta spec.
Domínio/acessos, gateway+regras, planilha de frete, ERP, redes sociais, textos
institucionais, CNPJ/rodapé, GTM/GA4, escopo/horas vendidas.

**Balde 2 — Go-live (G3) → R6.** ✅ nesta spec.
Troca Sandbox→Produção, aprovação final de layout, estoque preenchido.

**Balde 3 — Definition of Ready *interno* (Handoff UX→Dev).** ⏭️ vira spec própria.
Reunião de handoff (desktop+mobile anotados) antes do kickoff; doc funcional
(fluxos, regras condicionais, comportamento de formulários, integrações real vs.
mockado, casos de borda); reunião de dev intermediária em projetos complexos.
É uma checklist da **Nairuz**, não do cliente — modelável como uma Etapa 0
interna, mas é outra entrega.

**Balde 4 — Investimento de engenharia (NÃO é checklist).** 🚧 iniciativa à parte.
Temas base sólidos VTEX/Wake/Mageshop, reaproveitamento de componentes, retrabalho
de layout, padronização entre projetos, **Design System**. Provavelmente onde
mais se gasta tempo hoje — não se resolve com checkbox. Merece conversa própria de
roadmap técnico.

**Balde 5 — Ops/integrações (técnico, fora do painel).** ❌ não é gestão de projeto.
ERP↔plataforma, sync de estoque, pedidos que não chegam ao ERP, instabilidade de
gateway, integrações pouco documentadas, ataques de bots. São questões de
arquitetura/monitoramento.

**Transversal — Briefing para cliente leigo.** Melhorar o **formulário de
briefing** com explicações dos termos (ex.: "Chamada (CTA)" → cliente respondeu
"não entendi"). Não é o painel: é a cópia/UX do briefing. Fica registrado aqui
para não se perder.

**Transversal — Mudança de escopo durante o dev.** Disciplina de *congelar
escopo* após aprovação de design (o G1 do `spec-sistema-de-gates.md`). Processo,
não checklist de largada.
