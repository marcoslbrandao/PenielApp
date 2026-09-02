// Paleta da aba Banda.
//
// A Banda segue o tema do app (`lib/theme`), como as outras telas. Aqui os
// tons ganham os nomes que esta aba usa e os que o tema geral não tem: o fundo
// "alto" dos cartões, o violeta apagado atrás dos destaques, o dourado dos
// avisos e o vermelho do YouTube.
//
// Duas regras valem pros dois modos:
//
// 1. Sobre fundo "cheio" (primary) o texto é `onPrimary`, nunca branco fixo —
//    no escuro o violeta clareia e branco em cima dele fica com contraste 3,3.
// 2. Sobre fundo "apagado" (primaryDim, accentDim, dangerBg, goldBg) o texto é
//    `onPrimaryDim`/`dangerOn`/`gold` — no claro esses fundos viram pastel e
//    branco some.
//
// Os números ao lado das cores são a razão de contraste WCAG contra o fundo em
// que a cor de fato aparece. O mínimo que buscamos é 4,5 pra texto.
//
// Fica em `lib/` porque a tela e o metrônomo precisam dela — e o metrônomo é
// importado pela tela, então guardá-la lá dentro criaria import circular.
export function paletaBanda(isDark: boolean) {
  return isDark ? {
    bg: '#0E0B22', surface: '#1C1940', surfaceHigh: '#241F4D',
    border: '#332D5C', chipBorder: '#7A6FC0',       // 3,53 — contorno de botão
    primary: '#8F79FF', onPrimary: '#0E0B22',              // 5,82
    primaryDim: '#3B2F7A', onPrimaryDim: '#E8E0FF',        // 8,83
    onPrimaryDimMuted: '#B9A9F0',
    accent: '#4ADE80', accentDim: '#12482A',
    // No escuro `gold` e `goldFill` são a MESMA cor de propósito: o selo
    // dourado já salta do header quase preto e não precisa de anel. A borda
    // `C.gold` do selo só faz trabalho no tema claro.
    gold: '#F5C842', goldFill: '#F5C842', goldBg: '#3A2E0A',
    danger: '#FF6B6B', dangerBg: '#4A1414', dangerOn: '#FFFFFF',
    stop: '#C93B3B', onStop: '#FFFFFF',
    ytBg: '#2A0B0B',
    text: '#F1EFFA', textMuted: '#BAB4D9', textDim: '#9B93C2',  // 5,33
    overlay: 'rgba(0,0,0,0.75)',
    statusBar: 'light-content' as const,
  } : {
    bg: '#F7F4EE', surface: '#FFFFFF', surfaceHigh: '#F0EDE8',
    border: '#E5E0D8', chipBorder: '#8C8272',       // 3,24 — contorno de botão
    primary: '#5B3CD9', onPrimary: '#FFFFFF',              // 6,79
    primaryDim: '#EAE4FF', onPrimaryDim: '#2A1A6B',        // 11,68
    onPrimaryDimMuted: '#5C5488',
    accent: '#1F8A4C', accentDim: '#DDF3E6',
    gold: '#7A5C05', goldFill: '#F5C842', goldBg: '#FBF1D2',    // 5,54
    danger: '#C0392B', dangerBg: '#FBE3E0', dangerOn: '#A8291C',   // 5,72
    stop: '#C0392B', onStop: '#FFFFFF',
    ytBg: '#FFF1F1',
    text: '#1A1A2E', textMuted: '#454C57', textDim: '#5F6773',  // 4,89
    // No claro o app inteiro é creme: escurecer 75% pra abrir uma folha branca
    // seria um salto violento. 45% já separa a folha do que está atrás.
    overlay: 'rgba(0,0,0,0.45)',
    statusBar: 'dark-content' as const,
  };
}

export type BandaColors = ReturnType<typeof paletaBanda>;
