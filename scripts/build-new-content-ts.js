const fs = require('fs');

const updatedContents = JSON.parse(fs.readFileSync('scripts/updated_contents_dump.json', 'utf8'));

let tsContent = `/**
 * BarberFlow — Academia BarberFlow Content Library
 * Catálogo Curado, Auditado e Verificado de Recursos Educacionais Oficiais Gratuitos
 * Auditoria Realizada em: 31/08/2026 (Fase 15)
 */

export interface EducationContentItem {
  id: string;
  title: string;
  institution: string;
  category:
    | 'COMECE_AQUI'
    | 'GESTAO'
    | 'FINANCAS'
    | 'MARKETING_VENDAS'
    | 'CLIENTES_FIDELIZACAO'
    | 'PESSOAS_EQUIPE'
    | 'OPERACAO'
    | 'EMPREENDEDORISMO'
    | 'TECNOLOGIA_IA'
    | 'LEGISLACAO'
    | 'VIDEOS';
  description: string;
  duration: string;
  level: 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO';
  format: 'ARTIGO' | 'CURSO' | 'VIDEO' | 'TRILHA' | 'FERRAMENTA';
  officialUrl: string;
  verifiedUrl?: string;
  isFree: boolean;
  certificate: 'SIM' | 'NAO' | 'VERIFICAR';
  lastVerifiedAt: string;
  verificationStatus?: 'VALID' | 'NEEDS_REVIEW' | 'INVALID';
  tags: string[];
  order?: number;
  readTimeMin?: number;
  contentBody?: string;
}

export const ALLOWED_OFFICIAL_DOMAINS = [
  'sebrae.com.br',
  'www.sebrae.com.br',
  'loja.sebrae.com.br',
  'cursos.sebrae.com.br',
  'ev.org.br',
  'www.ev.org.br',
  'escolavirtual.gov.br',
  'www.escolavirtual.gov.br',
  'portaldaindustria.com.br',
  'www.portaldaindustria.com.br',
  'ead.senai.br',
  'gov.br',
  'www.gov.br',
  'planalto.gov.br',
  'www.planalto.gov.br',
  'fazenda.gov.br',
  'receita.fazenda.gov.br',
  'solucoes.receita.fazenda.gov.br',
  'nfse.gov.br',
  'www.nfse.gov.br',
  'google.com',
  'www.google.com',
  'youtube.com',
  'www.youtube.com',
  'youtu.be'
];

export function validateExternalUrl(url: string): { isValid: boolean; reason?: string; domain?: string } {
  if (!url || typeof url !== 'string') {
    return { isValid: false, reason: 'URL vazia ou inválida' };
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { isValid: false, reason: 'Protocolo deve ser HTTPS ou HTTP' };
    }
    const hostname = parsed.hostname.toLowerCase();
    const isAllowed = ALLOWED_OFFICIAL_DOMAINS.some(
      (allowed) => hostname === allowed || hostname.endsWith('.' + allowed)
    );
    if (!isAllowed) {
      return { isValid: false, reason: \`Domínio \${hostname} não pertence à lista de fontes oficiais permitidas\` };
    }
    return { isValid: true, domain: hostname };
  } catch (err: any) {
    return { isValid: false, reason: 'Formato de URL malformado' };
  }
}

export const ACADEMIA_CATEGORIES = [
  { id: 'TODOS', label: 'Todos os Conteúdos', icon: 'Sparkles' },
  { id: 'COMECE_AQUI', label: '🚀 Comece Aqui', icon: 'Compass' },
  { id: 'GESTAO', label: '📊 Gestão & Metas', icon: 'Briefcase' },
  { id: 'FINANCAS', label: '💰 Finanças & Preço', icon: 'DollarSign' },
  { id: 'MARKETING_VENDAS', label: '📣 Marketing & Vendas', icon: 'Megaphone' },
  { id: 'CLIENTES_FIDELIZACAO', label: '💈 Clientes & Recorrência', icon: 'Flame' },
  { id: 'PESSOAS_EQUIPE', label: '👥 Pessoas & Equipe', icon: 'Users' },
  { id: 'OPERACAO', label: '⚡ Operação & Agenda', icon: 'CheckCircle2' },
  { id: 'EMPREENDEDORISMO', label: '🏢 Empreendedorismo', icon: 'TrendingUp' },
  { id: 'TECNOLOGIA_IA', label: '🤖 Tecnologia & IA', icon: 'Bot' },
  { id: 'LEGISLACAO', label: '⚖️ Legislação & MEI', icon: 'ShieldCheck' },
  { id: 'VIDEOS', label: '🎬 Vídeos Gratuitos', icon: 'PlaySquare' },
] as const;

export const ACADEMIA_CONTENTS: EducationContentItem[] = ${JSON.stringify(updatedContents, null, 2)};
`;

fs.writeFileSync('src/lib/academia/content.ts', tsContent);
console.log('src/lib/academia/content.ts written successfully with', updatedContents.length, 'items.');
