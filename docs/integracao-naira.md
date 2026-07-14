# Integração da Naira com o Rastreio de Projetos

## Estado atual

O fluxo de automação usa dois documentos com papéis diferentes:

```text
ESCOPO + BRIEFING → registro idempotente → uploads privados
                  → análise comparativa pela Naira
                  → rascunho sanitizado → revisão humana → projeto

JSON copiado da Naira → validação e normalização
                       → revisão humana → projeto
```

- **ESCOPO** é a fonte contratual de entregas, exclusões, horas e prazos.
- **BRIEFING** detalha a operação, os insumos, as regras de negócio e as
  referências das entregas contratadas.

O BRIEFING nunca expande automaticamente o ESCOPO. Divergências e solicitações
existentes apenas no BRIEFING viram avisos e pendências para revisão comercial.
Gates só podem ser derivados de uma entrega contratada.

Em trabalhos iniciados pelo painel, a existência de ESCOPO é definida somente
por `documentos[]`. Uma fonte devolvida pelo provedor não pode inventar um tipo
que não foi declarado: ela é descartada, suas referências são removidas e a
revisão recebe um aviso. Em entradas JSON manual ou M2M, que não possuem o upload
declarativo, uma fonte normalizada com `tipoDocumento: "escopo"` continua sendo a
evidência de que o ESCOPO foi analisado.

O contrato vigente da integração é `2026-07-14`.

Em desenvolvimento, `NAIRA_MODE=mock` executa um simulador identificado na
interface. Ele testa persistência, estados, revisão e criação sem afirmar que a
Naira real respondeu. Quando recebe apenas BRIEFING, o simulador cria somente uma
etapa de descoberta, sem entregas contratuais ou gates genéricos. Em produção, o
padrão é `disabled`.

O contrato privado da Naira ainda precisa ser fornecido pela empresa. Nunca
coloque chaves em variáveis `VITE_*`, commits, mensagens ou screenshots.

## Precedência da análise

O provedor deve aplicar esta ordem:

1. Regras de segurança e contrato JSON da integração.
2. ESCOPO para determinar entregas, exclusões, horas e prazos contratados.
3. BRIEFING para detalhar a execução do que já está contratado.
4. Inferências operacionais fortes, sem criar entrega ou esforço adicional.

Se os documentos divergirem, o rascunho preserva o valor explícito do ESCOPO e
registra as duas evidências. O conflito deve aparecer simultaneamente em
`campos`, `validacao.avisos` e `rascunho.pendencias`.

Se uma solicitação estiver apenas no BRIEFING, ela recebe o status
`potencial_extra`, gera aviso e pendência e não entra em fases, checklist, gates,
horas estimadas nem resumo do escopo. Uma exclusão contratual também nunca vira
tarefa ou gate.

## Modos

| Modo | Uso |
|---|---|
| `mock` | Teste local integrado. Os PDFs não saem da API do painel. |
| `http` | Envio real dos documentos para a Naira por HTTPS. Exige URL e chave. |
| `disabled` | Automação indisponível. É o padrão de produção. |

Não existe fallback silencioso de `http` para `mock`: uma falha real aparece
como falha real.

## Importação manual de JSON

Enquanto a integração privada da Naira não estiver homologada, um usuário
interno pode analisar ESCOPO e BRIEFING no agente, copiar o resultado e importar
o JSON no mesmo fluxo de revisão. Essa opção não depende de `NAIRA_MODE`, não
envia arquivos a outro provedor e não cria projeto diretamente.

```http
POST /api/project-imports/json
Authorization: Bearer <jwt-interno>
Idempotency-Key: <uuid>
Content-Type: application/json

{
  "resultado": {
    "rascunho": {},
    "campos": [],
    "fontes": [],
    "validacao": { "avisos": [] }
  }
}
```

O backend limita o tamanho da entrada, descarta propriedades desconhecidas,
remove ou bloqueia conteúdo sensível e força todos os gates humanos para
`false`. Links e pendências só entram no projeto depois de revisados. A
organização também precisa ser escolhida explicitamente no painel.

Como essa modalidade não possui `documentos[]`, horas, data e estado de Escopo
só são propagados quando ao menos uma fonte válida declara
`tipoDocumento: "escopo"`. A mera presença de campos com nomes contratuais não é
suficiente.

O prompt pronto para configurar o agente está em
[`prompt-agente-projetos-naira.md`](./prompt-agente-projetos-naira.md).

## Variáveis do servidor

```env
NAIRA_MODE=mock
NAIRA_BASE_URL=
NAIRA_API_KEY=
NAIRA_CALLBACK_URL=
NAIRA_CALLBACK_SECRET=
NAIRA_M2M_TOKEN=
NAIRA_TIMEOUT_MS=45000
NAIRA_MAX_PDF_BYTES=8388608
NAIRA_FILE_RETENTION_HOURS=24
```

- `NAIRA_BASE_URL`: URL base privada. O adaptador chama `POST {base}/imports`.
- `NAIRA_API_KEY`: enviada como `Authorization: Bearer ...` apenas pelo backend.
- `NAIRA_CALLBACK_URL`: URL pública chamada pela Naira ao terminar um trabalho
  assíncrono.
- `NAIRA_CALLBACK_SECRET`: segredo HMAC-SHA256 do callback.
- `NAIRA_M2M_TOKEN`: credencial exclusiva para a Naira enviar rascunhos
  estruturados ao painel.
- `NAIRA_MAX_PDF_BYTES`: limite aplicado separadamente a cada PDF.
- `NAIRA_FILE_RETENTION_HOURS`: retenção máxima dos PDFs temporários; os arquivos
  também são excluídos ao confirmar ou cancelar.

Em produção, importações são recusadas se a API estiver usando o repositório em
memória. Configure `MONGODB_URI`.

Na primeira inicialização desta versão, o repositório Mongo classifica blobs
legados como `briefing` e substitui o índice único antigo de `importId` pelo
índice composto `importId + tipo`. Faça backup antes do deploy e valide essa
migração em homologação; a rotina tolera duas instâncias disputando a remoção do
índice legado.

## Fluxo usado pelo painel

Todas as rotas abaixo, exceto os dois endpoints máquina-a-máquina, exigem o JWT
de um usuário interno.

### 1. Criar o trabalho com os dois documentos

```http
POST /api/project-imports
Authorization: Bearer <jwt-interno>
Idempotency-Key: <uuid>
Content-Type: application/json

{
  "documentos": [
    {
      "tipo": "escopo",
      "nomeArquivo": "ESCOPO Cliente Exemplo.pdf",
      "mimeType": "application/pdf",
      "tamanhoBytes": 245760
    },
    {
      "tipo": "briefing",
      "nomeArquivo": "BRIEFING Cliente Exemplo.pdf",
      "mimeType": "application/pdf",
      "tamanhoBytes": 524288
    }
  ]
}
```

Os únicos tipos aceitos são `escopo` e `briefing`, sem duplicação. A resposta
pública apresenta os metadados em `documentos[]`, preservando `tipo`,
`nomeOriginal`, `mimeType`, `tamanhoBytes`, `sha256`, `armazenado` e `expiraEm`
quando disponíveis. O conteúdo binário nunca é devolvido.

O formato antigo com `nomeArquivo`, `mimeType` e `tamanhoBytes` na raiz continua
aceito para compatibilidade. A propriedade pública `arquivo` também permanece
legada, mas novos consumidores devem usar `documentos[]`.

### 2. Enviar os PDFs sequencialmente

```http
PUT /api/project-imports/:id/files/escopo
Authorization: Bearer <jwt-interno>
If-Match: <versao-atual>
Content-Type: application/pdf

<bytes do ESCOPO>
```

Depois da primeira resposta, use a nova `versao` no segundo upload:

```http
PUT /api/project-imports/:id/files/briefing
Authorization: Bearer <jwt-interno>
If-Match: <nova-versao>
Content-Type: application/pdf

<bytes do BRIEFING>
```

Os uploads devem ser sequenciais porque cada gravação incrementa a versão. Uma
versão antiga retorna conflito em vez de sobrescrever o trabalho de outra pessoa.

A API confere tamanho, MIME, assinatura `%PDF-` e SHA-256 de cada documento. Os
conteúdos ficam isolados do `Project` e nunca são devolvidos pela API.

O reenvio do mesmo conteúdo é idempotente somente enquanto o blob temporário
ainda existe e seu hash corresponde aos metadados. Se o TTL já removeu um PDF de
um trabalho parcial, o backend reconcilia o estado e permite restaurar o mesmo
conteúdo com a versão atual; ele não devolve um sucesso baseado apenas no hash
antigo do trabalho.

O endpoint legado `PUT /api/project-imports/:id/file` continua disponível para
uma única entrada. Uma análise sem ESCOPO não pode transformar o BRIEFING em
contrato: o resultado deve avisar a ausência e pedir revisão humana.

### 3. Envio do par para a Naira

No modo HTTP, o painel envia `multipart/form-data` para
`POST {NAIRA_BASE_URL}/imports` com:

- `escopo`: PDF identificado como fonte contratual, quando disponível;
- `briefing`: PDF identificado como detalhamento operacional, quando disponível;
- `documentsManifest`: JSON textual com tipo, nome original, MIME, tamanho e
  `sha256` já calculado de cada documento;
- `importId`: identificador idempotente;
- `contractVersion`: sempre `2026-07-14` neste contrato;
- `callbackUrl`: quando configurada.

Quando existe somente um documento, o multipart também envia a parte `file` para
compatibilidade com provedores legados. As partes nomeadas `escopo` e `briefing`
continuam sendo a referência canônica; `file` não altera a precedência entre os
documentos.

### 4. Acompanhar e revisar

```text
GET   /api/project-imports
GET   /api/project-imports/:id
PATCH /api/project-imports/:id/draft
POST  /api/project-imports/:id/retry
POST  /api/project-imports/:id/cancel
```

Edições usam a `versao` recebida. Antes da confirmação, a pessoa revisora deve
validar, nesta ordem:

1. matriz de entregas, exclusões, horas e prazos em `campos`;
2. conflitos e potenciais extras em avisos e pendências;
3. horas e data contratual;
4. fases, itens e gates;
5. links e organização.

### 5. Confirmar

```http
POST /api/project-imports/:id/confirm
Authorization: Bearer <jwt-interno>
Idempotency-Key: <uuid>
Content-Type: application/json

{
  "versao": 7,
  "organizationId": "org-123",
  "usarFasesSugeridas": true,
  "rascunho": {}
}
```

A organização precisa existir. IDs definitivos, estados, itens concluídos e
responsáveis internos nunca são aceitos diretamente da IA. O projeto é criado
uma única vez mesmo se a confirmação for repetida.

## Contrato de saída da Naira

A resposta possui exatamente quatro propriedades de primeiro nível:
`rascunho`, `campos`, `fontes` e `validacao`.

```json
{
  "rascunho": {
    "cliente": {
      "nome": "Cliente Exemplo",
      "nomeOrganizacaoSugerida": "Cliente Exemplo"
    },
    "projeto": {
      "plataforma": "vtex",
      "tipo": "implantacao",
      "produto": "ecommerce",
      "dataGoLive": "2026-10-30",
      "horasEstimadas": 120,
      "resumoEscopo": "Implantação da nova loja limitada às entregas do ESCOPO"
    },
    "fases": [],
    "linksUteis": [],
    "pendencias": [
      {
        "idTemporario": "pendencia-extra-crm",
        "titulo": "Validar possível extra de integração com CRM",
        "descricao": "A solicitação aparece apenas no BRIEFING e não foi incluída no plano.",
        "campo": "comparacao.entregas.integracao-crm",
        "obrigatoria": true,
        "responsabilidadeCliente": false,
        "revisado": false
      }
    ]
  },
  "campos": [
    {
      "campo": "projeto.horasEstimadas",
      "rotulo": "Horas contratadas",
      "valor": 120,
      "confianca": 0.99,
      "fonteIds": ["fonte-escopo-1"]
    },
    {
      "campo": "comparacao.entregas.integracao-crm",
      "rotulo": "Integração com CRM",
      "valor": "potencial_extra",
      "confianca": 0.97,
      "fonteIds": ["fonte-briefing-1"]
    }
  ],
  "fontes": [
    {
      "id": "fonte-escopo-1",
      "tipoDocumento": "escopo",
      "nomeDocumento": "ESCOPO Cliente Exemplo.pdf",
      "pagina": 3,
      "rotulo": "Horas contratadas",
      "trecho": "Pacote de 120 horas para a implantação"
    },
    {
      "id": "fonte-briefing-1",
      "tipoDocumento": "briefing",
      "nomeDocumento": "BRIEFING Cliente Exemplo.pdf",
      "pagina": 5,
      "rotulo": "Solicitação não localizada no escopo",
      "trecho": "Integrar os leads ao CRM"
    }
  ],
  "validacao": {
    "avisos": [
      "A integração com CRM aparece somente no BRIEFING e foi tratada como potencial extra."
    ]
  }
}
```

### Matriz Escopo × Briefing

A matriz não cria uma quinta propriedade no JSON. Cada linha é serializada em
`campos` com o prefixo `comparacao.` e um destes valores:

- `contratado_confirmado`;
- `contratado_sem_detalhamento`;
- `excluido_confirmado`;
- `conflito`;
- `potencial_extra`.

Linhas de conflito ou potencial extra precisam gerar aviso e pendência. O
normalizador aceita apenas valores escalares em `campos.valor`, por isso os
detalhes ficam nas fontes, no aviso e na descrição da pendência.

### Fontes

Toda fonte deve informar:

- `id` único;
- `tipoDocumento`: `escopo` ou `briefing`;
- `nomeDocumento`: nome original recebido;
- `pagina`, quando confiável;
- `rotulo` e pequeno `trecho`, sem dados sensíveis.

Campos contratuais, horas, prazo e gates precisam referenciar ao menos uma fonte
de ESCOPO por meio de `fonteIds`. Em conflitos, devem ser referenciadas as fontes
dos dois documentos.

Para uma importação iniciada pelo painel, fontes cujo `tipoDocumento` não consta
em `documentos[]` são descartadas. Referências a fontes inexistentes ou
descartadas também são removidas de `campos` e registradas em
`validacao.avisos`.

### Evidência obrigatória dos gates

Cada item com `nivelTrava` precisa de uma linha correspondente em `campos`:

```json
{
  "campo": "gate.item-publicar-loja",
  "valor": "trava_golive",
  "fonteIds": ["fonte-escopo-1"]
}
```

O sufixo deve ser exatamente o `idTemporario` do item, o `valor` deve confirmar o
mesmo enum de `nivelTrava` e ao menos um `fonteId` deve apontar para uma fonte de
ESCOPO confiável. Sem ESCOPO declarado, ou quando essa evidência estiver ausente
ou confirmar outro nível, o backend remove `nivelTrava` e adiciona um aviso. Esta
é uma defesa de normalização; a revisão humana continua obrigatória.

### Horas e métricas derivadas

`rascunho.projeto.horasEstimadas` só é aceito como dado confiável quando estiver
explicitamente contratado no ESCOPO e acompanhado de fonte e confiança. O
provedor não pode converter valor financeiro, pontos ou duração em horas nem usar
horas existentes apenas no BRIEFING.

Não são aceitos da IA: `horasUsadas`, `progresso`, `risco`,
`liberadoParaEsteira` e `liberadoParaPublicar`. Essas métricas são recalculadas
pelo painel.

Também são aceitos os equivalentes em inglês previstos no normalizador. Campos
fora da lista permitida são descartados.

## Processamento assíncrono

Uma resposta síncrona devolve o objeto do contrato. Para processamento
assíncrono, a Naira responde `202` com `id` ou `jobId` e depois chama:

```http
POST /api/integrations/naira/callback
X-Naira-Signature: sha256=<hmac-hex-do-corpo-json-bruto>
Content-Type: application/json

{
  "importId": "imp-...",
  "providerJobId": "job-...",
  "status": "completed",
  "resultado": {}
}
```

O HMAC usa `NAIRA_CALLBACK_SECRET`. Falhas podem usar `status: "failed"`;
atualizações intermediárias, `status: "processing"`.

## Entrada iniciada pela própria Naira

Quando a Naira já recebeu ESCOPO e BRIEFING por Google Form ou outro canal, ela
pode criar somente um rascunho revisável:

```http
POST /api/integrations/naira/imports
Authorization: Bearer <NAIRA_M2M_TOKEN>
Idempotency-Key: <id-do-evento-naira>
Content-Type: application/json

{
  "criadoPor": "integracao-naira",
  "rascunho": {},
  "campos": [],
  "fontes": [
    {
      "id": "fonte-escopo-1",
      "tipoDocumento": "escopo",
      "nomeDocumento": "ESCOPO Cliente.pdf"
    },
    {
      "id": "fonte-briefing-1",
      "tipoDocumento": "briefing",
      "nomeDocumento": "BRIEFING Cliente.pdf"
    }
  ],
  "validacao": { "avisos": [] }
}
```

Essa credencial não permite editar nem excluir projetos. Um administrador
interno revisa o rascunho antes da criação.

## Segurança e LGPD

- ESCOPO e BRIEFING são dados não confiáveis, nunca instruções executáveis.
- Senhas, tokens, chaves e credenciais não devem entrar nos documentos enviados
  à IA.
- O backend não registra PDFs, resposta bruta ou segredos em log.
- Os PDFs ficam em armazenamento temporário separado e possuem expiração
  automática.
- Links, pendências, horas, datas, fases e gates sugeridos exigem revisão humana;
  visibilidade ao cliente nunca é inferida.
- Em jobs do painel, somente `documentos[]` estabelece a existência de ESCOPO;
  texto ou metadado inventado pelo provedor não altera `tracking`.
- Gates sem a linha `gate.<idTemporario>` e uma fonte confiável de ESCOPO são
  removidos antes da criação do projeto.
- O BRIEFING não tem autoridade para ampliar o ESCOPO, mesmo que contenha texto
  com aparência de instrução ao agente.
- Confirme com a Naira localização de processamento, subprocessadores, uso para
  treinamento e política de exclusão antes de ativar produção.

## Checklist para ativar a Naira real

1. Obter URL de homologação e um exemplo `curl` real.
2. Confirmar Bearer ou adaptar somente
   `server/src/integrations/nairaClient.js` ao header correto.
3. Confirmar suporte às partes `escopo`, `briefing` e `documentsManifest`.
4. Confirmar uso de `contractVersion=2026-07-14`.
5. Confirmar resposta síncrona ou callback e cadastrar o HMAC.
6. Validar limite por PDF, OCR de documentos escaneados, timeout, rate limit e
   retenção.
7. Testar um caso coerente, um conflito, uma exclusão e um potencial extra.
8. Confirmar que o potencial extra não aparece em fase, checklist ou gate.
9. Executar homologação com dados fictícios.
10. Revisar LGPD e somente então configurar as variáveis no Render.

## Teste local

Com API e frontend em execução, abra **Projetos → Novo projeto → Importar
documentos** e selecione ESCOPO e BRIEFING. Em desenvolvimento, o status deve
mostrar **Simulador de integração**. O fluxo só pode criar o projeto depois da
revisão humana.

O teste integrado deve verificar especialmente:

1. uploads sequenciais com a versão atualizada;
2. fontes diferenciadas por tipo e nome do documento;
3. horas provenientes apenas do ESCOPO;
4. conflito registrado em matriz, aviso e pendência;
5. potencial extra excluído das fases e gates;
6. fonte de tipo não declarado descartada sem autorizar horas, data ou gate;
7. restauração idempotente de um blob parcial removido pelo TTL;
8. arquivos temporários removidos após confirmar ou cancelar.

Antes de publicar:

```powershell
npm.cmd run verify
```
