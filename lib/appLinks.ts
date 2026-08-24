// Links de download do app, usados no rodapé de textos compartilhados
// (versículo do dia, capítulo/versículos da Bíblia etc.) — assim quem
// recebe a mensagem consegue baixar o app também, não só ler o texto.
export const APP_STORE_URL = 'https://apps.apple.com/us/app/peniel-church-uk/id6776841788';

// Ainda não temos link público do Google Play — o app ainda está em teste
// fechado (faixa alpha). Quando sair pro público, colocar o link aqui: o
// texto compartilhado passa a incluir os dois automaticamente.
export const GOOGLE_PLAY_URL: string | null = null;

// Linha final padrão dos textos compartilhados pelo app — inclui um link
// de verdade (não só o nome "Peniel Church App" como texto solto), pra
// quem recebe poder tocar e baixar.
export function linhaCompartilharApp(): string {
  const linhas = ['📖 Peniel Church App', `Baixe: ${APP_STORE_URL}`];
  if (GOOGLE_PLAY_URL) linhas.push(`Android: ${GOOGLE_PLAY_URL}`);
  return linhas.join('\n');
}
