// Helpers de YouTube compartilhados entre telas.
//
// Extraído de screens/MidiaScreen.tsx quando o card de Short em destaque foi
// adicionado à Home — as duas telas precisam do mesmo parsing, e duas cópias
// da mesma regex divergem na primeira vez que alguém corrigir uma delas.

// Cobre os três formatos que aparecem na prática: /shorts/ID, watch?v=ID e
// youtu.be/ID. Devolve null pra qualquer outra coisa (link do Instagram,
// URL digitada errada), e quem chama decide o que mostrar no lugar.
export function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:shorts\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
  return m ? m[1] : null;
}

// Miniatura sem precisar da API do YouTube (nem de chave, nem de cota) —
// é só montar o endereço. `hqdefault` existe pra todo vídeo, inclusive
// Shorts, e vem em 480x360.
export function youtubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
