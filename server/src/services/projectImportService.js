const crypto = require("crypto");
const { config } = require("../config");
const { getRepo } = require("../repos");
const nairaClient = require("../integrations/nairaClient");
const projectService = require("./projectService");

const STATUS_TERMINAIS = new Set(["concluida", "cancelada"]);
const PLATAFORMAS = new Set(["vtex", "shopify", "linx", "woocommerce", "tray", "wake", "kobe", "outro"]);
const TIPOS = new Set(["implantacao", "evolucao", "sustentacao", "cro", "pontual"]);
const PRODUTOS = new Set(["ecommerce", "blog_institucional", "dev_proprio", "landing_page"]);
const NIVEIS_TRAVA = new Set(["trava_inicio", "trava_golive", "placeholder"]);
const STATUS_BOARD = new Set([
  "a_fazer", "responsabilidade_cliente", "em_andamento", "aguardando_cliente", "pendente_golive", "concluido"
]);
const CATEGORIAS_LINK = new Set(["geral", "planejamento", "design", "conteudo", "tecnico"]);
const processamentosAtivos = new Set();

function erroHttp(mensagem, status = 400, codigo = "invalid_request") {
  const erro = new Error(mensagem);
  erro.status = status;
  erro.codigo = codigo;
  return erro;
}

const agora = () => new Date().toISOString();
const texto = (valor, maximo) => String(valor == null ? "" : valor).trim().slice(0, maximo);
const lista = (valor, maximo) => Array.isArray(valor) ? valor.slice(0, maximo) : [];

function versaoRecebida(valor) {
  const limpa = String(valor == null ? "" : valor).replace(/^W\//, "").replace(/^"|"$/g, "");
  const numero = Number(limpa);
  if (!Number.isInteger(numero) || numero < 1) throw erroHttp("Informe uma versão válida da importação.", 428, "version_required");
  return numero;
}

function exigirVersao(importacao, valor) {
  const recebida = versaoRecebida(valor);
  if (recebida !== importacao.versao) {
    throw erroHttp("A importação foi alterada por outra pessoa. Atualize os dados e tente novamente.", 409, "version_conflict");
  }
}

function evento(tipo, atorId, detalhes) {
  return {
    id: `aud-${crypto.randomUUID()}`,
    tipo,
    atorId: texto(atorId || "sistema", 120),
    em: agora(),
    ...(detalhes ? { detalhes } : {})
  };
}

function auditar(importacao, tipo, atorId, detalhes) {
  importacao.auditoria = [...(importacao.auditoria || []), evento(tipo, atorId, detalhes)].slice(-100);
}

function incrementar(importacao) {
  importacao.versao += 1;
  importacao.atualizadoEm = agora();
}

async function persistirVersionado(importacao, versaoEsperada) {
  const salva = await getRepo().updateProjectImport(importacao, versaoEsperada);
  if (!salva) {
    throw erroHttp("A importação foi alterada por outra operação. Atualize os dados e tente novamente.", 409, "version_conflict");
  }
  return salva;
}

function pareceSegredo(valor) {
  const conteudo = String(valor || "");
  return /(senha|password|passwd|secret|token|api[_ -]?key|authorization)\s*[:=]\s*\S+/i.test(conteudo)
    || /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/.test(conteudo)
    || /\bsk-[A-Za-z0-9_-]{16,}\b/.test(conteudo)
    || /\bgh[pousr]_[A-Za-z0-9]{20,}\b/.test(conteudo)
    || /\bAKIA[0-9A-Z]{16}\b/.test(conteudo)
    || /\bBearer\s+[A-Za-z0-9._~+/-]{10,}=*/i.test(conteudo)
    || /https?:\/\/[^/\s:@]+:[^@\s]+@/i.test(conteudo)
    || /[?&](senha|password|passwd|secret|token|api.?key|authorization)=[^&#\s]+/i.test(conteudo);
}

function redigir(valor, maximo) {
  const limpo = texto(valor, maximo);
  return pareceSegredo(limpo) ? "[DADO SENSÍVEL REMOVIDO]" : limpo;
}

function conteudoTemSegredo(valor, profundidade = 0) {
  if (profundidade > 6 || valor == null) return false;
  if (typeof valor === "string") return pareceSegredo(valor);
  if (Array.isArray(valor)) return valor.slice(0, 200).some((item) => conteudoTemSegredo(item, profundidade + 1));
  if (typeof valor === "object") {
    const nomeCampo = String(valor.campo ?? valor.field ?? valor.key ?? "");
    if (/senha|password|passwd|secret|token|api.?key|authorization/i.test(nomeCampo)
      && (valor.valor ?? valor.value) != null) return true;
    return Object.entries(valor).slice(0, 200).some(([chave, item]) => {
      const chaveSensivel = /^(senha|password|passwd|secret|token|apiKey|authorization)$/i.test(chave);
      return (chaveSensivel && item != null && String(item).trim() !== "") || conteudoTemSegredo(item, profundidade + 1);
    });
  }
  return false;
}

function idTemporario(valor, fallback) {
  const recebido = texto(valor, 100);
  return /^[A-Za-z0-9_-]+$/.test(recebido) ? recebido : fallback;
}

function garantirIdsUnicos(itens, propriedade, prefixo) {
  const usados = new Set();
  itens.forEach((item, indice) => {
    let id = item[propriedade];
    if (!id || usados.has(id)) id = `${prefixo}-${indice + 1}`;
    let sufixo = 1;
    const base = id;
    while (usados.has(id)) {
      sufixo += 1;
      id = `${base}-${sufixo}`;
    }
    item[propriedade] = id;
    usados.add(id);
  });
}

function normalizarUrl(valor) {
  const url = texto(valor, 1000);
  if (!url || pareceSegredo(url)) return "";
  try {
    const analisada = new URL(url);
    if (analisada.username || analisada.password) return "";
    if ([...analisada.searchParams.keys()].some((chave) => /senha|password|passwd|secret|token|api.?key|authorization/i.test(chave))) {
      return "";
    }
    return analisada.protocol === "http:" || analisada.protocol === "https:" ? url : "";
  } catch {
    return "";
  }
}

function normalizarItem(item = {}, indice = 0, idFase = "fase") {
  const titulo = texto(item.titulo ?? item.label ?? item.name, 180);
  if (!titulo) return null;
  const nivelTrava = NIVEIS_TRAVA.has(item.nivelTrava ?? item.travaLevel)
    ? (item.nivelTrava ?? item.travaLevel)
    : undefined;
  const responsabilidadeCliente = (item.responsabilidadeCliente ?? item.clientResponsibility) === true;
  let colunaKanban = item.colunaKanban ?? item.statusBoard ?? item.boardStatus;
  if (!STATUS_BOARD.has(colunaKanban)) colunaKanban = responsabilidadeCliente ? "responsabilidade_cliente" : "a_fazer";
  return {
    idTemporario: idTemporario(item.idTemporario ?? item.id, `${idFase}-item-${indice + 1}`),
    titulo: redigir(titulo, 180),
    responsabilidadeCliente,
    ...(nivelTrava ? { nivelTrava } : {}),
    ...(texto(item.bloco, 80) ? { bloco: redigir(item.bloco, 80) } : {}),
    colunaKanban
  };
}

function normalizarFase(fase = {}, indice = 0, permitirGatesHumanos = false) {
  const nome = texto(fase.nome ?? fase.name, 120);
  if (!nome) return null;
  const id = idTemporario(fase.idTemporario ?? fase.id, `fase-${indice + 1}`);
  const itensOrigem = fase.itens ?? fase.checklist;
  const checklist = lista(itensOrigem, 50).map((item, itemIndice) => normalizarItem(item, itemIndice, id)).filter(Boolean);
  return {
    idTemporario: id,
    ordem: indice + 1,
    nome: redigir(nome, 120),
    visivelCliente: permitirGatesHumanos && fase.visivelCliente === true,
    exigeAprovacao: fase.exigeAprovacao === true || fase.requiresApproval === true,
    checklist
  };
}

function normalizarLink(link = {}, indice = 0, permitirGatesHumanos = false) {
  const titulo = texto(link.titulo ?? link.title, 140);
  const url = normalizarUrl(link.url);
  if (!titulo || !url) return null;
  const categoria = CATEGORIAS_LINK.has(link.categoria) ? link.categoria : "geral";
  return {
    idTemporario: idTemporario(link.idTemporario ?? link.id, `link-${indice + 1}`),
    titulo: redigir(titulo, 140),
    url,
    categoria,
    ...(texto(link.descricao ?? link.description, 280) ? { descricao: redigir(link.descricao ?? link.description, 280) } : {}),
    visivelCliente: permitirGatesHumanos && (link.visivelCliente ?? link.clientVisible) === true,
    revisado: permitirGatesHumanos && (link.revisado ?? link.reviewed) === true
  };
}

function normalizarPendencia(item = {}, indice = 0, permitirGatesHumanos = false) {
  const titulo = texto(item.titulo ?? item.title, 180);
  if (!titulo) return null;
  const prazo = texto(item.prazo ?? item.dueDate, 10);
  return {
    idTemporario: idTemporario(item.idTemporario ?? item.id, `pendencia-${indice + 1}`),
    titulo: redigir(titulo, 180),
    ...(texto(item.descricao ?? item.description, 500) ? { descricao: redigir(item.descricao ?? item.description, 500) } : {}),
    ...(texto(item.campo, 160) ? { campo: redigir(item.campo, 160) } : {}),
    obrigatoria: item.obrigatoria === true || item.required === true,
    // Prazo e responsabilidade são aceitos para compatibilidade com provedores,
    // mas a UI canônica não precisa exibi-los para revisar a pendência.
    responsabilidadeCliente: (item.responsabilidadeCliente ?? item.clientResponsibility) === true,
    ...( /^\d{4}-\d{2}-\d{2}$/.test(prazo) ? { prazo } : {}),
    revisado: permitirGatesHumanos && (item.revisado ?? item.reviewed) === true
  };
}

function normalizarRascunho(valor = {}, { permitirGatesHumanos = false } = {}) {
  const origem = valor && typeof valor === "object" ? valor : {};
  const clienteOrigem = origem.cliente && typeof origem.cliente === "object" ? origem.cliente : {};
  const projetoOrigem = origem.projeto && typeof origem.projeto === "object" ? origem.projeto : {};
  const nomeCliente = texto(clienteOrigem.nome ?? origem.clientName, 160);
  const plataformaRecebida = texto(projetoOrigem.plataforma ?? origem.platform, 40).toLowerCase();
  const tipoRecebido = texto(projetoOrigem.tipo ?? origem.type, 40).toLowerCase();
  const produtoRecebido = texto(projetoOrigem.produto ?? origem.product, 60).toLowerCase();
  const dataGoLive = texto(projetoOrigem.dataGoLive ?? origem.goLiveDate, 10);
  const fases = lista(origem.fases ?? origem.phases, 30)
    .map((fase, indice) => normalizarFase(fase, indice, permitirGatesHumanos)).filter(Boolean);
  const linksUteis = lista(origem.linksUteis ?? origem.usefulLinks, 30)
    .map((link, indice) => normalizarLink(link, indice, permitirGatesHumanos)).filter(Boolean);
  const pendencias = lista(origem.pendencias ?? origem.pendingItems, 50)
    .map((item, indice) => normalizarPendencia(item, indice, permitirGatesHumanos)).filter(Boolean);
  garantirIdsUnicos(fases, "idTemporario", "fase");
  let itensRestantes = 500;
  fases.forEach((fase) => {
    fase.checklist = fase.checklist.slice(0, itensRestantes);
    itensRestantes -= fase.checklist.length;
  });
  garantirIdsUnicos(fases.flatMap((fase) => fase.checklist), "idTemporario", "item");
  garantirIdsUnicos(linksUteis, "idTemporario", "link");
  garantirIdsUnicos(pendencias, "idTemporario", "pendencia");

  return {
    cliente: {
      nome: redigir(nomeCliente, 160),
      ...(texto(clienteOrigem.nomeOrganizacaoSugerida, 160)
        ? { nomeOrganizacaoSugerida: redigir(clienteOrigem.nomeOrganizacaoSugerida, 160) }
        : {}),
      ...(texto(clienteOrigem.segmento, 120) ? { segmento: redigir(clienteOrigem.segmento, 120) } : {})
    },
    projeto: {
      plataforma: PLATAFORMAS.has(plataformaRecebida) ? plataformaRecebida : "outro",
      tipo: TIPOS.has(tipoRecebido) ? tipoRecebido : "implantacao",
      produto: PRODUTOS.has(produtoRecebido) ? produtoRecebido : "ecommerce",
      ...( /^\d{4}-\d{2}-\d{2}$/.test(dataGoLive) ? { dataGoLive } : {}),
      ...(texto(projetoOrigem.proximaAcao ?? origem.nextAction, 280)
        ? { proximaAcao: redigir(projetoOrigem.proximaAcao ?? origem.nextAction, 280) }
        : {}),
      ...(texto(projetoOrigem.resumoEscopo, 1200) ? { resumoEscopo: redigir(projetoOrigem.resumoEscopo, 1200) } : {})
    },
    fases,
    linksUteis,
    pendencias
  };
}

function normalizarCampos(valor) {
  return lista(valor, 100).map((item) => {
    if (!item || typeof item !== "object") return null;
    const campo = redigir(item.campo ?? item.field, 160);
    if (!campo) return null;
    const confianca = Number(item.confianca ?? item.confidence);
    const campoSensivel = /senha|password|passwd|secret|token|api.?key|authorization/i.test(campo);
    return {
      campo,
      ...(texto(item.rotulo ?? item.label, 160) ? { rotulo: redigir(item.rotulo ?? item.label, 160) } : {}),
      ...(["string", "number", "boolean"].includes(typeof item.valor)
        ? { valor: campoSensivel ? "[DADO SENSÍVEL REMOVIDO]" : (typeof item.valor === "string" ? redigir(item.valor, 500) : item.valor) }
        : {}),
      ...(Number.isFinite(confianca) ? { confianca: Math.max(0, Math.min(1, confianca)) } : {}),
      ...(lista(item.fonteIds ?? item.sourceIds, 20).length
        ? { fonteIds: lista(item.fonteIds ?? item.sourceIds, 20).map((id) => texto(id, 100)).filter(Boolean) }
        : {})
    };
  }).filter(Boolean);
}

function normalizarFontes(valor) {
  const fontes = lista(valor, 100).map((item, indice) => {
    if (!item || typeof item !== "object") return null;
    const pagina = Number(item.pagina ?? item.page);
    return {
      id: idTemporario(item.id, `fonte-${indice + 1}`),
      ...(Number.isInteger(pagina) && pagina >= 1 && pagina <= 10000 ? { pagina } : {}),
      ...(texto(item.trecho ?? item.excerpt, 280) ? { trecho: redigir(item.trecho ?? item.excerpt, 280) } : {}),
      ...(texto(item.rotulo ?? item.label ?? item.campo ?? item.field, 160)
        ? { rotulo: redigir(item.rotulo ?? item.label ?? item.campo ?? item.field, 160) }
        : {})
    };
  }).filter(Boolean);
  garantirIdsUnicos(fontes, "id", "fonte");
  return fontes;
}

function validarRascunho(rascunho, avisosExternos = [], segredoDetectado = false) {
  const bloqueios = [];
  const avisos = lista(avisosExternos, 30).map((item) => redigir(item, 240)).filter(Boolean);
  if (!rascunho.cliente.nome) bloqueios.push("Informe o nome do cliente.");
  if (!rascunho.fases.length) avisos.push("Nenhuma fase foi sugerida; o template padrão poderá ser usado.");
  const itens = rascunho.fases.reduce((total, fase) => total + fase.checklist.length, 0);
  if (rascunho.fases.length && !itens) avisos.push("As fases sugeridas ainda não possuem itens de checklist.");
  if (segredoDetectado) bloqueios.push("Foi identificado um possível segredo, token ou senha. Revise o conteúdo de origem e remova credenciais.");
  return {
    valido: bloqueios.length === 0,
    bloqueios: [...new Set(bloqueios)].slice(0, 30),
    avisos: [...new Set(avisos)].slice(0, 30)
  };
}

function raizSaidaNaira(saida = {}) {
  if (!saida || typeof saida !== "object" || Array.isArray(saida)) return {};
  for (const chave of ["data", "resultado", "result", "output"]) {
    if (saida[chave] && typeof saida[chave] === "object" && !Array.isArray(saida[chave])) return saida[chave];
  }
  return saida;
}

function normalizarSaidaNaira(saida = {}, { permitirGatesHumanos = false } = {}) {
  const raiz = raizSaidaNaira(saida);
  const rascunho = normalizarRascunho(raiz.rascunho ?? raiz.draft ?? raiz, { permitirGatesHumanos });
  const validacaoExterna = raiz.validacao ?? raiz.validation ?? {};
  return {
    rascunho,
    campos: normalizarCampos(raiz.campos ?? raiz.fields),
    fontes: normalizarFontes(raiz.fontes ?? raiz.sources),
    validacao: validarRascunho(
      rascunho,
      validacaoExterna.avisos ?? validacaoExterna.alertas ?? validacaoExterna.warnings,
      conteudoTemSegredo(raiz)
    )
  };
}

function sanitizarPublico(importacao) {
  if (!importacao) return null;
  const arquivo = importacao.arquivo ? {
    nomeOriginal: importacao.arquivo.nomeOriginal,
    mimeType: importacao.arquivo.mimeType,
    tamanhoBytes: importacao.arquivo.tamanhoBytes,
    ...(importacao.arquivo.sha256 ? { sha256: importacao.arquivo.sha256 } : {}),
    armazenado: importacao.arquivo.armazenado === true
  } : null;
  const provedor = importacao.provedor ? {
    nome: importacao.provedor.nome || "naira",
    modo: importacao.provedor.modo,
    tentativas: Number(importacao.provedor.tentativas) || 0,
    ...(importacao.provedor.requisicaoId ? { requisicaoId: importacao.provedor.requisicaoId } : {})
  } : null;
  return {
    id: importacao.id,
    origem: importacao.origem,
    status: importacao.status,
    versao: importacao.versao,
    arquivo,
    provedor,
    rascunho: importacao.rascunho || null,
    campos: importacao.campos || [],
    fontes: importacao.fontes || [],
    validacao: importacao.validacao || null,
    erro: importacao.erro || null,
    projetoId: importacao.projetoId || null,
    criadoPor: importacao.criadoPor,
    auditoria: importacao.auditoria || [],
    criadoEm: importacao.criadoEm,
    atualizadoEm: importacao.atualizadoEm
  };
}

function persistenciaPronta() {
  return config.env !== "production" || getRepo().kind === "mongo";
}

function exigirPersistencia() {
  if (!persistenciaPronta()) {
    throw erroHttp("Importações exigem MongoDB em produção para não perder dados.", 503, "persistence_required");
  }
}

function podeAcessar(importacao, usuario) {
  return !!usuario && (usuario.role === "admin" || importacao.criadoPor === usuario.id);
}

function exigirAcesso(importacao, usuario) {
  if (!importacao || !podeAcessar(importacao, usuario)) throw erroHttp("Importação não encontrada.", 404, "import_not_found");
}

function normalizarMetadadosArquivo(body = {}) {
  const nome = texto(body.nomeArquivo, 180)
    .replace(/[\\/]/g, "-")
    .split("")
    .map((caractere) => {
      const codigo = caractere.charCodeAt(0);
      return codigo <= 31 || codigo === 127 ? " " : caractere;
    })
    .join("");
  const mimeType = texto(body.mimeType, 80).toLowerCase();
  const tamanhoBytes = Number(body.tamanhoBytes);
  if (!nome || !/\.pdf$/i.test(nome)) throw erroHttp("Informe um arquivo com extensão .pdf.");
  if (mimeType !== "application/pdf") throw erroHttp("O arquivo deve ter o tipo application/pdf.", 415, "invalid_media_type");
  if (!Number.isInteger(tamanhoBytes) || tamanhoBytes <= 0 || tamanhoBytes > config.naira.maxPdfBytes) {
    throw erroHttp(`O PDF deve ter no máximo ${config.naira.maxPdfBytes} bytes.`, 413, "file_too_large");
  }
  return { nomeOriginal: nome, mimeType, tamanhoBytes, armazenado: false };
}

function mesmosMetadadosArquivo(primeiro, segundo) {
  return primeiro?.nomeOriginal === segundo?.nomeOriginal
    && primeiro?.mimeType === segundo?.mimeType
    && primeiro?.tamanhoBytes === segundo?.tamanhoBytes;
}

function normalizarChave(valor) {
  const chave = texto(valor, 128);
  if (chave.length < 8 || !/^[A-Za-z0-9._:-]+$/.test(chave)) {
    throw erroHttp("Envie um Idempotency-Key válido com pelo menos 8 caracteres.", 400, "invalid_idempotency_key");
  }
  return chave;
}

async function criarImportacao(body, chaveIdempotencia, usuario) {
  exigirPersistencia();
  const statusNaira = nairaClient.statusIntegracao(persistenciaPronta());
  if (!statusNaira.habilitada) {
    throw erroHttp(statusNaira.motivo || "A integração com a Naira não está disponível.", 503, "naira_unavailable");
  }
  const repo = getRepo();
  const chave = normalizarChave(chaveIdempotencia);
  const arquivo = normalizarMetadadosArquivo(body);
  const existente = await repo.findProjectImportByIdempotency(usuario.id, chave);
  if (existente) {
    if (!mesmosMetadadosArquivo(existente.arquivo, arquivo)) {
      throw erroHttp("O Idempotency-Key já foi usado com outro arquivo.", 409, "idempotency_conflict");
    }
    return { importacao: sanitizarPublico(existente), criada: false };
  }
  const instante = agora();
  const importacao = {
    id: `imp-${crypto.randomUUID()}`,
    chaveIdempotencia: chave,
    criadoPor: usuario.id,
    origem: "painel",
    status: "aguardando_arquivo",
    versao: 1,
    arquivo,
    provedor: { nome: "naira", modo: config.naira.mode, tentativas: 0 },
    rascunho: null,
    campos: [],
    fontes: [],
    validacao: null,
    erro: null,
    projetoId: null,
    auditoria: [evento("importacao_criada", usuario.id)],
    criadoEm: instante,
    atualizadoEm: instante
  };
  try {
    await repo.insertProjectImport(importacao);
    return { importacao: sanitizarPublico(importacao), criada: true };
  } catch (erro) {
    if (erro && erro.code === 11000) {
      const concorrente = await repo.findProjectImportByIdempotency(usuario.id, chave);
      if (concorrente) {
        if (!mesmosMetadadosArquivo(concorrente.arquivo, arquivo)) {
          throw erroHttp("O Idempotency-Key já foi usado com outro arquivo.", 409, "idempotency_conflict");
        }
        return { importacao: sanitizarPublico(concorrente), criada: false };
      }
    }
    throw erro;
  }
}

async function obterInterna(id, usuario) {
  exigirPersistencia();
  const importacao = await getRepo().getProjectImport(id);
  exigirAcesso(importacao, usuario);
  return importacao;
}

async function listarImportacoes(usuario) {
  exigirPersistencia();
  const todas = await getRepo().listProjectImports();
  return todas.filter((item) => podeAcessar(item, usuario)).map(sanitizarPublico);
}

async function obterImportacao(id, usuario) {
  return sanitizarPublico(await obterInterna(id, usuario));
}

function validarPdf(buffer, esperado) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8) throw erroHttp("O PDF enviado está vazio ou inválido.", 400, "invalid_pdf");
  if (buffer.length > config.naira.maxPdfBytes) throw erroHttp("O PDF excede o limite permitido.", 413, "file_too_large");
  if (buffer.length !== esperado) throw erroHttp("O tamanho enviado difere do tamanho informado na criação.", 400, "file_size_mismatch");
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") throw erroHttp("O conteúdo enviado não é um PDF válido.", 400, "invalid_pdf");
}

async function processarComNaira(importacao, atorId) {
  const repo = getRepo();
  const arquivo = await repo.getProjectImportFile(importacao.id);
  if (!arquivo) {
    const versaoAnterior = importacao.versao;
    importacao.status = "falhou";
    importacao.erro = { codigo: "file_expired", mensagem: "O PDF não está mais disponível. Inicie uma nova importação.", recuperavel: false };
    incrementar(importacao);
    auditar(importacao, "processamento_falhou", atorId, { codigo: "file_expired" });
    const salva = await repo.updateProjectImport(importacao, versaoAnterior);
    return sanitizarPublico(salva || await repo.getProjectImport(importacao.id));
  }
  const hashArquivo = crypto.createHash("sha256").update(arquivo.conteudo).digest("hex");
  if (!importacao.arquivo?.sha256 || hashArquivo !== importacao.arquivo.sha256) {
    const versaoAnterior = importacao.versao;
    importacao.status = "falhou";
    importacao.erro = {
      codigo: "file_integrity_mismatch",
      mensagem: "A integridade do PDF não pôde ser confirmada. Inicie uma nova importação.",
      recuperavel: false
    };
    incrementar(importacao);
    auditar(importacao, "processamento_falhou", atorId, { codigo: "file_integrity_mismatch" });
    const salva = await repo.updateProjectImport(importacao, versaoAnterior);
    return sanitizarPublico(salva || await repo.getProjectImport(importacao.id));
  }

  const versaoAntesDoEnvio = importacao.versao;
  importacao.status = "enviando_naira";
  importacao.provedor = {
    nome: "naira",
    modo: config.naira.mode,
    tentativas: Number(importacao.provedor?.tentativas || 0) + 1,
    ultimaInteracaoEm: agora()
  };
  importacao.erro = null;
  incrementar(importacao);
  auditar(importacao, "envio_naira_iniciado", atorId);
  const envioPersistido = await repo.updateProjectImport(importacao, versaoAntesDoEnvio);
  if (!envioPersistido) return sanitizarPublico(await repo.getProjectImport(importacao.id));
  importacao = envioPersistido;
  const versaoDoEnvio = importacao.versao;
  const tentativaDoEnvio = importacao.provedor.tentativas;

  let resposta;
  let falha;
  try {
    resposta = await nairaClient.analisar({ importacao, arquivo });
  } catch (erro) {
    falha = erro;
  }

  // Cancela/revisão/callback podem ocorrer enquanto a chamada externa está em
  // voo. Sempre relê antes de persistir para não sobrescrever o estado novo.
  const atual = await repo.getProjectImport(importacao.id);
  if (!atual
    || atual.status !== "enviando_naira"
    || atual.versao !== versaoDoEnvio
    || atual.provedor?.tentativas !== tentativaDoEnvio) {
    return sanitizarPublico(atual);
  }
  importacao = atual;

  if (!falha) {
    if (resposta.assincrono) {
      importacao.status = "processando_naira";
      importacao.provedor.requisicaoId = resposta.idExterno;
      incrementar(importacao);
      auditar(importacao, "processamento_naira_aceito", "naira");
    } else {
      const normalizada = normalizarSaidaNaira(resposta.resultado);
      Object.assign(importacao, normalizada);
      importacao.status = "aguardando_revisao";
      incrementar(importacao);
      auditar(importacao, "rascunho_recebido", "naira");
    }
  } else {
    importacao.status = "falhou";
    importacao.erro = {
      codigo: texto(falha.codigo || "naira_error", 80),
      mensagem: redigir(falha.message || "Falha ao analisar o PDF com a Naira.", 300),
      recuperavel: falha.retryable !== false
    };
    incrementar(importacao);
    auditar(importacao, "processamento_falhou", atorId, { codigo: importacao.erro.codigo });
  }
  const salva = await repo.updateProjectImport(importacao, versaoDoEnvio);
  return sanitizarPublico(salva || await repo.getProjectImport(importacao.id));
}

function agendarProcessamento(id, atorId = "sistema") {
  setImmediate(async () => {
    if (processamentosAtivos.has(id)) return;
    processamentosAtivos.add(id);
    try {
      const importacao = await getRepo().getProjectImport(id);
      if (!importacao || !["na_fila", "enviando_naira"].includes(importacao.status)) return;
      await processarComNaira(importacao, atorId);
    } catch {
      // O próprio processamento persiste falhas esperadas. Uma exceção de
      // infraestrutura será retomada no próximo boot/retry sem logar conteúdo.
    } finally {
      processamentosAtivos.delete(id);
    }
  });
}

async function retomarImportacoesPendentes() {
  if (!persistenciaPronta()) return;
  const repo = getRepo();
  const todas = await repo.listProjectImports();
  const pendentes = todas
    .filter((item) => item.status === "na_fila" || item.status === "enviando_naira");
  pendentes.forEach((item) => agendarProcessamento(item.id, "retomada_boot"));
  for (const importacao of todas.filter((item) => item.status === "criando_projeto")) {
    const versaoAnterior = importacao.versao;
    const projetoId = idProjetoDaImportacao(importacao.id);
    if (await repo.getProject(projetoId)) {
      importacao.status = "concluida";
      importacao.projetoId = projetoId;
      importacao.erro = null;
      auditar(importacao, "criacao_recuperada_no_boot", "sistema", { projetoId });
      await repo.deleteProjectImportFile(importacao.id);
    } else {
      importacao.status = "aguardando_revisao";
      importacao.validacao = importacao.validacao || { valido: true, bloqueios: [], avisos: [] };
      importacao.validacao.avisos = [
        ...(importacao.validacao.avisos || []),
        "A criação anterior foi interrompida. Revise e confirme o projeto novamente."
      ].slice(-30);
      auditar(importacao, "criacao_interrompida_recuperada", "sistema");
    }
    incrementar(importacao);
    await repo.updateProjectImport(importacao, versaoAnterior);
  }
}

async function enviarArquivo(id, buffer, versao, usuario) {
  const repo = getRepo();
  const importacao = await obterInterna(id, usuario);
  exigirVersao(importacao, versao);
  if (importacao.status !== "aguardando_arquivo") throw erroHttp("Esta importação não aceita mais arquivo.", 409, "invalid_status");
  const versaoAnterior = importacao.versao;
  validarPdf(buffer, importacao.arquivo.tamanhoBytes);
  const expiraEm = new Date(Date.now() + config.naira.fileRetentionMs).toISOString();
  const arquivoArmazenado = await repo.putProjectImportFile(importacao.id, {
    conteudo: Buffer.from(buffer),
    mimeType: "application/pdf",
    tamanhoBytes: buffer.length,
    expiraEm
  });
  const hashSolicitado = crypto.createHash("sha256").update(buffer).digest("hex");
  const hashArmazenado = arquivoArmazenado && crypto
    .createHash("sha256")
    .update(arquivoArmazenado.conteudo)
    .digest("hex");
  if (!hashArmazenado || hashArmazenado !== hashSolicitado) {
    throw erroHttp("Outro PDF já foi enviado para esta importação.", 409, "file_upload_conflict");
  }
  importacao.arquivo = {
    ...importacao.arquivo,
    armazenado: true,
    sha256: hashSolicitado,
    expiraEm: new Date(arquivoArmazenado.expiraEm).toISOString()
  };
  importacao.status = "na_fila";
  incrementar(importacao);
  auditar(importacao, "arquivo_recebido", usuario.id, { tamanhoBytes: buffer.length });
  await persistirVersionado(importacao, versaoAnterior);
  agendarProcessamento(importacao.id, usuario.id);
  return sanitizarPublico(importacao);
}

async function atualizarRascunho(id, body, usuario) {
  const importacao = await obterInterna(id, usuario);
  exigirVersao(importacao, body.versao);
  if (importacao.status !== "aguardando_revisao") throw erroHttp("O rascunho ainda não está disponível para revisão.", 409, "invalid_status");
  const versaoAnterior = importacao.versao;
  const normalizada = normalizarSaidaNaira({
    rascunho: body.rascunho,
    campos: importacao.campos,
    fontes: importacao.fontes
  }, { permitirGatesHumanos: true });
  Object.assign(importacao, normalizada);
  importacao.erro = null;
  incrementar(importacao);
  auditar(importacao, "rascunho_revisado", usuario.id);
  await persistirVersionado(importacao, versaoAnterior);
  return sanitizarPublico(importacao);
}

async function repetir(id, body, usuario) {
  const importacao = await obterInterna(id, usuario);
  exigirVersao(importacao, body.versao);
  if (importacao.status !== "falhou") throw erroHttp("Somente importações com falha podem ser reenviadas.", 409, "invalid_status");
  if (importacao.erro && importacao.erro.recuperavel === false) throw erroHttp(importacao.erro.mensagem, 409, "not_retryable");
  const versaoAnterior = importacao.versao;
  importacao.status = "na_fila";
  importacao.erro = null;
  incrementar(importacao);
  auditar(importacao, "reprocessamento_solicitado", usuario.id);
  await persistirVersionado(importacao, versaoAnterior);
  agendarProcessamento(importacao.id, usuario.id);
  return sanitizarPublico(importacao);
}

async function cancelar(id, body, usuario) {
  const importacao = await obterInterna(id, usuario);
  exigirVersao(importacao, body.versao);
  if (importacao.status === "criando_projeto") {
    throw erroHttp("O projeto já está sendo criado e esta operação não pode mais ser cancelada.", 409, "invalid_status");
  }
  if (STATUS_TERMINAIS.has(importacao.status)) {
    if (importacao.status === "cancelada") return sanitizarPublico(importacao);
    throw erroHttp("Uma importação concluída não pode ser cancelada.", 409, "invalid_status");
  }
  const versaoAnterior = importacao.versao;
  importacao.status = "cancelada";
  importacao.erro = null;
  incrementar(importacao);
  auditar(importacao, "importacao_cancelada", usuario.id);
  await persistirVersionado(importacao, versaoAnterior);
  await getRepo().deleteProjectImportFile(importacao.id);
  return sanitizarPublico(importacao);
}

function idProjetoDaImportacao(id) {
  return `prj-${String(id).replace(/^imp-/, "")}`;
}

async function concluirSeProjetoExistir(importacao, usuario) {
  const projetoId = idProjetoDaImportacao(importacao.id);
  const projeto = await getRepo().getProject(projetoId);
  if (!projeto) return null;
  const versaoAnterior = importacao.versao;
  importacao.status = "concluida";
  importacao.projetoId = projetoId;
  importacao.erro = null;
  incrementar(importacao);
  auditar(importacao, "projeto_confirmado", usuario.id, { projetoId });
  const salva = await getRepo().updateProjectImport(importacao, versaoAnterior);
  if (!salva) {
    const atual = await getRepo().getProjectImport(importacao.id);
    if (atual?.status === "concluida") return sanitizarPublico(atual);
    throw erroHttp("A importação mudou durante a confirmação. Consulte o estado atual.", 409, "version_conflict");
  }
  await getRepo().deleteProjectImportFile(importacao.id);
  return sanitizarPublico(importacao);
}

async function confirmar(id, body, usuario) {
  const importacao = await obterInterna(id, usuario);
  if (importacao.status === "concluida") return sanitizarPublico(importacao);
  if (importacao.status === "criando_projeto") {
    const recuperada = await concluirSeProjetoExistir(importacao, usuario);
    if (recuperada) return recuperada;
  }
  exigirVersao(importacao, body.versao);
  if (importacao.status !== "aguardando_revisao" && importacao.status !== "criando_projeto") {
    throw erroHttp("A importação precisa estar aguardando revisão para ser confirmada.", 409, "invalid_status");
  }
  if (typeof body.usarFasesSugeridas !== "boolean") {
    throw erroHttp("Confirme se deseja usar as fases sugeridas pela Naira.");
  }
  const organizationId = texto(body.organizationId, 120);
  if (!organizationId) throw erroHttp("Selecione a organização do projeto.");
  const organizacoes = await getRepo().listOrganizations();
  if (!organizacoes.some((organizacao) => organizacao.id === organizationId)) {
    throw erroHttp("A organização selecionada não existe ou não está disponível.", 422, "invalid_organization");
  }

  if (body.rascunho !== undefined) {
    const normalizada = normalizarSaidaNaira({
      rascunho: body.rascunho,
      campos: importacao.campos,
      fontes: importacao.fontes
    }, { permitirGatesHumanos: true });
    Object.assign(importacao, normalizada);
    auditar(importacao, "rascunho_revisado_na_confirmacao", usuario.id);
  }
  if (!importacao.validacao?.valido) throw erroHttp("Corrija os campos obrigatórios antes de criar o projeto.", 422, "invalid_draft");
  if (body.usarFasesSugeridas && !importacao.rascunho.fases.length) {
    throw erroHttp("A Naira não sugeriu fases válidas. Use o template padrão ou revise o rascunho.", 422, "invalid_draft");
  }

  const versaoAnterior = importacao.versao;
  importacao.status = "criando_projeto";
  importacao.erro = null;
  incrementar(importacao);
  auditar(importacao, "criacao_projeto_iniciada", usuario.id, { usarFasesSugeridas: body.usarFasesSugeridas });
  await persistirVersionado(importacao, versaoAnterior);

  const rascunho = importacao.rascunho;
  const projetoId = idProjetoDaImportacao(importacao.id);
  try {
    await projectService.createProjectFromImport({
      id: projetoId,
      input: {
        clientName: rascunho.cliente.nome,
        organizationId,
        platform: rascunho.projeto.plataforma,
        type: rascunho.projeto.tipo,
        product: rascunho.projeto.produto,
        goLiveDate: rascunho.projeto.dataGoLive,
        nextAction: rascunho.projeto.proximaAcao,
        templateNotes: rascunho.projeto.resumoEscopo
      },
      fases: body.usarFasesSugeridas ? rascunho.fases : undefined,
      linksUteis: rascunho.linksUteis.filter((item) => item.revisado),
      pendencias: rascunho.pendencias.filter((item) => item.revisado),
      importacaoOrigemId: importacao.id
    });
  } catch (erro) {
    if (erro && erro.code === 11000 && await getRepo().getProject(projetoId)) {
      return concluirSeProjetoExistir(importacao, usuario);
    }
    importacao.status = "falhou";
    importacao.erro = { codigo: "project_creation_failed", mensagem: "Não foi possível criar o projeto revisado.", recuperavel: true };
    incrementar(importacao);
    auditar(importacao, "criacao_projeto_falhou", usuario.id);
    await getRepo().updateProjectImport(importacao, importacao.versao - 1);
    throw erroHttp(importacao.erro.mensagem, 500, importacao.erro.codigo);
  }
  return concluirSeProjetoExistir(importacao, usuario);
}

async function receberCallback(body) {
  exigirPersistencia();
  const id = texto(body.importId, 120);
  const importacao = await getRepo().getProjectImport(id);
  if (!importacao) throw erroHttp("Importação não encontrada.", 404, "import_not_found");
  if (importacao.status === "cancelada" || importacao.status === "concluida") return sanitizarPublico(importacao);
  const idExterno = texto(body.providerJobId ?? body.idExterno, 180);
  if (importacao.provedor?.requisicaoId && idExterno !== importacao.provedor.requisicaoId) {
    throw erroHttp("Identificador do processamento não corresponde à importação.", 409, "provider_id_mismatch");
  }
  // Callback repetido ou atrasado nunca pode sobrescrever uma revisão humana.
  if (importacao.status === "aguardando_revisao") return sanitizarPublico(importacao);
  if (!["enviando_naira", "processando_naira"].includes(importacao.status)) {
    throw erroHttp("A importação não está aguardando retorno da Naira.", 409, "invalid_status");
  }
  const versaoAnterior = importacao.versao;
  const status = texto(body.status, 40).toLowerCase();
  if (["completed", "concluida", "success"].includes(status)) {
    const normalizada = normalizarSaidaNaira(body.resultado ?? body.result ?? body.data);
    Object.assign(importacao, normalizada);
    importacao.status = "aguardando_revisao";
    importacao.erro = null;
    incrementar(importacao);
    auditar(importacao, "rascunho_recebido_callback", "naira");
  } else if (["failed", "falhou", "error"].includes(status)) {
    importacao.status = "falhou";
    importacao.erro = {
      codigo: "naira_processing_failed",
      mensagem: pareceSegredo(body.mensagem ?? body.error)
        ? "A Naira não concluiu a análise e retornou conteúdo sensível, que foi removido."
        : texto(body.mensagem ?? body.error, 300) || "A Naira não concluiu a análise.",
      recuperavel: true
    };
    incrementar(importacao);
    auditar(importacao, "processamento_falhou_callback", "naira");
  } else if (["processing", "processando"].includes(status)) {
    importacao.status = "processando_naira";
    incrementar(importacao);
    auditar(importacao, "processamento_atualizado_callback", "naira");
  } else {
    throw erroHttp("Status de callback inválido.");
  }
  importacao.provedor.ultimaInteracaoEm = agora();
  const salva = await getRepo().updateProjectImport(importacao, versaoAnterior);
  return sanitizarPublico(salva || await getRepo().getProjectImport(importacao.id));
}

function nomeArquivoJsonManual(valor) {
  if (pareceSegredo(valor)) return "importacao-naira.json";
  let nome = texto(valor || "importacao-naira.json", 180)
    .replace(/[\\/]/g, "-")
    .split("")
    .map((caractere) => {
      const codigo = caractere.charCodeAt(0);
      return codigo <= 31 || codigo === 127 ? " " : caractere;
    })
    .join("")
    .trim();
  if (!nome) nome = "importacao-naira.json";
  if (!/\.json$/i.test(nome)) nome = `${nome}.json`;
  return nome.slice(0, 180);
}

function tamanhoEntradaJson(body, tamanhoInformado) {
  if (Number.isInteger(tamanhoInformado) && tamanhoInformado > 0) return tamanhoInformado;
  try {
    return Buffer.byteLength(JSON.stringify(body), "utf8");
  } catch {
    throw erroHttp("O JSON informado não pôde ser serializado.", 400, "invalid_json_payload");
  }
}

function prepararEntradaJsonManual(body, { tamanhoBytes, nomeArquivo } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw erroHttp("Envie um objeto JSON no contrato de saída da Naira.", 422, "invalid_naira_contract");
  }
  const tamanho = tamanhoEntradaJson(body, tamanhoBytes);
  if (tamanho <= 0 || tamanho > config.naira.maxManualJsonBytes) {
    throw erroHttp(
      `O JSON manual deve ter no máximo ${config.naira.maxManualJsonBytes} bytes.`,
      413,
      "json_payload_too_large"
    );
  }

  const raiz = raizSaidaNaira(body);
  const chavesContrato = [
    "rascunho", "draft", "cliente", "clientName", "projeto", "fases", "phases",
    "campos", "fields", "fontes", "sources"
  ];
  if (!chavesContrato.some((chave) => Object.prototype.hasOwnProperty.call(raiz, chave))) {
    throw erroHttp("O JSON não possui campos reconhecidos do contrato da Naira.", 422, "invalid_naira_contract");
  }
  const versaoContrato = texto(
    body.contractVersion ?? body.versaoContrato ?? raiz.contractVersion ?? raiz.versaoContrato,
    40
  );
  if (versaoContrato && versaoContrato !== config.naira.contractVersion) {
    throw erroHttp(
      `Versão de contrato não suportada. Use ${config.naira.contractVersion}.`,
      422,
      "unsupported_contract_version"
    );
  }

  const normalizada = normalizarSaidaNaira(body);
  if (conteudoTemSegredo(body) || pareceSegredo(nomeArquivo)) {
    const bloqueio = "Foi identificado um possível segredo, token ou senha. Revise o conteúdo de origem e remova credenciais.";
    normalizada.validacao.bloqueios = [...new Set([...normalizada.validacao.bloqueios, bloqueio])].slice(0, 30);
    normalizada.validacao.valido = false;
  }
  const arquivo = {
    nomeOriginal: nomeArquivoJsonManual(nomeArquivo),
    mimeType: "application/json",
    tamanhoBytes: tamanho,
    armazenado: false
  };
  const assinaturaEntrada = crypto
    .createHash("sha256")
    .update(JSON.stringify({ arquivo: arquivo.nomeOriginal, normalizada }))
    .digest("hex");
  return { normalizada, arquivo, assinaturaEntrada };
}

async function criarEntradaJsonManual(body, opcoes, usuario) {
  exigirPersistencia();
  const repo = getRepo();
  const chave = normalizarChave(opcoes.chaveIdempotencia);
  const preparada = prepararEntradaJsonManual(body, opcoes);
  const existente = await repo.findProjectImportByIdempotency(usuario.id, chave);
  if (existente) {
    const assinaturaOriginal = existente.assinaturaCriacaoJson || existente.assinaturaEntrada;
    if (existente.origem !== "json_manual" || assinaturaOriginal !== preparada.assinaturaEntrada) {
      throw erroHttp("O Idempotency-Key já foi usado com outro conteúdo.", 409, "idempotency_conflict");
    }
    return { importacao: sanitizarPublico(existente), criada: false };
  }

  const instante = agora();
  const importacao = {
    id: `imp-${crypto.randomUUID()}`,
    chaveIdempotencia: chave,
    criadoPor: usuario.id,
    origem: "json_manual",
    assinaturaEntrada: preparada.assinaturaEntrada,
    assinaturaCriacaoJson: preparada.assinaturaEntrada,
    status: "aguardando_revisao",
    versao: 1,
    arquivo: preparada.arquivo,
    provedor: { nome: "naira", modo: "manual", tentativas: 0 },
    ...preparada.normalizada,
    erro: null,
    projetoId: null,
    auditoria: [evento("entrada_json_manual_criada", usuario.id, { tamanhoBytes: preparada.arquivo.tamanhoBytes })],
    criadoEm: instante,
    atualizadoEm: instante
  };
  try {
    await repo.insertProjectImport(importacao);
    return { importacao: sanitizarPublico(importacao), criada: true };
  } catch (erro) {
    if (erro && erro.code === 11000) {
      const concorrente = await repo.findProjectImportByIdempotency(usuario.id, chave);
      const assinaturaOriginal = concorrente && (concorrente.assinaturaCriacaoJson || concorrente.assinaturaEntrada);
      if (concorrente && concorrente.origem === "json_manual" && assinaturaOriginal === preparada.assinaturaEntrada) {
        return { importacao: sanitizarPublico(concorrente), criada: false };
      }
      if (concorrente) throw erroHttp("O Idempotency-Key já foi usado com outro conteúdo.", 409, "idempotency_conflict");
    }
    throw erro;
  }
}

async function atualizarEntradaJsonManual(id, body, opcoes, usuario) {
  const repo = getRepo();
  const importacao = await obterInterna(id, usuario);
  const chave = normalizarChave(opcoes.chaveIdempotencia);
  const preparada = prepararEntradaJsonManual(body, opcoes);
  if (importacao.ultimaChaveAtualizacaoJson === chave) {
    if (importacao.assinaturaEntrada !== preparada.assinaturaEntrada) {
      throw erroHttp("O Idempotency-Key da atualização já foi usado com outro conteúdo.", 409, "idempotency_conflict");
    }
    return { importacao: sanitizarPublico(importacao), atualizada: false };
  }
  exigirVersao(importacao, opcoes.versao);
  if (importacao.origem !== "json_manual" || importacao.status !== "aguardando_revisao") {
    throw erroHttp("Somente uma importação JSON aguardando revisão pode ser substituída.", 409, "invalid_status");
  }

  const versaoAnterior = importacao.versao;
  importacao.assinaturaEntrada = preparada.assinaturaEntrada;
  importacao.ultimaChaveAtualizacaoJson = chave;
  importacao.arquivo = preparada.arquivo;
  importacao.provedor = { nome: "naira", modo: "manual", tentativas: 0 };
  Object.assign(importacao, preparada.normalizada);
  importacao.erro = null;
  incrementar(importacao);
  auditar(importacao, "entrada_json_manual_atualizada", usuario.id, { tamanhoBytes: preparada.arquivo.tamanhoBytes });
  const salva = await repo.updateProjectImport(importacao, versaoAnterior);
  if (salva) return { importacao: sanitizarPublico(salva), atualizada: true };

  const concorrente = await repo.getProjectImport(importacao.id);
  if (concorrente?.ultimaChaveAtualizacaoJson === chave
    && concorrente.assinaturaEntrada === preparada.assinaturaEntrada) {
    return { importacao: sanitizarPublico(concorrente), atualizada: false };
  }
  throw erroHttp("A importação foi alterada por outra operação. Atualize os dados e tente novamente.", 409, "version_conflict");
}

async function criarEntradaM2M(body, chaveInformada) {
  exigirPersistencia();
  const criadoPor = texto(body.criadoPor, 120) || "integracao-naira";
  const chave = normalizarChave(chaveInformada || body.chaveExterna);
  const repo = getRepo();
  const normalizada = normalizarSaidaNaira(body);
  const assinaturaEntrada = crypto.createHash("sha256").update(JSON.stringify(normalizada)).digest("hex");
  const existente = await repo.findProjectImportByIdempotency(criadoPor, chave);
  if (existente) {
    if (existente.assinaturaEntrada !== assinaturaEntrada) {
      throw erroHttp("O Idempotency-Key já foi usado com outro conteúdo estruturado.", 409, "idempotency_conflict");
    }
    return { importacao: sanitizarPublico(existente), criada: false };
  }
  const instante = agora();
  const importacao = {
    id: `imp-${crypto.randomUUID()}`,
    chaveIdempotencia: chave,
    criadoPor,
    origem: "naira_m2m",
    assinaturaEntrada,
    status: "aguardando_revisao",
    versao: 1,
    arquivo: {
      nomeOriginal: texto(body.nomeArquivo, 180) || "Entrada estruturada da Naira",
      mimeType: "application/json",
      tamanhoBytes: 0,
      armazenado: false
    },
    provedor: { nome: "naira", modo: "m2m", tentativas: 1, requisicaoId: texto(body.idExterno, 180) || undefined },
    ...normalizada,
    erro: null,
    projetoId: null,
    auditoria: [evento("entrada_m2m_recebida", "naira")],
    criadoEm: instante,
    atualizadoEm: instante
  };
  try {
    await repo.insertProjectImport(importacao);
    return { importacao: sanitizarPublico(importacao), criada: true };
  } catch (erro) {
    if (erro && erro.code === 11000) {
      const concorrente = await repo.findProjectImportByIdempotency(criadoPor, chave);
      if (concorrente) {
        if (concorrente.assinaturaEntrada !== assinaturaEntrada) {
          throw erroHttp("O Idempotency-Key já foi usado com outro conteúdo estruturado.", 409, "idempotency_conflict");
        }
        return { importacao: sanitizarPublico(concorrente), criada: false };
      }
    }
    throw erro;
  }
}

module.exports = {
  criarImportacao,
  listarImportacoes,
  obterImportacao,
  enviarArquivo,
  atualizarRascunho,
  repetir,
  confirmar,
  cancelar,
  receberCallback,
  criarEntradaJsonManual,
  atualizarEntradaJsonManual,
  criarEntradaM2M,
  normalizarSaidaNaira,
  normalizarRascunho,
  sanitizarPublico,
  persistenciaPronta,
  versaoRecebida,
  agendarProcessamento,
  retomarImportacoesPendentes
};
