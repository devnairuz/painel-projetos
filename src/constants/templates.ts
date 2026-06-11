import type { FinalizationConfig, Product } from '@/types'

/** Rótulo e descrição de cada Produto. */
export const PRODUCT_META: Record<Product, { label: string; description: string }> = {
  ecommerce: {
    label: 'E-commerce',
    description: 'Loja virtual completa (VTEX, Shopify, Linx, etc.).',
  },
  blog_institucional: {
    label: 'Blog institucional',
    description: 'Site/blog institucional com conteúdo e SEO.',
  },
  dev_proprio: {
    label: 'Desenvolvimento próprio',
    description: 'Projeto de desenvolvimento sob medida.',
  },
  landing_page: {
    label: 'Landing page',
    description: 'Página de captura/campanha focada em conversão.',
  },
}

/** Uma etapa de template: nome + checklist inicial. */
export interface TemplatePhase {
  name: string
  checklist: string[]
}

/**
 * Templates de etapas por Produto. Ao criar um projeto, estes placeholders são
 * gerados automaticamente — e depois podem ser editados pela Nairuz.
 */
export const PRODUCT_TEMPLATES: Record<Product, TemplatePhase[]> = {
  ecommerce: [
    { name: 'Kickoff e acessos', checklist: ['Reunião de kickoff', 'Acessos liberados', 'Canais definidos'] },
    { name: 'Escopo e alinhamento', checklist: ['Escopo validado', 'Cronograma aprovado'] },
    { name: 'Design e UX', checklist: ['Wireframes', 'Home', 'PLP e PDP'] },
    { name: 'Desenvolvimento', checklist: ['Tema base', 'Componentes', 'Responsividade'] },
    { name: 'Catálogo e conteúdo', checklist: ['Importação', 'Categorização', 'Banners'] },
    { name: 'Pagamentos', checklist: ['Gateway', 'Bandeiras', 'Testes de checkout'] },
    { name: 'Frete e logística', checklist: ['Transportadoras', 'Regras de frete'] },
    { name: 'Integrações', checklist: ['ERP', 'Estoque', 'Webhooks'] },
    { name: 'SEO e tracking', checklist: ['Tags', 'Sitemap', 'Redirecionamentos'] },
    { name: 'QA interno', checklist: ['Smoke test', 'Checklist de QA'] },
    { name: 'Homologação cliente', checklist: ['Ambiente liberado', 'Aprovação do cliente'] },
    { name: 'Go live', checklist: ['DNS', 'Publicação', 'Monitoramento'] },
    { name: 'Acompanhamento pós-go live', checklist: ['Acompanhamento 7 dias', 'Ajustes finos'] },
    { name: 'Encerramento técnico', checklist: ['Documentação', 'Aceite final'] },
  ],
  blog_institucional: [
    { name: 'Kickoff e acessos', checklist: ['Reunião de kickoff', 'Acessos liberados'] },
    { name: 'Escopo e conteúdo', checklist: ['Arquitetura de páginas', 'Conteúdo recebido'] },
    { name: 'Design e UX', checklist: ['Wireframes', 'Layout aprovado'] },
    { name: 'Desenvolvimento', checklist: ['Tema base', 'Páginas', 'Responsividade'] },
    { name: 'SEO e tracking', checklist: ['Tags', 'Sitemap', 'Meta tags'] },
    { name: 'QA interno', checklist: ['Smoke test', 'Checklist de QA'] },
    { name: 'Homologação cliente', checklist: ['Ambiente liberado', 'Aprovação do cliente'] },
    { name: 'Go live', checklist: ['DNS', 'Publicação'] },
    { name: 'Encerramento técnico', checklist: ['Documentação', 'Aceite final'] },
  ],
  dev_proprio: [
    { name: 'Kickoff e acessos', checklist: ['Reunião de kickoff', 'Acessos liberados'] },
    { name: 'Descoberta e requisitos', checklist: ['Levantamento', 'Requisitos validados'] },
    { name: 'Arquitetura', checklist: ['Definição técnica', 'Stack aprovada'] },
    { name: 'Design e UX', checklist: ['Wireframes', 'Protótipo'] },
    { name: 'Desenvolvimento', checklist: ['Backend', 'Frontend', 'Testes'] },
    { name: 'Integrações', checklist: ['APIs', 'Webhooks'] },
    { name: 'QA interno', checklist: ['Testes automatizados', 'Checklist de QA'] },
    { name: 'Homologação cliente', checklist: ['Ambiente liberado', 'Aprovação do cliente'] },
    { name: 'Deploy / Go live', checklist: ['Infra', 'Deploy', 'Monitoramento'] },
    { name: 'Acompanhamento', checklist: ['Estabilização', 'Ajustes'] },
    { name: 'Encerramento técnico', checklist: ['Documentação', 'Aceite final'] },
  ],
  landing_page: [
    { name: 'Kickoff e briefing', checklist: ['Briefing', 'Acessos'] },
    { name: 'Copy e conteúdo', checklist: ['Copy aprovada', 'Imagens'] },
    { name: 'Design', checklist: ['Layout aprovado'] },
    { name: 'Desenvolvimento', checklist: ['Build', 'Responsividade'] },
    { name: 'Tracking', checklist: ['Pixels', 'Conversões'] },
    { name: 'QA interno', checklist: ['Checklist de QA'] },
    { name: 'Publicação', checklist: ['DNS', 'Publicação'] },
  ],
}

export const DEFAULT_SUPPORT_HOURS = { antes: 5, depois: 20 }

/** Config padrão de finalização/upsell (a Nairuz personaliza por projeto). */
export const DEFAULT_FINALIZATION: FinalizationConfig = {
  mensagem:
    'Seu projeto foi concluído com sucesso! 🎉 Obrigado pela parceria. Agora é hora de manter tudo no ar e evoluir — escolha como podemos continuar juntos.',
  sustentacao: {
    apresentacao:
      'No Programa de Sustentação, sua loja fica com horas de suporte mensais para correções, ajustes e atendimento prioritário — sem dor de cabeça técnica.',
    whatsappUrl: 'https://wa.me/5500000000000?text=Quero%20conhecer%20a%20Sustenta%C3%A7%C3%A3o',
  },
  evolucao: {
    apresentacao:
      'No Programa de Evolução, trabalhamos melhorias contínuas, CRO e novas funcionalidades para crescer os resultados do seu e-commerce mês a mês.',
    whatsappUrl: 'https://wa.me/5500000000000?text=Quero%20conhecer%20a%20Evolu%C3%A7%C3%A3o',
  },
}
