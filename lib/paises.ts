// ============================================================================
// Lista de países + DDI (código de discagem internacional) usada em dois
// lugares: o seletor de código de telefone (Editar Membro no Admin e Meu
// Cadastro) e o seletor de país no endereço. Ficou num arquivo só pra não
// duplicar a lista (e o risco de ela ficar diferente) entre as duas telas.
//
// Bandeira calculada a partir do código ISO 3166-1 alpha-2 (não guardamos
// emoji fixo pra cada país — cada letra do código vira um "regional
// indicator symbol" do Unicode, que juntos o sistema operacional renderiza
// como a bandeira). Assim não tem risco de digitar o emoji errado.
// ============================================================================

export type Pais = {
  iso2: string;
  nome: string;
  ddi: string; // sem o "+", ex: "55", "44", "1"
};

export function bandeira(iso2: string): string {
  if (!iso2 || iso2.length !== 2) return '🏳️';
  const codigos = [...iso2.toUpperCase()].map(c => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codigos);
}

// Brasil e Reino Unido primeiro (os dois países da maioria dos membros da
// igreja), depois o resto em ordem alfabética por nome em português.
export const PAISES: Pais[] = [
  { iso2: 'BR', nome: 'Brasil', ddi: '55' },
  { iso2: 'GB', nome: 'Reino Unido', ddi: '44' },
  { iso2: 'PT', nome: 'Portugal', ddi: '351' },
  { iso2: 'US', nome: 'Estados Unidos', ddi: '1' },
  { iso2: 'AL', nome: 'Albânia', ddi: '355' },
  { iso2: 'DE', nome: 'Alemanha', ddi: '49' },
  { iso2: 'DZ', nome: 'Argélia', ddi: '213' },
  { iso2: 'AR', nome: 'Argentina', ddi: '54' },
  { iso2: 'AT', nome: 'Áustria', ddi: '43' },
  { iso2: 'AU', nome: 'Austrália', ddi: '61' },
  { iso2: 'BE', nome: 'Bélgica', ddi: '32' },
  { iso2: 'BO', nome: 'Bolívia', ddi: '591' },
  { iso2: 'BG', nome: 'Bulgária', ddi: '359' },
  { iso2: 'CA', nome: 'Canadá', ddi: '1' },
  { iso2: 'CV', nome: 'Cabo Verde', ddi: '238' },
  { iso2: 'CL', nome: 'Chile', ddi: '56' },
  { iso2: 'CN', nome: 'China', ddi: '86' },
  { iso2: 'CY', nome: 'Chipre', ddi: '357' },
  { iso2: 'CO', nome: 'Colômbia', ddi: '57' },
  { iso2: 'KR', nome: 'Coreia do Sul', ddi: '82' },
  { iso2: 'CI', nome: 'Costa do Marfim', ddi: '225' },
  { iso2: 'CR', nome: 'Costa Rica', ddi: '506' },
  { iso2: 'HR', nome: 'Croácia', ddi: '385' },
  { iso2: 'CU', nome: 'Cuba', ddi: '53' },
  { iso2: 'DK', nome: 'Dinamarca', ddi: '45' },
  { iso2: 'EC', nome: 'Equador', ddi: '593' },
  { iso2: 'EG', nome: 'Egito', ddi: '20' },
  { iso2: 'SV', nome: 'El Salvador', ddi: '503' },
  { iso2: 'AE', nome: 'Emirados Árabes Unidos', ddi: '971' },
  { iso2: 'ES', nome: 'Espanha', ddi: '34' },
  { iso2: 'SK', nome: 'Eslováquia', ddi: '421' },
  { iso2: 'SI', nome: 'Eslovênia', ddi: '386' },
  { iso2: 'ET', nome: 'Etiópia', ddi: '251' },
  { iso2: 'PH', nome: 'Filipinas', ddi: '63' },
  { iso2: 'FI', nome: 'Finlândia', ddi: '358' },
  { iso2: 'FR', nome: 'França', ddi: '33' },
  { iso2: 'GH', nome: 'Gana', ddi: '233' },
  { iso2: 'GY', nome: 'Guiana', ddi: '592' },
  { iso2: 'GW', nome: 'Guiné-Bissau', ddi: '245' },
  { iso2: 'GQ', nome: 'Guiné Equatorial', ddi: '240' },
  { iso2: 'GT', nome: 'Guatemala', ddi: '502' },
  { iso2: 'GR', nome: 'Grécia', ddi: '30' },
  { iso2: 'NL', nome: 'Holanda', ddi: '31' },
  { iso2: 'HN', nome: 'Honduras', ddi: '504' },
  { iso2: 'HK', nome: 'Hong Kong', ddi: '852' },
  { iso2: 'HU', nome: 'Hungria', ddi: '36' },
  { iso2: 'IN', nome: 'Índia', ddi: '91' },
  { iso2: 'ID', nome: 'Indonésia', ddi: '62' },
  { iso2: 'IE', nome: 'Irlanda', ddi: '353' },
  { iso2: 'IS', nome: 'Islândia', ddi: '354' },
  { iso2: 'IL', nome: 'Israel', ddi: '972' },
  { iso2: 'IT', nome: 'Itália', ddi: '39' },
  { iso2: 'JM', nome: 'Jamaica', ddi: '1' },
  { iso2: 'JP', nome: 'Japão', ddi: '81' },
  { iso2: 'KE', nome: 'Quênia', ddi: '254' },
  { iso2: 'LU', nome: 'Luxemburgo', ddi: '352' },
  { iso2: 'MY', nome: 'Malásia', ddi: '60' },
  { iso2: 'MT', nome: 'Malta', ddi: '356' },
  { iso2: 'MA', nome: 'Marrocos', ddi: '212' },
  { iso2: 'MX', nome: 'México', ddi: '52' },
  { iso2: 'MZ', nome: 'Moçambique', ddi: '258' },
  { iso2: 'NG', nome: 'Nigéria', ddi: '234' },
  { iso2: 'NO', nome: 'Noruega', ddi: '47' },
  { iso2: 'NZ', nome: 'Nova Zelândia', ddi: '64' },
  { iso2: 'PA', nome: 'Panamá', ddi: '507' },
  { iso2: 'PY', nome: 'Paraguai', ddi: '595' },
  { iso2: 'PE', nome: 'Peru', ddi: '51' },
  { iso2: 'PK', nome: 'Paquistão', ddi: '92' },
  { iso2: 'PL', nome: 'Polônia', ddi: '48' },
  { iso2: 'CZ', nome: 'República Tcheca', ddi: '420' },
  { iso2: 'DO', nome: 'República Dominicana', ddi: '1' },
  { iso2: 'RO', nome: 'Romênia', ddi: '40' },
  { iso2: 'RU', nome: 'Rússia', ddi: '7' },
  { iso2: 'SA', nome: 'Arábia Saudita', ddi: '966' },
  { iso2: 'SN', nome: 'Senegal', ddi: '221' },
  { iso2: 'RS', nome: 'Sérvia', ddi: '381' },
  { iso2: 'SG', nome: 'Singapura', ddi: '65' },
  { iso2: 'ST', nome: 'São Tomé e Príncipe', ddi: '239' },
  { iso2: 'ZA', nome: 'África do Sul', ddi: '27' },
  { iso2: 'SE', nome: 'Suécia', ddi: '46' },
  { iso2: 'CH', nome: 'Suíça', ddi: '41' },
  { iso2: 'SR', nome: 'Suriname', ddi: '597' },
  { iso2: 'TW', nome: 'Taiwan', ddi: '886' },
  { iso2: 'TZ', nome: 'Tanzânia', ddi: '255' },
  { iso2: 'TH', nome: 'Tailândia', ddi: '66' },
  { iso2: 'TL', nome: 'Timor-Leste', ddi: '670' },
  { iso2: 'TT', nome: 'Trinidad e Tobago', ddi: '1' },
  { iso2: 'TN', nome: 'Tunísia', ddi: '216' },
  { iso2: 'TR', nome: 'Turquia', ddi: '90' },
  { iso2: 'UA', nome: 'Ucrânia', ddi: '380' },
  { iso2: 'UG', nome: 'Uganda', ddi: '256' },
  { iso2: 'UY', nome: 'Uruguai', ddi: '598' },
  { iso2: 'VE', nome: 'Venezuela', ddi: '58' },
  { iso2: 'VN', nome: 'Vietnã', ddi: '84' },
];

export function paisPorNome(nome: string): Pais | undefined {
  return PAISES.find(p => p.nome === nome);
}

export function paisPorIso2(iso2: string): Pais | undefined {
  return PAISES.find(p => p.iso2 === iso2);
}

// Dado o nome do país do endereço (o texto livre que já existe no campo
// "País" — "Brasil", "Reino Unido" etc.), decide qual DDI usar como padrão
// pro campo de telefone quando ainda não tem número digitado. Cai pra
// Brasil se não achar o país (histórico: quase todo cadastro antigo é
// brasileiro).
export function paisPadraoDdi(nomePaisEndereco: string): string {
  const p = PAISES.find(x => x.nome === nomePaisEndereco);
  return p ? p.iso2 : 'BR';
}

// Formata o número LOCAL (sem DDI) enquanto a pessoa digita. Só Brasil e
// Reino Unido ganham uma máscara de verdade (são os 2 países que a imensa
// maioria dos membros usa) — os outros países ficam só com os dígitos, sem
// forçar um formato que pode não bater com o padrão local.
export function formatarNumeroLocal(iso2: string, digitos: string): string {
  const d = digitos.replace(/\D/g, '');
  if (iso2 === 'BR') {
    const dd = d.slice(0, 11);
    let f = dd;
    if (dd.length > 0) f = '(' + dd.slice(0, 2);
    if (dd.length > 2) f += ') ' + dd.slice(2, dd.length > 10 ? 7 : 6);
    if (dd.length > (dd.length > 10 ? 7 : 6)) f += '-' + dd.slice(dd.length > 10 ? 7 : 6);
    return f;
  }
  if (iso2 === 'GB') {
    const dd = d.slice(0, 11);
    if (dd.length <= 5) return dd;
    return dd.slice(0, 5) + ' ' + dd.slice(5);
  }
  return d.slice(0, 14);
}

// Monta o valor final salvo no banco: "+<ddi> <número formatado>".
export function montarTelefone(iso2: string, numeroLocal: string): string {
  const pais = paisPorIso2(iso2);
  const numero = numeroLocal.trim();
  if (!pais || !numero) return numero;
  return `+${pais.ddi} ${numero}`;
}

// Separa um telefone já salvo de volta em { iso2, numeroLocal }, pra
// preencher o formulário de edição. Testa os DDIs do mais longo pro mais
// curto (evita "+1" casar errado com um país de DDI "+351", por exemplo).
// Números antigos sem "+" na frente (todo cadastro feito antes desse ajuste
// só existia em formato brasileiro) são tratados como Brasil, mantendo o
// texto exatamente como estava — não quebra nenhum cadastro já existente.
export function splitTelefone(valor: string): { iso2: string; numeroLocal: string } {
  const v = (valor ?? '').trim();
  if (!v.startsWith('+')) return { iso2: 'BR', numeroLocal: v };
  const digitos = v.slice(1).replace(/\D/g, '');
  const candidatos = [...PAISES].sort((a, b) => b.ddi.length - a.ddi.length);
  for (const p of candidatos) {
    if (digitos.startsWith(p.ddi)) {
      const resto = v.slice(1 + p.ddi.length).trim();
      return { iso2: p.iso2, numeroLocal: resto };
    }
  }
  return { iso2: 'BR', numeroLocal: v };
}
