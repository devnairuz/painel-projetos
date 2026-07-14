# Integração da Naira com o Rastreio de Projetos

## Estado atual

O painel possui um fluxo completo e revisável de automação:

```text
PDF → registro idempotente → upload privado → Naira
    → rascunho sanitizado → revisão humana → projeto

JSON copiado da Naira → validação e normalização
                       → revisão humana → projeto
```

Em desenvolvimento, `NAIRA_MODE=mock` executa um simulador identificado na interface. Ele testa persistência, estados, revisão e criação sem afirmar que a Naira real respondeu. Em produção, o padrão é `disabled`.

O contrato privado da Naira ainda precisa ser fornecido pela empresa. Nunca coloque chaves em variáveis `VITE_*`, commits, mensagens ou screenshots.

## Modos

| Modo | Uso |
|---|---|
| `mock` | Teste local integrado. O PDF não sai da API do painel. |
| `http` | Envio real para a Naira por HTTPS. Exige URL e chave. |
| `disabled` | Automação indisponível. É o padrão de produção. |

Não existe fallback silencioso de `http` para `mock`: uma falha real aparece como falha real.

## Importação manual de JSON

Enquanto a integração privada da Naira não estiver homologada, um usuário
interno pode executar a análise no agente, copiar o resultado e importar o JSON
no mesmo fluxo de revisão do PDF. Essa opção não depende de `NAIRA_MODE`, não
envia arquivo a nenhum provedor e não cria um projeto diretamente.

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

O prompt recomendado para configurar o agente está em
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
- `NAIRA_CALLBACK_URL`: URL pública que a Naira deve chamar ao terminar um trabalho assíncrono.
- `NAIRA_CALLBACK_SECRET`: segredo HMAC-SHA256 do callback.
- `NAIRA_M2M_TOKEN`: credencial exclusiva para a Naira enviar rascunhos estruturados ao painel.
- `NAIRA_FILE_RETENTION_HOURS`: retenção máxima do PDF temporário; o arquivo também é excluído ao confirmar ou cancelar.

Em produção, importações são recusadas se a API estiver usando o repositório em memória. Configure `MONGODB_URI`.

## Fluxo usado pelo painel

Todas as rotas abaixo, exceto os dois endpoints máquina-a-máquina, exigem o JWT de um usuário interno.

### 1. Criar o trabalho

```http
POST /api/project-imports
Authorization: Bearer <jwt-interno>
Idempotency-Key: <uuid>
Content-Type: application/json

{
  "nomeArquivo": "briefing-cliente.pdf",
  "mimeType": "application/pdf",
  "tamanhoBytes": 245760
}
```

### 2. Enviar o PDF binário

```http
PUT /api/project-imports/:id/file
Authorization: Bearer <jwt-interno>
If-Match: <versao-atual>
Content-Type: application/pdf

<bytes do PDF>
```

A API confere tamanho, MIME, assinatura `%PDF-` e SHA-256. O conteúdo fica isolado do `Project` e nunca é devolvido pela API.

### 3. Acompanhar e revisar

```text
GET   /api/project-imports
GET   /api/project-imports/:id
PATCH /api/project-imports/:id/draft
POST  /api/project-imports/:id/retry
POST  /api/project-imports/:id/cancel
```

Edições usam a `versao` recebida. Uma versão antiga retorna conflito em vez de sobrescrever o trabalho de outra pessoa.

### 4. Confirmar

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

A organização precisa existir. IDs, estados, itens concluídos e responsáveis internos nunca são aceitos diretamente da IA. O projeto é criado uma única vez mesmo se a confirmação for repetida.

## Contrato de saída da Naira

No modo HTTP, o painel envia `multipart/form-data` para `POST {NAIRA_BASE_URL}/imports`:

- `file`: PDF;
- `importId`: identificador idempotente;
- `contractVersion`: versão informada por `/api/integrations/naira/status`;
- `callbackUrl`: quando configurada.

Uma resposta síncrona pode devolver:

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
      "resumoEscopo": "Implantação da nova loja"
    },
    "fases": [],
    "linksUteis": [],
    "pendencias": []
  },
  "campos": [
    { "campo": "cliente.nome", "confianca": 0.93 }
  ],
  "fontes": [
    { "campo": "cliente.nome", "pagina": 1, "trecho": "Cliente Exemplo" }
  ],
  "validacao": {
    "avisos": []
  }
}
```

Também são aceitos os equivalentes em inglês previstos no normalizador. Campos fora da lista permitida são descartados.

Para processamento assíncrono, a Naira responde `202` com `id` ou `jobId` e depois chama:

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

O HMAC usa `NAIRA_CALLBACK_SECRET`. Falhas podem usar `status: "failed"`; atualizações intermediárias, `status: "processing"`.

## Entrada iniciada pela própria Naira

Quando a Naira já recebeu um Google Form ou outro briefing, ela pode criar apenas um rascunho revisável:

```http
POST /api/integrations/naira/imports
Authorization: Bearer <NAIRA_M2M_TOKEN>
Idempotency-Key: <id-do-evento-naira>
Content-Type: application/json

{
  "criadoPor": "integracao-naira",
  "rascunho": {},
  "campos": [],
  "fontes": []
}
```

Essa credencial não permite editar ou excluir projetos. Um administrador interno revisa o rascunho antes da criação.

## Segurança e LGPD

- O PDF é dado não confiável, nunca instrução executável.
- Senhas, tokens, chaves e credenciais não devem entrar no briefing enviado à IA.
- O backend não registra PDF, resposta bruta ou segredos em log.
- Links e pendências sugeridos exigem confirmação humana; visibilidade ao cliente nunca é inferida.
- O PDF fica numa coleção temporária separada e possui expiração automática.
- Confirme com a Naira localização de processamento, subprocessadores, uso para treinamento e política de exclusão antes de ativar produção.

## Checklist para ativar a Naira real

1. Obter URL de homologação e um exemplo `curl` real.
2. Confirmar Bearer ou adaptar o único arquivo `server/src/integrations/nairaClient.js` ao header correto.
3. Confirmar se o endpoint aceita o multipart acima.
4. Confirmar resposta síncrona ou callback e cadastrar o HMAC.
5. Validar limite, OCR de PDFs escaneados, timeout, rate limit e retenção.
6. Executar o fluxo em homologação com dados fictícios.
7. Revisar LGPD e somente então configurar as variáveis no Render.

## Teste local

Com API e frontend em execução, abra **Projetos → Novo projeto → Importar briefing em PDF**. Em desenvolvimento, o status deve mostrar **Simulador de integração**. O fluxo completo deve chegar à revisão e criar o projeto somente após confirmação.

Antes de publicar:

```powershell
npm.cmd run verify
```
