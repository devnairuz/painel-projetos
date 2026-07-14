const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

process.env.NODE_ENV = "test";
process.env.NAIRA_MODE = "mock";
process.env.JWT_SECRET = "segredo-de-testes-com-tamanho-adequado";
process.env.NAIRA_M2M_TOKEN = "token-m2m-valido-de-testes";
process.env.NAIRA_CALLBACK_SECRET = "segredo-callback-valido-de-testes";
process.env.NAIRA_MAX_JSON_BYTES = "4096";

const { createApp } = require("../src/app");
const { initRepo, getRepo } = require("../src/repos");
const { signToken } = require("../src/auth/jwt");
const { normalizarSaidaNaira } = require("../src/services/projectImportService");
const nairaClient = require("../src/integrations/nairaClient");
const projectService = require("../src/services/projectService");

const usuario = {
  id: "usr-teste-admin",
  name: "Pessoa de Teste",
  email: "admin@teste.local",
  role: "admin",
  active: true,
  emailVerified: true
};

let servidor;
let baseUrl;
let token;

test.before(async () => {
  servidor = createApp().listen(0);
  await new Promise((resolve) => servidor.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${servidor.address().port}`;
});

test.after(async () => {
  if (servidor) await new Promise((resolve) => servidor.close(resolve));
});

test.beforeEach(async () => {
  await initRepo({ useMongo: false });
  await getRepo().createUser(usuario);
  token = signToken(usuario);
});

async function chamar(caminho, { method = "GET", body, headers = {} } = {}) {
  const resposta = await fetch(`${baseUrl}${caminho}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined && !Buffer.isBuffer(body) ? { "Content-Type": "application/json" } : {}),
      ...headers
    },
    body: body === undefined ? undefined : (Buffer.isBuffer(body) ? body : JSON.stringify(body))
  });
  let corpo;
  try {
    corpo = await resposta.json();
  } catch {
    corpo = undefined;
  }
  return { resposta, corpo };
}

async function criarJob(chave, pdf) {
  const criacao = await chamar("/api/project-imports", {
    method: "POST",
    headers: { "Idempotency-Key": chave },
    body: { nomeArquivo: "Cliente Exemplo.pdf", mimeType: "application/pdf", tamanhoBytes: pdf.length }
  });
  assert.equal(criacao.resposta.status, 201);
  return criacao.corpo;
}

function contratoJsonManual(nome = "Cliente JSON") {
  return {
    contractVersion: "2026-07-13",
    rascunho: {
      cliente: { nome, nomeOrganizacaoSugerida: `${nome} LTDA`, segmento: "Varejo" },
      projeto: { plataforma: "vtex", tipo: "implantacao", produto: "ecommerce", resumoEscopo: "Escopo importado" },
      fases: [{
        idTemporario: "fase-json-1",
        nome: "Kickoff",
        visivelCliente: true,
        checklist: [{ idTemporario: "item-json-1", titulo: "Validar briefing" }]
      }],
      linksUteis: [{ titulo: "Painel", url: "https://example.com", revisado: true, visivelCliente: true }],
      pendencias: [{ titulo: "Validar cronograma", revisado: true }]
    },
    campos: [{ campo: "cliente.nome", valor: nome, confianca: 0.95 }],
    fontes: [{ id: "fonte-json-1", pagina: 1, trecho: "Trecho do briefing" }]
  };
}

async function aguardarStatus(id, esperado, tentativas = 60) {
  for (let i = 0; i < tentativas; i += 1) {
    const consulta = await chamar(`/api/project-imports/${id}`);
    if (consulta.corpo.status === esperado || consulta.corpo.status === "falhou") return consulta.corpo;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail(`Importação ${id} não alcançou o status ${esperado}.`);
}

test("fluxo mock completo exige revisão e cria projeto somente após confirmação", async () => {
  const pdf = Buffer.from("%PDF-1.4\nconteudo de teste\n%%EOF", "utf8");
  const job = await criarJob("happy-path-0001", pdf);
  assert.equal(job.status, "aguardando_arquivo");
  assert.equal(job.arquivo.nomeOriginal, "Cliente Exemplo.pdf");
  assert.equal(job.arquivo.armazenado, false);

  const envio = await chamar(`/api/project-imports/${job.id}/file`, {
    method: "PUT",
    body: pdf,
    headers: { "Content-Type": "application/pdf", "If-Match": String(job.versao) }
  });
  assert.equal(envio.resposta.status, 202);
  assert.equal(envio.corpo.status, "na_fila");

  const analisada = await aguardarStatus(job.id, "aguardando_revisao");
  assert.equal(analisada.status, "aguardando_revisao");
  assert.equal(analisada.provedor.tentativas, 1);
  assert.equal(analisada.rascunho.fases[0].visivelCliente, false);
  assert.equal(analisada.rascunho.pendencias[0].revisado, false);

  const rascunho = structuredClone(analisada.rascunho);
  rascunho.fases[0].visivelCliente = true;
  rascunho.pendencias[0].revisado = true;
  const revisao = await chamar(`/api/project-imports/${job.id}/draft`, {
    method: "PATCH",
    body: { versao: analisada.versao, rascunho }
  });
  assert.equal(revisao.resposta.status, 200);
  assert.equal(revisao.corpo.rascunho.fases[0].visivelCliente, true);
  assert.equal(revisao.corpo.rascunho.pendencias[0].revisado, true);

  const confirmacao = await chamar(`/api/project-imports/${job.id}/confirm`, {
    method: "POST",
    body: {
      versao: revisao.corpo.versao,
      organizationId: "o1",
      usarFasesSugeridas: true
    }
  });
  assert.equal(confirmacao.resposta.status, 200);
  assert.equal(confirmacao.corpo.status, "concluida");
  assert.ok(confirmacao.corpo.projetoId);

  const projeto = await chamar(`/api/projects/${confirmacao.corpo.projetoId}`);
  assert.equal(projeto.resposta.status, 200);
  assert.equal(projeto.corpo.importacaoOrigemId, job.id);
  assert.equal(projeto.corpo.phases[0].clientVisible, true);
  assert.ok(projeto.corpo.charges.some((item) => item.title === "Revisar dados extraídos pela Naira"));
  await projectService.grantClientAccess(confirmacao.corpo.projetoId, "cliente@teste.local");
  const recorteCliente = await projectService.getProjectForClient(confirmacao.corpo.projetoId, "cliente@teste.local");
  assert.equal(recorteCliente.importacaoOrigemId, undefined);
});

test("rejeita conteúdo sem assinatura PDF mesmo com MIME correto", async () => {
  const falsoPdf = Buffer.from("isto nao e um pdf", "utf8");
  const job = await criarJob("pdf-invalido-001", falsoPdf);
  const envio = await chamar(`/api/project-imports/${job.id}/file`, {
    method: "PUT",
    body: falsoPdf,
    headers: { "Content-Type": "application/pdf", "If-Match": String(job.versao) }
  });
  assert.equal(envio.resposta.status, 400);
  assert.equal(envio.corpo.error, "invalid_pdf");
});

test("protege rotas de usuário, intake M2M e callback contra credenciais inválidas", async () => {
  const semJwt = await fetch(`${baseUrl}/api/project-imports`);
  assert.equal(semJwt.status, 401);

  const m2m = await fetch(`${baseUrl}/api/integrations/naira/imports`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer token-incorreto" },
    body: JSON.stringify({ chaveExterna: "entrada-m2m-001", rascunho: {} })
  });
  assert.equal(m2m.status, 401);

  const callback = await fetch(`${baseUrl}/api/integrations/naira/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Naira-Signature": "sha256=00" },
    body: JSON.stringify({ importId: "imp-inexistente", status: "completed" })
  });
  assert.equal(callback.status, 401);
});

test("intake M2M autenticado e callback HMAC geram rascunhos revisáveis", async () => {
  const intake = await fetch(`${baseUrl}/api/integrations/naira/imports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer token-m2m-valido-de-testes",
      "Idempotency-Key": "entrada-m2m-valida-001"
    },
    body: JSON.stringify({
      criadoPor: usuario.id,
      rascunho: {
        cliente: { nome: "Cliente M2M" },
        projeto: { plataforma: "vtex", tipo: "implantacao", produto: "ecommerce" },
        fases: []
      }
    })
  });
  assert.equal(intake.status, 201);
  const intakeBody = await intake.json();
  assert.equal(intakeBody.origem, "naira_m2m");
  assert.equal(intakeBody.provedor.modo, "m2m");
  assert.equal(intakeBody.arquivo.armazenado, false);

  const pdf = Buffer.from("%PDF-1.4\ncallback\n%%EOF", "utf8");
  const job = await criarJob("callback-valido-001", pdf);
  const interna = await getRepo().getProjectImport(job.id);
  interna.status = "processando_naira";
  interna.provedor.requisicaoId = "req-callback-001";
  interna.versao += 1;
  await getRepo().updateProjectImport(interna, job.versao);
  const payload = JSON.stringify({
    importId: job.id,
    providerJobId: "req-callback-001",
    status: "completed",
    resultado: {
      rascunho: {
        cliente: { nome: "Cliente Callback" },
        projeto: { plataforma: "shopify", tipo: "implantacao", produto: "ecommerce" },
        fases: []
      }
    }
  });
  const assinatura = crypto
    .createHmac("sha256", "segredo-callback-valido-de-testes")
    .update(payload)
    .digest("hex");
  const callback = await fetch(`${baseUrl}/api/integrations/naira/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Naira-Signature": `sha256=${assinatura}` },
    body: payload
  });
  assert.equal(callback.status, 200);
  const callbackBody = await callback.json();
  assert.equal(callbackBody.status, "aguardando_revisao");
  assert.equal(callbackBody.rascunho.cliente.nome, "Cliente Callback");
});

test("importação JSON manual cria job revisável sem confiar nos gates externos", async () => {
  const payload = contratoJsonManual();
  const criacao = await chamar("/api/project-imports/json", {
    method: "POST",
    headers: { "Idempotency-Key": "json-manual-criacao-001", "X-File-Name": "briefing-manual.json" },
    // Espelha exatamente o envelope enviado pelo frontend.
    body: { resultado: payload }
  });
  assert.equal(criacao.resposta.status, 201);
  assert.equal(criacao.corpo.origem, "json_manual");
  assert.equal(criacao.corpo.status, "aguardando_revisao");
  assert.equal(criacao.corpo.arquivo.nomeOriginal, "briefing-manual.json");
  assert.equal(criacao.corpo.arquivo.mimeType, "application/json");
  assert.equal(criacao.corpo.arquivo.armazenado, false);
  assert.equal(criacao.corpo.provedor.modo, "manual");
  assert.equal(criacao.corpo.rascunho.fases[0].visivelCliente, false);
  assert.equal(criacao.corpo.rascunho.linksUteis[0].revisado, false);
  assert.equal(criacao.corpo.rascunho.linksUteis[0].visivelCliente, false);
  assert.equal(criacao.corpo.rascunho.pendencias[0].revisado, false);
  assert.ok(criacao.corpo.auditoria.some((item) => item.tipo === "entrada_json_manual_criada"));
  assert.equal(await getRepo().getProjectImportFile(criacao.corpo.id), null);

  const repetida = await chamar("/api/project-imports/json", {
    method: "POST",
    headers: { "Idempotency-Key": "json-manual-criacao-001", "X-File-Name": "briefing-manual.json" },
    body: payload
  });
  assert.equal(repetida.resposta.status, 200);
  assert.equal(repetida.corpo.id, criacao.corpo.id);

  const conflito = await chamar("/api/project-imports/json", {
    method: "POST",
    headers: { "Idempotency-Key": "json-manual-criacao-001", "X-File-Name": "briefing-manual.json" },
    body: contratoJsonManual("Outro Cliente")
  });
  assert.equal(conflito.resposta.status, 409);
  assert.equal(conflito.corpo.error, "idempotency_conflict");

  const rascunhoRevisado = structuredClone(criacao.corpo.rascunho);
  rascunhoRevisado.fases[0].visivelCliente = true;
  rascunhoRevisado.linksUteis[0].revisado = true;
  rascunhoRevisado.linksUteis[0].visivelCliente = true;
  rascunhoRevisado.pendencias[0].revisado = true;
  const revisao = await chamar(`/api/project-imports/${criacao.corpo.id}/draft`, {
    method: "PATCH",
    body: { versao: criacao.corpo.versao, rascunho: rascunhoRevisado }
  });
  assert.equal(revisao.resposta.status, 200);
  const confirmacao = await chamar(`/api/project-imports/${criacao.corpo.id}/confirm`, {
    method: "POST",
    body: { versao: revisao.corpo.versao, organizationId: "o1", usarFasesSugeridas: true }
  });
  assert.equal(confirmacao.resposta.status, 200);
  assert.equal(confirmacao.corpo.status, "concluida");
  const projeto = await chamar(`/api/projects/${confirmacao.corpo.projetoId}`);
  assert.equal(projeto.corpo.linksUteis.length, 1);
  assert.ok(projeto.corpo.charges.some((item) => item.title === "Validar cronograma"));
});

test("substituição JSON usa versão e Idempotency-Key sem duplicar auditoria", async () => {
  const criacao = await chamar("/api/project-imports/json", {
    method: "POST",
    headers: { "Idempotency-Key": "json-manual-update-create", "X-File-Name": "entrada.json" },
    body: contratoJsonManual("Cliente Inicial")
  });
  const novoPayload = contratoJsonManual("Cliente Atualizado");
  const atualizar = () => chamar(`/api/project-imports/${criacao.corpo.id}/json`, {
    method: "PUT",
    headers: {
      "Idempotency-Key": "json-manual-update-001",
      "If-Match": String(criacao.corpo.versao),
      "X-File-Name": "entrada-atualizada.json"
    },
    body: novoPayload
  });
  const atualizada = await atualizar();
  assert.equal(atualizada.resposta.status, 200);
  assert.equal(atualizada.corpo.rascunho.cliente.nome, "Cliente Atualizado");
  assert.equal(atualizada.corpo.versao, criacao.corpo.versao + 1);
  const quantidadeEventos = atualizada.corpo.auditoria.length;

  const repetida = await atualizar();
  assert.equal(repetida.resposta.status, 200);
  assert.equal(repetida.corpo.versao, atualizada.corpo.versao);
  assert.equal(repetida.corpo.auditoria.length, quantidadeEventos);

  const conflito = await chamar(`/api/project-imports/${criacao.corpo.id}/json`, {
    method: "PUT",
    headers: {
      "Idempotency-Key": "json-manual-update-001",
      "If-Match": String(atualizada.corpo.versao),
      "X-File-Name": "entrada-atualizada.json"
    },
    body: contratoJsonManual("Conteúdo conflitante")
  });
  assert.equal(conflito.resposta.status, 409);
  assert.equal(conflito.corpo.error, "idempotency_conflict");

  const repetirCriacao = await chamar("/api/project-imports/json", {
    method: "POST",
    headers: { "Idempotency-Key": "json-manual-update-create", "X-File-Name": "entrada.json" },
    body: contratoJsonManual("Cliente Inicial")
  });
  assert.equal(repetirCriacao.resposta.status, 200);
  assert.equal(repetirCriacao.corpo.id, criacao.corpo.id);
  assert.equal(repetirCriacao.corpo.rascunho.cliente.nome, "Cliente Atualizado");
});

test("JSON manual rejeita contrato inválido/tamanho excedido e bloqueia segredos sem persistir valor cru", async () => {
  const invalido = await chamar("/api/project-imports/json", {
    method: "POST",
    headers: { "Idempotency-Key": "json-manual-invalido-001" },
    body: { desconhecido: true }
  });
  assert.equal(invalido.resposta.status, 422);
  assert.equal(invalido.corpo.error, "invalid_naira_contract");

  const grande = await chamar("/api/project-imports/json", {
    method: "POST",
    headers: { "Idempotency-Key": "json-manual-grande-001" },
    body: { ...contratoJsonManual(), preenchimento: "x".repeat(5000) }
  });
  assert.equal(grande.resposta.status, 413);
  assert.equal(grande.corpo.error, "json_payload_too_large");

  const segredo = "supersegredo-que-nao-pode-persistir";
  const payload = contratoJsonManual("Cliente Seguro");
  payload.campos.push({ campo: "password", valor: segredo, confianca: 1 });
  payload.rascunho.linksUteis.push({
    titulo: "Link inseguro",
    url: `https://example.com?token=${segredo}`,
    revisado: true,
    visivelCliente: true
  });
  const bloqueada = await chamar("/api/project-imports/json", {
    method: "POST",
    headers: { "Idempotency-Key": "json-manual-segredo-001" },
    body: payload
  });
  assert.equal(bloqueada.resposta.status, 201);
  assert.equal(bloqueada.corpo.validacao.valido, false);
  assert.ok(bloqueada.corpo.validacao.bloqueios.some((item) => item.includes("segredo")));
  assert.equal(bloqueada.corpo.campos.find((item) => item.campo === "password").valor, "[DADO SENSÍVEL REMOVIDO]");
  assert.equal(JSON.stringify(bloqueada.corpo).includes(segredo), false);
  const persistida = await getRepo().getProjectImport(bloqueada.corpo.id);
  assert.equal(JSON.stringify(persistida).includes(segredo), false);
});

test("Idempotency-Key reaproveita job e confirmar duas vezes não duplica projeto", async () => {
  const pdf = Buffer.from("%PDF-1.7\nbriefing\n%%EOF", "utf8");
  const primeiro = await criarJob("idempotencia-001", pdf);
  const repetido = await chamar("/api/project-imports", {
    method: "POST",
    headers: { "Idempotency-Key": "idempotencia-001" },
    body: { nomeArquivo: "Cliente Exemplo.pdf", mimeType: "application/pdf", tamanhoBytes: pdf.length }
  });
  assert.equal(repetido.resposta.status, 200);
  assert.equal(repetido.corpo.id, primeiro.id);
  const conflito = await chamar("/api/project-imports", {
    method: "POST",
    headers: { "Idempotency-Key": "idempotencia-001" },
    body: { nomeArquivo: "Outro.pdf", mimeType: "application/pdf", tamanhoBytes: pdf.length }
  });
  assert.equal(conflito.resposta.status, 409);
  assert.equal(conflito.corpo.error, "idempotency_conflict");

  await chamar(`/api/project-imports/${primeiro.id}/file`, {
    method: "PUT",
    body: pdf,
    headers: { "Content-Type": "application/pdf", "If-Match": String(primeiro.versao) }
  });
  const analisada = await aguardarStatus(primeiro.id, "aguardando_revisao");
  const quantidadeAntes = await getRepo().countProjects();
  const corpo = { versao: analisada.versao, organizationId: "o1", usarFasesSugeridas: false };
  const primeiraConfirmacao = await chamar(`/api/project-imports/${primeiro.id}/confirm`, { method: "POST", body: corpo });
  const segundaConfirmacao = await chamar(`/api/project-imports/${primeiro.id}/confirm`, { method: "POST", body: corpo });
  assert.equal(primeiraConfirmacao.corpo.projetoId, segundaConfirmacao.corpo.projetoId);
  assert.equal(await getRepo().countProjects(), quantidadeAntes + 1);
});

test("normalização aplica whitelist, limites e nunca aceita gates enviados pela automação", () => {
  const saida = normalizarSaidaNaira({
    rascunho: {
      cliente: {
        nome: "Cliente Seguro",
        nomeOrganizacaoSugerida: "Organização sugerida",
        segmento: "Varejo"
      },
      projeto: { plataforma: "kobe", tipo: "cro", produto: "ecommerce", resumoEscopo: "Escopo inicial" },
      fases: [{
        idTemporario: "fase-origem",
        nome: "Descoberta",
        visivelCliente: true,
        checklist: [{ titulo: "Configurar token: segredo-super-secreto", colunaKanban: "em_andamento" }]
      }],
      linksUteis: [{ titulo: "Painel", url: "https://example.com", revisado: true, visivelCliente: true }],
      pendencias: [{ titulo: "Validar escopo", revisado: true }]
    },
    fontes: [{ page: 2, excerpt: "Trecho seguro" }]
  });
  assert.equal(saida.rascunho.projeto.plataforma, "kobe");
  assert.equal(saida.rascunho.projeto.tipo, "cro");
  assert.equal(saida.rascunho.fases[0].idTemporario, "fase-origem");
  assert.equal(saida.rascunho.fases[0].visivelCliente, false);
  assert.equal(saida.rascunho.linksUteis[0].revisado, false);
  assert.equal(saida.rascunho.linksUteis[0].visivelCliente, false);
  assert.equal(saida.rascunho.pendencias[0].revisado, false);
  assert.equal(saida.rascunho.fases[0].checklist[0].titulo, "[DADO SENSÍVEL REMOVIDO]");
  assert.ok(saida.validacao.bloqueios.some((item) => item.includes("segredo")));
  assert.equal(saida.fontes[0].id, "fonte-1");
});

test("cancelamento durante chamada externa não é sobrescrito pelo retorno atrasado", async () => {
  const original = nairaClient.analisar;
  let liberar;
  nairaClient.analisar = () => new Promise((resolve) => {
    liberar = resolve;
  });
  try {
    const pdf = Buffer.from("%PDF-1.4\nchamada lenta\n%%EOF", "utf8");
    const job = await criarJob("cancelamento-corrida-001", pdf);
    await chamar(`/api/project-imports/${job.id}/file`, {
      method: "PUT",
      body: pdf,
      headers: { "Content-Type": "application/pdf", "If-Match": String(job.versao) }
    });
    const enviando = await aguardarStatus(job.id, "enviando_naira");
    assert.equal(enviando.status, "enviando_naira");
    const cancelada = await chamar(`/api/project-imports/${job.id}/cancel`, {
      method: "POST",
      body: { versao: enviando.versao }
    });
    assert.equal(cancelada.corpo.status, "cancelada");
    liberar({ assincrono: false, resultado: { rascunho: { cliente: { nome: "Não deve sobrescrever" } } } });
    await new Promise((resolve) => setTimeout(resolve, 30));
    const final = await chamar(`/api/project-imports/${job.id}`);
    assert.equal(final.corpo.status, "cancelada");
  } finally {
    nairaClient.analisar = original;
  }
});

test("uploads concorrentes nunca deixam o hash do job divergente do blob armazenado", async () => {
  const pdfA = Buffer.from("%PDF-1.4\nconteudo-AAAA\n%%EOF", "utf8");
  const pdfB = Buffer.from("%PDF-1.4\nconteudo-BBBB\n%%EOF", "utf8");
  assert.equal(pdfA.length, pdfB.length);
  const job = await criarJob("upload-concorrente-001", pdfA);
  const enviar = (pdf) => chamar(`/api/project-imports/${job.id}/file`, {
    method: "PUT",
    body: pdf,
    headers: { "Content-Type": "application/pdf", "If-Match": String(job.versao) }
  });
  const resultados = await Promise.all([enviar(pdfA), enviar(pdfB)]);
  assert.deepEqual(resultados.map((item) => item.resposta.status).sort(), [202, 409]);
  const final = await aguardarStatus(job.id, "aguardando_revisao");
  assert.equal(final.status, "aguardando_revisao");
  const blob = await getRepo().getProjectImportFile(job.id);
  const hashBlob = crypto.createHash("sha256").update(blob.conteudo).digest("hex");
  assert.equal(final.arquivo.sha256, hashBlob);
});
