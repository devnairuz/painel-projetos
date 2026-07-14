# Reformulação — o que é Formulário, o que é Painel, e a ponte de IA

> Lista de melhorias dividida por **onde cada coisa vive**. Princípio: o
> **Formulário coleta** o insumo do cliente, o **Painel cobra e executa**, e a
> **IA é a ponte** que transforma um no outro. Portal do cliente: **fora de
> escopo agora**.

---

## 1. A arquitetura da reformulação (3 camadas)

```
[Google Form / Briefing]  →  [IA / Naira]  →  [Painel: projeto + Etapa 0]
      COLETA                    PONTE                COBRA / EXECUTA
```

- **Formulário:** onde o cliente responde. Melhorias aqui = campos, textos de
  ajuda, validações. Não dependem do código do painel.
- **IA (ponte):** lê o briefing e cria o corpo do projeto via API do painel.
- **Painel:** onde a equipe acompanha. Melhorias aqui = Etapa 0, travas, gate,
  follow-up. Já tem o motor (gate + Kanban) pronto.

---

## 2. Intrínseco do FORMULÁRIO (não depende do painel)

| Melhoria | Detalhe |
|----------|---------|
| Explicar termos p/ cliente leigo | Ex.: "Chamada (CTA)" → cliente respondeu "não entendi". Adicionar descrição em cada campo técnico. |
| Campo de domínio + disponibilidade | Perguntar se já possui domínio e qual; se não, sinalizar necessidade de contratação **no início**. |
| Acessos (host/DNS, admin, hospedagem) | Pedir login/painel (Registro.br, Cloudflare, GoDaddy…) já no briefing. |
| Upload da planilha de frete (modelo VTEX) | Anexar no próprio form; deixar explícito que é o 1º insumo. |
| Chaves/gateway + regras de pagamento | Campos para parcelamento, juros, antifraude. |
| ERP utilizado | Campo obrigatório antes do dev. |
| Redes sociais, textos institucionais, rodapé (CNPJ, e-mail, horário, telefones) | Campos estruturados; avisar que LOREM não gera revisão de layout. |
| Scripts GTM / GA4 | Campos para colar. |
| Validações e obrigatoriedade | Marcar quais respostas travam o avanço; deixar clara a urgência de cada insumo. |

> Estes itens **alimentam** a Etapa 0 do painel — são o "de onde vem" o dado.

---

## 3. Montável via PAINEL (checklist / gate)

| Melhoria | Estado | Ref |
|----------|--------|-----|
| Etapa 0 — Pré-requisitos do cliente, com travas 🔴🟡🟢 | a fazer | `spec-definition-of-ready.md` §4 |
| Item de template vira objeto (trava/dono/evidência) | a fazer (P0) | R1 |
| Gate travando a esteira | **já existe** (`evaluateGate`) | — |
| Follow-up / "cobrar cliente" | a fazer (P1) | R4 |
| Dono do bloqueio (cliente/Nairuz) + Pendências | a fazer (P1) | R5 |
| Evidência trava conclusão | a fazer (P0) | R3 |
| Checklist de go-live (Sandbox→Produção, aprovação, estoque) | a fazer (P1) | R6 |
| Handoff UX→Dev (checklist **interna**) | depois | balde 3 |

---

## 4. A ponte de IA — Form → corpo do projeto no painel

**Viável hoje.** A API do painel já suporta a construção programática:

- `POST /projects` — cria o projeto (org + produto + template).
- `POST /:id/phases` — adiciona fase.
- `POST /:id/phases/:phaseId/items` — adiciona item de checklist.
- `PATCH /:id/phases/:phaseId/items/:itemId` — ajusta item (trava, dono…).

**Fluxo proposto:**
1. Cliente responde o Google Form.
2. Naira (orquestrador) recebe a resposta (webhook do Forms é melhor que PDF).
3. IA mapeia respostas → JSON do projeto (fases + itens com trava/dono).
4. Naira chama a API do painel e o projeto nasce com a Etapa 0 já preenchida.

**Implementado no backend:** a automação não chama o `createProject` público
diretamente. Ela cria uma importação idempotente, guarda o rascunho, exige
revisão humana e então usa uma operação interna que aceita fases sanitizadas em
uma única criação. O cadastro manual continua usando o template padrão.

**Onde a Naira entra:** ela é a camada 2 (a ponte). O painel agora possui um
adaptador HTTP para PDF e uma entrada máquina-a-máquina escopada para respostas
de Google Forms. Falta fornecer o contrato privado da Naira (URL, autenticação,
request/response e política de retenção) para ativar produção. Consulte
`docs/integracao-naira.md`.

---

## 5. Nem formulário, nem painel — engenharia (fica registrado)

Temas base VTEX/Wake/Mageshop, reaproveitamento de componentes, Design System,
padronização entre projetos. **Não se resolve com formulário nem checklist** —
é investimento no processo de dev. Conversa à parte.

---

## 6. Ordem sugerida

1. **Formulário primeiro** (você pediu): revisar campos + textos de ajuda +
   validações da §2. É o funil de entrada; sem ele, o painel recebe lixo.
2. **Painel: R1 + Etapa 0** (§3) — usa o motor de gate que já existe.
3. **Ponte de IA** (§4) — depois que Form e Etapa 0 estão estáveis, conectar Naira.
