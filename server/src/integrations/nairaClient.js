const { config } = require("../config");

class ErroNaira extends Error {
  constructor(message, { codigo = "naira_error", status = 502, retryable = true } = {}) {
    super(message);
    this.name = "ErroNaira";
    this.codigo = codigo;
    this.status = status;
    this.retryable = retryable;
  }
}

function urlNairaValida(valor) {
  if (!valor) return false;
  try {
    const url = new URL(valor);
    if (url.username || url.password) return false;
    if (url.protocol === "https:") return true;
    return config.env !== "production"
      && url.protocol === "http:"
      && ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

function statusIntegracao(persistenciaPronta) {
  const { mode, baseUrl, apiKey, maxPdfBytes, maxManualJsonBytes, contractVersion } = config.naira;
  const baseValida = urlNairaValida(baseUrl);
  const callbackValido = !config.naira.callbackUrl || urlNairaValida(config.naira.callbackUrl);
  const configurada = mode === "mock" || (mode === "http" && baseValida && callbackValido && !!apiKey);
  let motivo;
  if (mode === "disabled") motivo = "Integração desabilitada neste ambiente.";
  else if (mode === "http" && !baseValida) motivo = "NAIRA_BASE_URL deve usar HTTPS; HTTP só é permitido para localhost fora de produção.";
  else if (mode === "http" && !callbackValido) motivo = "NAIRA_CALLBACK_URL deve usar HTTPS; HTTP só é permitido para localhost fora de produção.";
  else if (mode === "http" && !apiKey) motivo = "NAIRA_API_KEY é obrigatória no modo HTTP.";
  else if (!persistenciaPronta) motivo = "Importações exigem persistência MongoDB em produção.";
  return {
    modo: mode,
    habilitada: mode !== "disabled" && configurada && persistenciaPronta,
    configurada,
    persistenciaPronta,
    tamanhoMaximoPdfBytes: maxPdfBytes,
    tamanhoMaximoJsonBytes: maxManualJsonBytes,
    provedor: "naira",
    ...(motivo ? { motivo } : {}),
    versaoContrato: contractVersion
  };
}

function nomeClienteDoArquivo(nomeArquivo) {
  const base = String(nomeArquivo || "Projeto importado")
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return base || "Projeto importado";
}

function resultadoMock(importacao) {
  const cliente = nomeClienteDoArquivo(importacao.arquivo?.nomeOriginal);
  return {
    rascunho: {
      cliente: { nome: cliente },
      projeto: {
        plataforma: "outro",
        tipo: "implantacao",
        produto: "ecommerce"
      },
      fases: [
        {
          nome: "Kickoff e acessos",
          itens: [
            { titulo: "Realizar reunião de kickoff", responsabilidadeCliente: false },
            { titulo: "Receber acessos essenciais", responsabilidadeCliente: true, nivelTrava: "trava_inicio" }
          ]
        },
        {
          nome: "Escopo e planejamento",
          itens: [
            { titulo: "Validar escopo do projeto", responsabilidadeCliente: true, nivelTrava: "trava_inicio" },
            { titulo: "Aprovar cronograma", responsabilidadeCliente: true }
          ]
        },
        {
          nome: "Execução e homologação",
          itens: [
            { titulo: "Executar entregas previstas", responsabilidadeCliente: false },
            { titulo: "Homologar entregas", responsabilidadeCliente: true, nivelTrava: "trava_golive" }
          ]
        }
      ],
      linksUteis: [],
      pendencias: [
        {
          titulo: "Revisar dados extraídos pela Naira",
          descricao: "Confirme responsáveis, datas e escopo antes de criar o projeto.",
          responsabilidadeCliente: false,
          revisado: false
        }
      ]
    },
    campos: [
      { campo: "cliente.nome", confianca: 0.65 },
      { campo: "projeto.produto", confianca: 0.5 }
    ],
    fontes: [],
    validacao: {
      alertas: ["Modo de demonstração: revise todos os campos antes da confirmação."]
    }
  };
}

async function analisar({ importacao, arquivo }) {
  if (config.naira.mode === "disabled") {
    throw new ErroNaira("A integração com a Naira está desabilitada.", {
      codigo: "naira_disabled",
      status: 503,
      retryable: false
    });
  }
  if (config.naira.mode === "mock") {
    return { assincrono: false, resultado: resultadoMock(importacao) };
  }
  if (!statusIntegracao(true).configurada) {
    throw new ErroNaira("A integração com a Naira não está configurada.", {
      codigo: "naira_not_configured",
      status: 503,
      retryable: false
    });
  }

  const controle = new AbortController();
  const timeout = setTimeout(() => controle.abort(), config.naira.timeoutMs);
  try {
    const formulario = new FormData();
    formulario.append(
      "file",
      new Blob([arquivo.conteudo], { type: "application/pdf" }),
      importacao.arquivo.nomeOriginal
    );
    formulario.append("importId", importacao.id);
    formulario.append("contractVersion", config.naira.contractVersion);
    if (config.naira.callbackUrl) formulario.append("callbackUrl", config.naira.callbackUrl);

    const resposta = await fetch(`${config.naira.baseUrl}/imports`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.naira.apiKey}`,
        "Idempotency-Key": importacao.id
      },
      body: formulario,
      signal: controle.signal
    });
    let corpo = {};
    try {
      corpo = await resposta.json();
    } catch {
      corpo = {};
    }
    if (resposta.status === 202) {
      if (!config.naira.callbackUrl || !config.naira.callbackSecret) {
        throw new ErroNaira("A Naira iniciou processamento assíncrono, mas o callback seguro não está configurado.", {
          codigo: "naira_callback_not_configured",
          status: 503,
          retryable: false
        });
      }
      const idExterno = String(corpo.id || corpo.jobId || corpo.importId || "").trim();
      if (!idExterno) {
        throw new ErroNaira("A Naira aceitou o arquivo, mas não retornou o identificador do processamento.");
      }
      return { assincrono: true, idExterno: idExterno.slice(0, 180) };
    }
    if (!resposta.ok) {
      throw new ErroNaira("A Naira recusou a solicitação de análise.", {
        codigo: "naira_http_error",
        status: 502,
        retryable: resposta.status >= 500 || resposta.status === 429
      });
    }
    return { assincrono: false, resultado: corpo };
  } catch (erro) {
    if (erro instanceof ErroNaira) throw erro;
    if (erro && erro.name === "AbortError") {
      throw new ErroNaira("A Naira não respondeu dentro do tempo limite.", { codigo: "naira_timeout" });
    }
    throw new ErroNaira("Não foi possível comunicar com a Naira.", { codigo: "naira_unavailable" });
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { ErroNaira, analisar, statusIntegracao, resultadoMock, urlNairaValida };
